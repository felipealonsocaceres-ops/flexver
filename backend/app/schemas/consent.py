"""Schemas Pydantic del dominio de Consentimiento (Ley 21.719)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.consent import ConsentType


class ConsentCreate(BaseModel):
    """Cuerpo para registrar un evento de consentimiento.

    El cliente SOLO declara `tipo` y `otorgado` (otorga/revoca). El servidor
    estampa `creado_en`, `version_politica`, `ip_origen` y `user_agent`: el
    cliente no puede falsear la evidencia.
    """

    tipo: ConsentType
    otorgado: bool = Field(..., description="true = otorga, false = revoca")


class ConsentEvent(BaseModel):
    """Un evento de consentimiento tal como quedó persistido (inmutable)."""

    model_config = ConfigDict(from_attributes=True)

    id_consentimiento: str
    tipo: ConsentType
    otorgado: bool
    version_politica: str
    creado_en: datetime


class ConsentStatusItem(BaseModel):
    """Estado ACTUAL (último evento) de un tipo de consentimiento."""

    tipo: ConsentType
    otorgado: bool
    version_politica: str | None = None
    creado_en: datetime | None = None


class ConsentStatusResponse(BaseModel):
    """Estado de consentimiento del usuario autenticado.

    `requiere_reconsentimiento` es true si la versión de política aceptada por
    el usuario quedó atrás respecto de la vigente: hay que volver a pedirla.
    """

    estados: list[ConsentStatusItem]
    version_politica_vigente: str
    version_politica_aceptada: str | None = None
    requiere_reconsentimiento: bool
