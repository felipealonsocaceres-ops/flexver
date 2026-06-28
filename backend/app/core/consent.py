"""Fuente única de verdad para el consentimiento (Ley 21.719).

Centraliza la versión vigente de la política y los tipos de consentimiento.
Cualquier capa (registro, login, endpoints, evidencia) lee de aquí: si la
política cambia, se sube `POLICY_VERSION` en UN solo lugar y todo el sistema
empieza a exigir re-consentimiento de forma coherente.
"""

from enum import Enum

# --- Versión vigente de la política. Súbela al publicar una nueva política. ---
# El frontend mantiene un espejo en `frontend/src/lib/privacy.ts`.
POLICY_VERSION = "1.0"


class ConsentType(str, Enum):
    """Tipos de consentimiento, separando lo contractual de lo opcional.

    - TERMINOS_Y_POLITICA: contractual/OBLIGATORIO. Sin él no hay cuenta.
    - MARKETING: opcional, apagado por defecto, revocable.
    - TELEMETRIA_HISTORIAL: opcional; historial de telemetría más allá de lo
      estrictamente necesario para prestar el servicio.
    """

    TERMINOS_Y_POLITICA = "terminos_y_politica"
    MARKETING = "marketing"
    TELEMETRIA_HISTORIAL = "telemetria_historial"


# Consentimientos opcionales (nunca premarcados, siempre revocables).
OPTIONAL_CONSENTS = (ConsentType.MARKETING, ConsentType.TELEMETRIA_HISTORIAL)
