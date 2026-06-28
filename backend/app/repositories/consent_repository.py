"""Repositorio del dominio de Consentimiento (append-only).

Única capa autorizada a hablar con Supabase para la evidencia de consentimiento.
Solo INSERTA y LEE: nunca actualiza ni borra (la tabla es inmutable y el
trigger de BD lo refuerza).
"""

from typing import Any

from supabase import Client


class ConsentRepository:
    """Acceso a datos de la tabla `consentimientos` y a la versión aceptada."""

    TABLE_CONSENTIMIENTOS = "consentimientos"
    TABLE_USUARIOS = "usuarios"

    def __init__(self, client: Client) -> None:
        self._client = client

    def insert_event(self, event: dict[str, Any]) -> dict[str, Any]:
        """Inserta un evento inmutable y retorna la fila creada."""
        response = (
            self._client.table(self.TABLE_CONSENTIMIENTOS).insert(event).execute()
        )
        if not response.data:
            raise ValueError("La inserción en 'consentimientos' no retornó datos")
        return response.data[0]

    def list_events(self, id_usuario: str) -> list[dict[str, Any]]:
        """Lista todos los eventos del usuario, del más reciente al más antiguo."""
        response = (
            self._client.table(self.TABLE_CONSENTIMIENTOS)
            .select("*")
            .eq("id_usuario", id_usuario)
            .order("creado_en", desc=True)
            .execute()
        )
        return response.data or []

    def set_version_aceptada(self, id_usuario: str, version: str) -> None:
        """Actualiza `usuarios.version_politica_aceptada` (no es evidencia)."""
        (
            self._client.table(self.TABLE_USUARIOS)
            .update({"version_politica_aceptada": version})
            .eq("id_usuario", id_usuario)
            .execute()
        )

    def get_version_aceptada(self, id_usuario: str) -> str | None:
        """Lee la última versión de política aceptada por el usuario."""
        response = (
            self._client.table(self.TABLE_USUARIOS)
            .select("version_politica_aceptada")
            .eq("id_usuario", id_usuario)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0].get("version_politica_aceptada")
