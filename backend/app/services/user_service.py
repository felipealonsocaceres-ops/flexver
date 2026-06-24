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

    # Fragmentos que Supabase Auth/GoTrue incluye cuando el correo ya existe.
    _DUPLICATE_EMAIL_MARKERS = (
        "already been registered",
        "already registered",
        "email_exists",
        "user already exists",
    )

    def __init__(self, repository: UserRepository) -> None:
        """Recibe el repositorio inyectado (inversión de dependencias)."""
        self._repository = repository

    def _create_identity(self, email: str, password: str) -> str:
        """Crea la identidad en Supabase Auth.

        Traduce el caso de "correo ya registrado" a un 409 con mensaje amigable,
        en lugar de un 502 genérico. Cualquier otro fallo de la frontera con
        Supabase se reporta como 502 sin filtrar detalles internos.
        """
        try:
            return self._repository.create_auth_user(email, password)
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase Auth
            mensaje = str(exc).lower()
            if any(marker in mensaje for marker in self._DUPLICATE_EMAIL_MARKERS):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El correo electrónico ya está registrado.",
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo crear la cuenta. Inténtalo nuevamente más tarde.",
            ) from exc

    def register_driver(self, data: DriverProfileCreate) -> UserResponse:
        """Registra un conductor: identidad, perfil de usuario y perfil de conductor.

        Aplica un patrón de transacción de compensación (Rollback) si el flujo falla
        para evitar dejar registros huérfanos en Supabase Auth.
        """
        if data.rol is not Rol.CONDUCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de conductores.",
            )

        # 1. Crear la identidad en Supabase Auth (mapea correo duplicado a 409)
        user_id = self._create_identity(data.email, data.password)

        try:
            # 2. Intentar crear el perfil general del usuario
            profile = {
                "id_usuario": user_id,
                "nombre_completo": data.nombre_completo,
                "email": data.email,
                "telefono": data.telefono,
                "rol": data.rol.value,
            }
            created = self._repository.create_user_profile(profile)

            # 3. Intentar crear el perfil específico de conductor (Forzando lógica interna)
            self._repository.create_driver_profile(
                {
                    "id_usuario": user_id,
                    "rut": data.rut,
                    "estado_verificacion": "pendiente",  # Forzado internamente por seguridad
                    "disponible": False,                  # No disponible hasta ser verificado
                    "latitud_actual": None,               # Evitamos ubicarlo en el océano (0.0)
                    "longitud_actual": None,
                    "url_carnet_frontal": data.url_carnet_frontal,
                    "url_carnet_reverso": data.url_carnet_reverso,
                    "url_licencia": data.url_licencia,
                }
            )
        except Exception as exc:
            # Transacción de compensación: Si el perfil falló, eliminamos el usuario de Auth
            print(f"[Rollback] Falló la creación del perfil. Eliminando auth user: {user_id}")
            try:
                self._repository.delete_auth_user(user_id)
            except Exception as rollback_err:
                # Loggear el fallo del rollback pero propagar el error original
                print(f"[Crítico] No se pudo ejecutar el rollback de Auth: {rollback_err}")

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo completar el registro debido a un error interno del servidor.",
            ) from exc

        return UserResponse.model_validate(created)

    def register_client(self, data: ClientProfileCreate) -> UserResponse:
        """Registra un cliente: identidad y perfil de usuario."""
        if data.rol is not Rol.CLIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de clientes.",
            )

        # 1. Crear la identidad en Supabase Auth (mapea correo duplicado a 409)
        user_id = self._create_identity(data.email, data.password)

        try:
            # 2. Crear en tabla usuarios (NO toca la tabla conductores)
            profile = {
                "id_usuario": user_id,
                "nombre_completo": data.nombre_completo,
                "email": data.email,
                "telefono": data.telefono,
                "rol": data.rol.value,
            }
            created = self._repository.create_user_profile(profile)

        except Exception as exc:
            # Transacción de compensación: si el perfil falló, eliminamos el usuario de Auth
            print(f"[Rollback] Falló la creación del perfil. Eliminando auth user: {user_id}")
            try:
                self._repository.delete_auth_user(user_id)
            except Exception as rollback_err:
                print(f"[Crítico] No se pudo ejecutar el rollback de Auth: {rollback_err}")

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo completar el registro debido a un error interno del servidor.",
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