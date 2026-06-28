"""Endpoints HTTP del dominio de Usuarios (capa de presentación).

Esta capa NO contiene lógica de negocio: declara rutas, valida la entrada,
inyecta el `UserService` y delega. El registro de conductor usa multipart para
recibir los documentos y subirlos a un bucket PRIVADO desde el servidor.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Path, Request, UploadFile, status

from app.api.deps import (
    CurrentUser,
    get_current_admin,
    get_request_metadata,
    get_user_service,
)
from app.schemas.user import ClientProfileCreate, DriverProfileCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Usuarios"])

ServiceDep = Annotated[UserService, Depends(get_user_service)]
MetaDep = Annotated[dict, Depends(get_request_metadata)]

# Límite defensivo de tamaño por documento (8 MB): minimización y anti-abuso.
_MAX_BYTES = 8 * 1024 * 1024


async def _leer_archivo(archivo: UploadFile, etiqueta: str) -> dict:
    """Lee un UploadFile a memoria con validación de tipo y tamaño."""
    from fastapi import HTTPException

    contenido = await archivo.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El documento '{etiqueta}' supera el tamaño permitido (8 MB).",
        )
    content_type = archivo.content_type or "application/octet-stream"
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El documento '{etiqueta}' debe ser una imagen.",
        )
    ext = (archivo.filename or "").rsplit(".", 1)[-1].lower() or "jpg"
    return {"data": contenido, "content_type": content_type, "filename": f"{etiqueta}.{ext}"}


@router.post(
    "/driver",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un conductor (multipart con documentos KYC)",
)
async def register_driver(
    service: ServiceDep,
    meta: MetaDep,
    nombre_completo: Annotated[str, Form()],
    email: Annotated[str, Form()],
    password: Annotated[str, Form()],
    rut: Annotated[str, Form()],
    acepta_terminos: Annotated[bool, Form()],
    carnet_frontal: Annotated[UploadFile, File()],
    carnet_reverso: Annotated[UploadFile, File()],
    licencia: Annotated[UploadFile, File()],
    padron: Annotated[UploadFile, File()],
    selfie: Annotated[UploadFile, File()],
    telefono: Annotated[str | None, Form()] = None,
    patente: Annotated[str | None, Form()] = None,
    capacidad_m3: Annotated[float | None, Form()] = None,
    acepta_marketing: Annotated[bool, Form()] = False,
) -> UserResponse:
    """Valida datos + documentos y delega el registro seguro al servicio."""
    data = DriverProfileCreate(
        nombre_completo=nombre_completo,
        email=email,
        password=password,
        telefono=telefono,
        rut=rut,
        patente=patente,
        capacidad_m3=capacidad_m3,
        acepta_terminos=acepta_terminos,
        acepta_marketing=acepta_marketing,
    )
    archivos = {
        "carnet_frontal": await _leer_archivo(carnet_frontal, "carnet_frontal"),
        "carnet_reverso": await _leer_archivo(carnet_reverso, "carnet_reverso"),
        "licencia": await _leer_archivo(licencia, "licencia"),
        "padron": await _leer_archivo(padron, "padron"),
        "selfie": await _leer_archivo(selfie, "selfie"),
    }
    return service.register_driver(data, archivos, meta)


@router.post(
    "/client",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un cliente",
)
def register_client(
    payload: ClientProfileCreate, service: ServiceDep, meta: MetaDep
) -> UserResponse:
    """Recibe los datos del cliente y delega la orquestación al servicio."""
    return service.register_client(payload, meta)


@router.post(
    "/driver/{user_id}/aprobar",
    summary="Aprueba a un conductor y destruye su selfie cruda (solo admin)",
)
def aprobar_conductor(
    service: ServiceDep,
    _admin: Annotated[CurrentUser, Depends(get_current_admin)],
    user_id: Annotated[str, Path(description="id_usuario del conductor")],
) -> dict:
    """Acción de verificación manual: aprueba e impone la minimización biométrica."""
    return service.aprobar_conductor(user_id)


@router.get(
    "/driver/{user_id}/documentos",
    summary="Firma URLs temporales de los documentos KYC del conductor (solo admin)",
)
def documentos_kyc(
    service: ServiceDep,
    _admin: Annotated[CurrentUser, Depends(get_current_admin)],
    user_id: Annotated[str, Path(description="id_usuario del conductor")],
) -> dict:
    """Entrega Signed URLs de vida corta para revisar carnet, padrón y selfie."""
    return service.obtener_documentos_kyc(user_id)


@router.post(
    "/driver/{user_id}/rechazar",
    summary="Rechaza a un conductor (solo admin)",
)
def rechazar_conductor(
    service: ServiceDep,
    _admin: Annotated[CurrentUser, Depends(get_current_admin)],
    user_id: Annotated[str, Path(description="id_usuario del conductor")],
    motivo: Annotated[str | None, Form()] = None,
) -> dict:
    """Marca al conductor como rechazado."""
    return service.rechazar_conductor(user_id, motivo)


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
