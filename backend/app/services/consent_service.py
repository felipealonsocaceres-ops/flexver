"""Servicio del dominio de Consentimiento (Ley 21.719).

Orquesta el registro de evidencia (append-only) y el cálculo del estado actual
por tipo, así como la detección de re-consentimiento cuando la política avanza.
"""

from fastapi import HTTPException, status

from app.core.consent import POLICY_VERSION, ConsentType
from app.repositories.consent_repository import ConsentRepository
from app.schemas.consent import (
    ConsentStatusItem,
    ConsentStatusResponse,
)


class ConsentService:
    """Casos de uso de consentimiento."""

    def __init__(self, repository: ConsentRepository) -> None:
        self._repository = repository

    def record(
        self,
        *,
        id_usuario: str,
        tipo: ConsentType,
        otorgado: bool,
        ip: str | None,
        user_agent: str | None,
    ) -> dict:
        """Registra un evento inmutable. El servidor estampa versión, IP y UA.

        Si es la aceptación de términos, deja además constancia de la versión
        aceptada en el perfil del usuario (para detectar re-consentimiento).
        """
        event = {
            "id_usuario": id_usuario,
            "tipo": tipo.value,
            "otorgado": otorgado,
            "version_politica": POLICY_VERSION,
            "ip_origen": ip,
            "user_agent": user_agent,
        }
        try:
            created = self._repository.insert_event(event)
            if tipo is ConsentType.TERMINOS_Y_POLITICA and otorgado:
                self._repository.set_version_aceptada(id_usuario, POLICY_VERSION)
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo registrar el consentimiento. Inténtalo nuevamente.",
            ) from exc
        return created

    def current_status(self, id_usuario: str) -> ConsentStatusResponse:
        """Devuelve el estado ACTUAL por tipo (último evento de cada uno).

        Como la tabla es append-only, el estado vigente de un tipo es,
        simplemente, su evento más reciente.
        """
        try:
            eventos = self._repository.list_events(id_usuario)
            version_aceptada = self._repository.get_version_aceptada(id_usuario)
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo consultar el consentimiento.",
            ) from exc

        # Los eventos vienen ordenados desc por fecha: el primero de cada tipo
        # que veamos es el vigente.
        ultimo_por_tipo: dict[str, dict] = {}
        for ev in eventos:
            ultimo_por_tipo.setdefault(ev["tipo"], ev)

        estados: list[ConsentStatusItem] = []
        for tipo in ConsentType:
            ev = ultimo_por_tipo.get(tipo.value)
            estados.append(
                ConsentStatusItem(
                    tipo=tipo,
                    otorgado=bool(ev["otorgado"]) if ev else False,
                    version_politica=ev["version_politica"] if ev else None,
                    creado_en=ev["creado_en"] if ev else None,
                )
            )

        requiere = version_aceptada is None or version_aceptada != POLICY_VERSION
        return ConsentStatusResponse(
            estados=estados,
            version_politica_vigente=POLICY_VERSION,
            version_politica_aceptada=version_aceptada,
            requiere_reconsentimiento=requiere,
        )
