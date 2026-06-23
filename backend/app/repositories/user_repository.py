"""Repositorio del dominio de Usuarios.

Única capa autorizada a hablar con Supabase para el dominio de identidad.
Recibe el cliente de Supabase inyectado (no lo crea), de modo que es fácil de
testear y de reutilizar. No contiene lógica de negocio: solo persistencia.
"""

from typing import Any

from supabase import Client


class UserRepository:
    """Acceso a datos de usuarios y perfiles de conductor en Supabase."""

    TABLE_USUARIOS = "usuarios"
    TABLE_CONDUCTORES = "conductores"

    def __init__(self, client: Client) -> None:
        """Recibe el cliente de Supabase ya configurado (inyección)."""
        self._client = client

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
