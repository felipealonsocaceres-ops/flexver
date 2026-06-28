"""Dependencias compartidas de la API (inyección y autenticación)."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from supabase import Client

from app.infrastructure.supabase_client import get_supabase_client
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.user_repository import UserRepository
from app.services.analytics_service import AnalyticsService
from app.services.user_service import UserService


# --- Cadena de inyección del dominio de usuarios -----------------------------
def get_user_repository(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> UserRepository:
    return UserRepository(client)


def get_user_service(
    repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    return UserService(repo)


# --- Cadena de inyección del dominio analítico -------------------------------
def get_analytics_repository(
    client: Annotated[Client, Depends(get_supabase_client)],
) -> AnalyticsRepository:
    return AnalyticsRepository(client)


def get_analytics_service(
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
) -> AnalyticsService:
    return AnalyticsService(repo)


# --- Identidad del solicitante ------------------------------------------------
class CurrentUser:
    """Representa al usuario autenticado resuelto desde el JWT de Supabase."""

    def __init__(self, id_usuario: str, email: str | None) -> None:
        self.id_usuario = id_usuario
        self.email = email


def get_current_user(
    client: Annotated[Client, Depends(get_supabase_client)],
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Valida el `Authorization: Bearer <jwt>` contra Supabase Auth.

    No confiamos en ningún `id_usuario` que venga en el cuerpo: la identidad
    se deriva SIEMPRE del token verificado por Supabase. Así la evidencia de
    consentimiento queda atada a quien realmente está autenticado.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    try:
        result = client.auth.get_user(token)
    except Exception as exc:  # noqa: BLE001 - frontera con Supabase Auth
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(result, "user", None)
    if user is None or not getattr(user, "id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(id_usuario=user.id, email=getattr(user, "email", None))


def get_current_admin(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> CurrentUser:
    """Exige que el usuario autenticado tenga rol 'administrador'."""
    if repo.get_rol(user.id_usuario) != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acción reservada a administradores.",
        )
    return user


# --- Metadatos de la petición (para evidencia de consentimiento) -------------
def get_request_metadata(request: Request) -> dict[str, str | None]:
    """Extrae IP de origen y User-Agent estampados por el servidor.

    Respeta `X-Forwarded-For` cuando hay proxy (primer salto = cliente real).
    """
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else None
    )
    return {"ip": ip, "user_agent": request.headers.get("user-agent")}
