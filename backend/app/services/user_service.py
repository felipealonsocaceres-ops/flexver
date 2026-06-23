"""Servicio del dominio de Usuarios.

Orquesta los casos de uso de identidad (registro y consulta) coordinando la
creación de la identidad en Supabase Auth y la persistencia del perfil a través
del repositorio. La capa de API no contiene esta lógica; solo invoca al servicio.
"""

from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.schemas.user import ClientProfileCreate, DriverProfileCreate, Rol, UserResponse


class UserService:
    """Casos de uso del dominio de usuarios."""

    def __init__(self, repository: UserRepository) -> None:
        """Recibe el repositorio inyectado (inversión de dependencias)."""
        self._repository = repository

    def register_driver(self, data: DriverProfileCreate) -> UserResponse:
        """Registra un conductor: identidad, perfil de usuario y perfil de conductor."""
        if data.rol is not Rol.CONDUCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de conductores.",
            )

        try:
            user_id = self._repository.create_auth_user(data.email, data.password)

            profile = {
                "id_usuario": user_id,
                "nombre_completo": data.nombre_completo,
                "email": data.email,
                "telefono": data.telefono,
                "rol": data.rol.value,
            }
            created = self._repository.create_user_profile(profile)

            self._repository.create_driver_profile(
                {
                    "id_usuario": user_id,
                    "rut": data.rut,
                    "estado_verificacion": data.estado_verificacion,
                    "disponible": data.disponible,
                    "latitud_actual": data.latitud_actual,
                    "longitud_actual": data.longitud_actual,
                }
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al registrar el usuario: {exc}",
            ) from exc

        return UserResponse.model_validate(created)

    def register_client(self, data: ClientProfileCreate) -> UserResponse:
        """Registra un cliente: identidad y perfil de usuario."""
        if data.rol is not Rol.CLIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de clientes.",
            )

        try:
            # 1. Crear en Supabase Auth
            user_id = self._repository.create_auth_user(data.email, data.password)

            # 2. Crear en tabla usuarios (NO toca la tabla conductores)
            profile = {
                "id_usuario": user_id,
                "nombre_completo": data.nombre_completo,
                "email": data.email,
                "telefono": data.telefono,
                "rol": data.rol.value,
            }
            created = self._repository.create_user_profile(profile)

        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(exc)
            ) from exc
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al registrar el cliente: {exc}",
            ) from exc

        return UserResponse.model_validate(created)

    def get_user(self, user_id: str) -> UserResponse:
        """Recupera un usuario por id o lanza 404 si no existe."""
        try:
            user = self._repository.get_by_id(user_id)
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al consultar el usuario: {exc}",
            ) from exc

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        return UserResponse.model_validate(user)