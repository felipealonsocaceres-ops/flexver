"""Tests del UserService: términos obligatorios, semáforo y minimización selfie."""

import pytest
from fastapi import HTTPException

from app.schemas.user import ClientProfileCreate, DriverProfileCreate
from app.services.user_service import UserService


class FakeUserRepository:
    """Repositorio falso que registra las llamadas relevantes del servicio."""

    def __init__(self, driver_row=None):
        self.created_user = None
        self.created_driver = None
        self.consents = []
        self.uploaded = []
        self.deleted_paths = []
        self.deleted_folders = []
        self.verification_updates = []
        self._driver_row = driver_row
        self.deleted_auth = []

    # Identidad
    def create_auth_user(self, email, password):
        return "user-123"

    def delete_auth_user(self, user_id):
        self.deleted_auth.append(user_id)

    # Perfiles
    def create_user_profile(self, profile):
        self.created_user = profile
        return {"id_usuario": profile["id_usuario"], "nombre_completo": profile["nombre_completo"],
                "email": profile["email"], "rol": profile["rol"]}

    def create_driver_profile(self, profile):
        self.created_driver = profile
        return profile

    # Storage
    def upload_kyc_file(self, user_id, nombre, contenido, content_type):
        path = f"{user_id}/{nombre}"
        self.uploaded.append(path)
        return path

    def delete_kyc_path(self, path):
        self.deleted_paths.append(path)

    def delete_kyc_folder(self, user_id):
        self.deleted_folders.append(user_id)

    # Consentimiento
    def insert_consent(self, event):
        self.consents.append(event)

    # Verificación
    def get_driver_by_user(self, user_id):
        return self._driver_row

    def update_driver_verification(self, user_id, cambios):
        self.verification_updates.append(cambios)
        return {"id_usuario": user_id, **cambios}


def _driver_payload(**over):
    base = dict(
        nombre_completo="Juan Perez",
        email="juan@example.com",
        password="Sup3rPass!",
        telefono="+56 9 1234 5678",
        rut="11111111-1",  # no usado (validación real abajo)
        acepta_terminos=True,
    )
    base.update(over)
    return base


def _archivos():
    blob = {"data": b"x", "content_type": "image/jpeg", "filename": "doc.jpg"}
    return {k: dict(blob) for k in ("carnet_frontal", "carnet_reverso", "licencia", "padron", "selfie")}


def test_register_client_sin_terminos_falla_400():
    repo = FakeUserRepository()
    service = UserService(repo)
    data = ClientProfileCreate(
        nombre_completo="Ana Soto", email="ana@example.com", password="Sup3rPass!",
        telefono=None, acepta_terminos=False,
    )
    with pytest.raises(HTTPException) as exc:
        service.register_client(data)
    assert exc.value.status_code == 400
    # No debe crear identidad ni perfil si no acepta términos.
    assert repo.created_user is None


def test_register_client_registra_evidencia_terminos_y_marketing():
    repo = FakeUserRepository()
    service = UserService(repo)
    data = ClientProfileCreate(
        nombre_completo="Ana Soto", email="ana@example.com", password="Sup3rPass!",
        telefono=None, acepta_terminos=True, acepta_marketing=False,
    )
    service.register_client(data, {"ip": "9.9.9.9", "user_agent": "ua"})

    tipos = {c["tipo"]: c["otorgado"] for c in repo.consents}
    assert tipos["terminos_y_politica"] is True
    assert tipos["marketing"] is False  # apagado por defecto, queda como evidencia
    assert repo.created_user["version_politica_aceptada"] is not None


def test_register_driver_queda_en_revision_y_sube_docs():
    # RUT chileno válido para pasar el validator del schema.
    data = DriverProfileCreate(**_driver_payload(rut="12.345.678-5", patente="ABCD12", capacidad_m3=5))
    repo = FakeUserRepository()
    service = UserService(repo)

    service.register_driver(data, _archivos(), {"ip": None, "user_agent": None})

    # Semáforo: tras subir documentos, queda 'en_revision' y no disponible.
    assert repo.created_driver["estado_verificacion"] == "en_revision"
    assert repo.created_driver["disponible"] is False
    assert repo.created_driver["identidad_confirmada"] is False
    # Minimización del padrón.
    assert repo.created_driver["patente"] == "ABCD12"
    assert repo.created_driver["capacidad_m3"] == 5
    # Los 5 documentos se subieron al bucket privado bajo la carpeta del usuario.
    assert len(repo.uploaded) == 5
    assert all(p.startswith("user-123/") for p in repo.uploaded)


def test_aprobar_conductor_destruye_la_selfie():
    repo = FakeUserRepository(driver_row={"url_selfie": "user-123/selfie.jpg"})
    service = UserService(repo)

    resultado = service.aprobar_conductor("user-123")

    assert resultado["estado_verificacion"] == "aprobado"
    # La selfie cruda se destruye (minimización biométrica).
    assert "user-123/selfie.jpg" in repo.deleted_paths
    cambios = repo.verification_updates[0]
    assert cambios["identidad_confirmada"] is True
    assert cambios["url_selfie"] is None
    assert cambios["selfie_destruida_el"] is not None
    assert cambios["verificado_el"] is not None
