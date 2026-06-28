"""Tests del ConsentService (Ley 21.719) con repositorio falso (sin Supabase)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.consent import POLICY_VERSION, ConsentType
from app.services.consent_service import ConsentService


class FakeConsentRepository:
    """Repositorio en memoria que imita la interfaz usada por el servicio."""

    def __init__(self, eventos=None, version_aceptada=None):
        self.eventos = list(eventos or [])
        self.version_aceptada = version_aceptada
        self.inserted = []

    def insert_event(self, event):
        # Simula creado_en del servidor.
        row = {**event, "id_consentimiento": "evt", "creado_en": datetime.now(timezone.utc)}
        self.inserted.append(event)
        self.eventos.insert(0, row)
        return row

    def list_events(self, id_usuario):
        return self.eventos

    def set_version_aceptada(self, id_usuario, version):
        self.version_aceptada = version

    def get_version_aceptada(self, id_usuario):
        return self.version_aceptada


def test_record_terminos_estampa_version_y_evidencia():
    repo = FakeConsentRepository()
    service = ConsentService(repo)

    service.record(
        id_usuario="u1",
        tipo=ConsentType.TERMINOS_Y_POLITICA,
        otorgado=True,
        ip="1.2.3.4",
        user_agent="pytest",
    )

    # El servidor estampa versión, IP y UA (el cliente no los falsea).
    assert repo.inserted[0]["version_politica"] == POLICY_VERSION
    assert repo.inserted[0]["ip_origen"] == "1.2.3.4"
    assert repo.inserted[0]["user_agent"] == "pytest"
    # Aceptar términos deja constancia de la versión aceptada.
    assert repo.version_aceptada == POLICY_VERSION


def test_current_status_toma_el_ultimo_evento_por_tipo():
    ahora = datetime.now(timezone.utc)
    # Marketing: primero otorgado (antiguo), luego revocado (reciente).
    eventos = [
        {"tipo": "marketing", "otorgado": False, "version_politica": "1.0", "creado_en": ahora},
        {"tipo": "marketing", "otorgado": True, "version_politica": "1.0", "creado_en": ahora - timedelta(days=1)},
        {"tipo": "terminos_y_politica", "otorgado": True, "version_politica": "1.0", "creado_en": ahora - timedelta(days=2)},
    ]
    service = ConsentService(FakeConsentRepository(eventos, version_aceptada=POLICY_VERSION))

    status = service.current_status("u1")
    estado = {e.tipo: e.otorgado for e in status.estados}

    # El estado vigente de marketing es el último evento: revocado.
    assert estado[ConsentType.MARKETING] is False
    assert estado[ConsentType.TERMINOS_Y_POLITICA] is True
    # Tipo sin eventos -> False por defecto (no premarcado).
    assert estado[ConsentType.TELEMETRIA_HISTORIAL] is False
    assert status.requiere_reconsentimiento is False


def test_requiere_reconsentimiento_cuando_la_version_quedo_atras():
    service = ConsentService(FakeConsentRepository(eventos=[], version_aceptada="0.9"))
    status = service.current_status("u1")
    assert status.requiere_reconsentimiento is True
    assert status.version_politica_vigente == POLICY_VERSION


def test_requiere_reconsentimiento_si_nunca_acepto():
    service = ConsentService(FakeConsentRepository(eventos=[], version_aceptada=None))
    assert service.current_status("u1").requiere_reconsentimiento is True
