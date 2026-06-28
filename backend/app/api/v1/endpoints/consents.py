"""Endpoints HTTP del dominio de Consentimiento (Ley 21.719).

La identidad se deriva del JWT (no del cuerpo). El servidor estampa la
evidencia: versión de política, IP de origen y User-Agent.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from supabase import Client

from app.api.deps import CurrentUser, get_current_user, get_request_metadata
from app.infrastructure.supabase_client import get_supabase_client
from app.repositories.consent_repository import ConsentRepository
from app.schemas.consent import ConsentCreate, ConsentStatusResponse
from app.services.consent_service import ConsentService

# El prefijo vive en el propio router: así `@router.post("")` no choca con la
# validación de FastAPI "prefix y path no pueden estar ambos vacíos" (que se
# evalúa al definir la ruta, antes de aplicar el prefix del include_router).
router = APIRouter(prefix="/consentimientos", tags=["Consentimientos"])


def get_consent_service(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> ConsentService:
    return ConsentService(ConsentRepository(client))


ServiceDep = Annotated[ConsentService, Depends(get_consent_service)]
UserDep = Annotated[CurrentUser, Depends(get_current_user)]
MetaDep = Annotated[dict, Depends(get_request_metadata)]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Registra un evento de consentimiento (otorga o revoca)",
)
def crear_consentimiento(
    payload: ConsentCreate,
    user: UserDep,
    meta: MetaDep,
    service: ServiceDep,
) -> dict:
    """Registra un evento INMUTABLE de consentimiento del usuario autenticado."""
    service.record(
        id_usuario=user.id_usuario,
        tipo=payload.tipo,
        otorgado=payload.otorgado,
        ip=meta["ip"],
        user_agent=meta["user_agent"],
    )
    return {"ok": True}


@router.get(
    "/me",
    response_model=ConsentStatusResponse,
    summary="Estado actual de consentimiento del usuario autenticado",
)
def mis_consentimientos(user: UserDep, service: ServiceDep) -> ConsentStatusResponse:
    """Devuelve el estado vigente por tipo y si se requiere re-consentimiento."""
    return service.current_status(user.id_usuario)
