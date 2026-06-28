"""Repositorio del dominio de Usuarios.

Única capa autorizada a hablar con Supabase para el dominio de identidad.
Recibe el cliente de Supabase inyectado (no lo crea), de modo que es fácil de
testear y de reutilizar. No contiene lógica de negocio: solo persistencia.
"""

from typing import Any

from supabase import Client

# Bucket PRIVADO para documentación KYC. Estructura: {id_usuario}/<doc>.<ext>.
# El acceso de clientes está restringido por RLS a su propia carpeta; el backend
# (service_role) sube y destruye objetos en nombre del flujo de verificación.
KYC_BUCKET = "documentos-kyc"


class UserRepository:
    """Acceso a datos de usuarios, conductores, storage y consentimientos."""

    TABLE_USUARIOS = "usuarios"
    TABLE_CONDUCTORES = "conductores"
    TABLE_CONSENTIMIENTOS = "consentimientos"

    def __init__(self, client: Client) -> None:
        """Recibe el cliente de Supabase ya configurado (inyección)."""
        self._client = client

    # --- Identidad (Supabase Auth) -------------------------------------------
    def create_auth_user(self, email: str, password: str) -> str:
        """Crea la identidad en Supabase Auth y retorna su `id` (UUID).

        Requiere que el cliente use la `service_role` key. La contraseña vive
        únicamente en Supabase Auth; nunca toca la tabla `usuarios`.
        """
        response = self._client.auth.admin.create_user(
            {"email": email, "password": password, "email_confirm": True}
        )
        user = getattr(response, "user", None)
        if user is None or not getattr(user, "id", None):
            raise ValueError("Supabase Auth no retornó un usuario válido")
        return user.id

    def delete_auth_user(self, user_id: str) -> None:
        """Elimina la identidad de Auth (usado en el rollback de compensación)."""
        self._client.auth.admin.delete_user(user_id)

    # --- Perfiles -------------------------------------------------------------
    def create_user_profile(self, profile: dict[str, Any]) -> dict[str, Any]:
        """Inserta el perfil en la tabla `usuarios` y retorna la fila creada."""
        response = (
            self._client.table(self.TABLE_USUARIOS).insert(profile).execute()
        )
        if not response.data:
            raise ValueError("La inserción en 'usuarios' no retornó datos")
        return response.data[0]

    def create_driver_profile(self, profile: dict[str, Any]) -> dict[str, Any]:
        """Inserta el perfil del conductor en la tabla `conductores`."""
        response = (
            self._client.table(self.TABLE_CONDUCTORES).insert(profile).execute()
        )
        if not response.data:
            raise ValueError("La inserción en 'conductores' no retornó datos")
        return response.data[0]

    def get_by_id(self, user_id: str) -> dict[str, Any] | None:
        """Busca un usuario por su `id_usuario`. Retorna `None` si no existe."""
        response = (
            self._client.table(self.TABLE_USUARIOS)
            .select("*")
            .eq("id_usuario", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def get_rol(self, user_id: str) -> str | None:
        """Retorna el rol del usuario (para autorizar acciones de admin)."""
        response = (
            self._client.table(self.TABLE_USUARIOS)
            .select("rol")
            .eq("id_usuario", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0]["rol"] if response.data else None

    # --- Storage privado KYC --------------------------------------------------
    def upload_kyc_file(
        self, user_id: str, nombre: str, contenido: bytes, content_type: str
    ) -> str:
        """Sube un documento al bucket privado bajo la carpeta del usuario.

        Retorna el PATH dentro del bucket (no una URL pública: el bucket es
        privado). El acceso posterior se hace con URLs firmadas o service_role.
        """
        path = f"{user_id}/{nombre}"
        self._client.storage.from_(KYC_BUCKET).upload(
            path,
            contenido,
            {"content-type": content_type, "upsert": "true"},
        )
        return path

    def delete_kyc_path(self, path: str) -> None:
        """Destruye un objeto del bucket privado (p. ej., la selfie cruda)."""
        self._client.storage.from_(KYC_BUCKET).remove([path])

    def delete_kyc_folder(self, user_id: str) -> None:
        """Borra todos los documentos del usuario (rollback de registro)."""
        bucket = self._client.storage.from_(KYC_BUCKET)
        try:
            objetos = bucket.list(user_id)
        except Exception:  # noqa: BLE001 - best-effort en rollback
            return
        paths = [f"{user_id}/{o['name']}" for o in objetos or []]
        if paths:
            bucket.remove(paths)

    def signed_url(self, path: str, expires_in: int = 3600) -> str | None:
        """Genera una URL firmada temporal para que un admin revise un documento."""
        if not path:
            return None
        res = self._client.storage.from_(KYC_BUCKET).create_signed_url(path, expires_in)
        return res.get("signedURL") or res.get("signedUrl")

    # --- Consentimiento (evidencia inmutable) --------------------------------
    def insert_consent(self, event: dict[str, Any]) -> None:
        """Inserta un evento de consentimiento (append-only)."""
        self._client.table(self.TABLE_CONSENTIMIENTOS).insert(event).execute()

    # --- Verificación (Onboarding / semáforo) --------------------------------
    def update_driver_verification(
        self, user_id: str, cambios: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Actualiza el estado de verificación del conductor por `id_usuario`."""
        response = (
            self._client.table(self.TABLE_CONDUCTORES)
            .update(cambios)
            .eq("id_usuario", user_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def get_driver_by_user(self, user_id: str) -> dict[str, Any] | None:
        """Recupera el perfil de conductor por `id_usuario`."""
        response = (
            self._client.table(self.TABLE_CONDUCTORES)
            .select("*")
            .eq("id_usuario", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
