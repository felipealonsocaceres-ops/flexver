"""Endpoints HTTP del dominio de Usuarios (capa de presentación).

Esta capa NO contiene lógica de negocio: solo declara rutas, valida el cuerpo
con los schemas de Pydantic, inyecta el `UserService` con `Depends` y delega.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, status
from supabase import Client

from app.infrastructure.supabase_client import get_supabase_client
from app.repositories.user_repository import UserRepository
from app.schemas.user import DriverProfileCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Usuarios"])


# --- Cadena de inyección de dependencias (cliente -> repositorio -> servicio) ---
def get_user_repository(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> UserRepository:
    """Provee el repositorio con el cliente de Supabase ya inyectado."""
    return UserRepository(client)


def get_user_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    """Provee el servicio con su repositorio inyectado."""
    return UserService(repository)


ServiceDep = Annotated[UserService, Depends(get_user_service)]


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un conductor (endpoint exclusivo del dominio Conductores)",
)
def register(payload: DriverProfileCreate, service: ServiceDep) -> UserResponse:
    """Recibe los datos del conductor y delega la orquestación al servicio."""
    return service.register_driver(payload)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Obtiene un usuario por su id",
)
def get_user(
    service: ServiceDep,
    user_id: Annotated[str, Path(description="UUID del usuario (id_usuario)")],
) -> UserResponse:
    """Consulta un usuario por id, delegando al servicio."""
    return service.get_user(user_id)
