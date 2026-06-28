"""Servicio del dominio de Usuarios.

Orquesta los casos de uso de identidad (registro, verificación y consulta)
coordinando la creación de la identidad en Supabase Auth, la persistencia del
perfil, el almacenamiento PRIVADO de documentos y la evidencia de
consentimiento. La capa de API no contiene esta lógica; solo invoca al servicio.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.consent import POLICY_VERSION, ConsentType
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

    # --- Helpers --------------------------------------------------------------
    def _require_terms(self, acepta_terminos: bool) -> None:
        """Bloquea el registro si no se aceptan los términos (contractual)."""
        if not acepta_terminos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes aceptar los Términos y la Política de Privacidad para registrarte.",
            )

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

    def _record_registration_consents(
        self,
        *,
        user_id: str,
        acepta_marketing: bool,
        ip: str | None,
        user_agent: str | None,
    ) -> None:
        """Deja evidencia inmutable de los consentimientos dados al registrarse.

        Términos siempre va otorgado (ya se validó). Marketing refleja el toggle
        opcional (true u false). El servidor estampa versión, IP y User-Agent.
        """
        base = {
            "id_usuario": user_id,
            "version_politica": POLICY_VERSION,
            "ip_origen": ip,
            "user_agent": user_agent,
        }
        self._repository.insert_consent(
            {**base, "tipo": ConsentType.TERMINOS_Y_POLITICA.value, "otorgado": True}
        )
        self._repository.insert_consent(
            {**base, "tipo": ConsentType.MARKETING.value, "otorgado": bool(acepta_marketing)}
        )

    # --- Registro -------------------------------------------------------------
    def register_driver(
        self,
        data: DriverProfileCreate,
        archivos: dict[str, dict],
        meta: dict[str, str | None] | None = None,
    ) -> UserResponse:
        """Registra un conductor: identidad, perfil, documentos KYC y evidencia.

        Los documentos se suben a un bucket PRIVADO bajo la carpeta del usuario.
        El estado inicial es 'en_revision' (ya entregó la documentación) para que
        el Guardián de Onboarding bloquee el panel hasta la aprobación manual.
        Aplica rollback compensatorio (Auth + Storage) si algo falla.
        """
        if data.rol is not Rol.CONDUCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de conductores.",
            )
        self._require_terms(data.acepta_terminos)

        meta = meta or {}
        # 1. Crear la identidad en Supabase Auth (mapea correo duplicado a 409)
        user_id = self._create_identity(data.email, data.password)

        try:
            # 2. Subir documentos al bucket privado: {user_id}/<doc>.<ext>
            rutas: dict[str, str] = {}
            for clave, archivo in archivos.items():
                rutas[clave] = self._repository.upload_kyc_file(
                    user_id,
                    archivo["filename"],
                    archivo["data"],
                    archivo["content_type"],
                )

            # 3. Perfil general del usuario (deja constancia de la versión aceptada)
            created = self._repository.create_user_profile(
                {
                    "id_usuario": user_id,
                    "nombre_completo": data.nombre_completo,
                    "email": data.email,
                    "telefono": data.telefono,
                    "rol": data.rol.value,
                    "version_politica_aceptada": POLICY_VERSION,
                }
            )

            # 4. Perfil de conductor: SEMÁFORO en 'en_revision', no disponible.
            #    Minimización: solo patente/capacidad extraídas del padrón.
            self._repository.create_driver_profile(
                {
                    "id_usuario": user_id,
                    "rut": data.rut,
                    "estado_verificacion": "en_revision",
                    "disponible": False,
                    "latitud_actual": None,
                    "longitud_actual": None,
                    "patente": data.patente,
                    "capacidad_m3": data.capacidad_m3,
                    "url_carnet_frontal": rutas.get("carnet_frontal"),
                    "url_carnet_reverso": rutas.get("carnet_reverso"),
                    "url_licencia": rutas.get("licencia"),
                    "url_padron": rutas.get("padron"),
                    "url_selfie": rutas.get("selfie"),
                    "identidad_confirmada": False,
                }
            )

            # 5. Evidencia de consentimiento (términos + marketing opcional)
            self._record_registration_consents(
                user_id=user_id,
                acepta_marketing=data.acepta_marketing,
                ip=meta.get("ip"),
                user_agent=meta.get("user_agent"),
            )
        except HTTPException:
            self._rollback(user_id)
            raise
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            self._rollback(user_id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo completar el registro debido a un error interno del servidor.",
            ) from exc

        return UserResponse.model_validate(created)

    def register_client(
        self,
        data: ClientProfileCreate,
        meta: dict[str, str | None] | None = None,
    ) -> UserResponse:
        """Registra un cliente: identidad, perfil y evidencia de consentimiento."""
        if data.rol is not Rol.CLIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este endpoint es exclusivo para el registro de clientes.",
            )
        self._require_terms(data.acepta_terminos)

        meta = meta or {}
        user_id = self._create_identity(data.email, data.password)

        try:
            created = self._repository.create_user_profile(
                {
                    "id_usuario": user_id,
                    "nombre_completo": data.nombre_completo,
                    "email": data.email,
                    "telefono": data.telefono,
                    "rol": data.rol.value,
                    "version_politica_aceptada": POLICY_VERSION,
                }
            )
            self._record_registration_consents(
                user_id=user_id,
                acepta_marketing=data.acepta_marketing,
                ip=meta.get("ip"),
                user_agent=meta.get("user_agent"),
            )
        except HTTPException:
            self._rollback(user_id)
            raise
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            self._rollback(user_id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo completar el registro debido a un error interno del servidor.",
            ) from exc

        return UserResponse.model_validate(created)

    def _rollback(self, user_id: str) -> None:
        """Transacción de compensación: borra documentos y la identidad de Auth."""
        print(f"[Rollback] Falló el registro. Limpiando storage y auth user: {user_id}")
        try:
            self._repository.delete_kyc_folder(user_id)
        except Exception as err:  # noqa: BLE001 - best-effort
            print(f"[Rollback] No se pudo limpiar storage: {err}")
        try:
            self._repository.delete_auth_user(user_id)
        except Exception as err:  # noqa: BLE001 - best-effort
            print(f"[Crítico] No se pudo ejecutar el rollback de Auth: {err}")

    # --- Verificación manual (Onboarding) ------------------------------------
    def aprobar_conductor(self, user_id: str) -> dict:
        """Aprueba al conductor y DESTRUYE la selfie cruda (minimización).

        Tras el contraste manual selfie↔cédula, la imagen biométrica deja de ser
        necesaria: se elimina del bucket y solo queda el registro lógico
        `identidad_confirmada = true`. Es el principio de minimización aplicado.
        """
        driver = self._repository.get_driver_by_user(user_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conductor no encontrado.",
            )

        # Destruir la selfie cruda (si existe). Best-effort: si falla la borrada
        # no abortamos la aprobación, pero lo dejamos registrado.
        url_selfie = driver.get("url_selfie")
        selfie_destruida = False
        if url_selfie:
            try:
                self._repository.delete_kyc_path(url_selfie)
                selfie_destruida = True
            except Exception as err:  # noqa: BLE001 - best-effort
                print(f"[Aprobación] No se pudo destruir la selfie: {err}")

        cambios = {
            "estado_verificacion": "aprobado",
            "verificado_el": datetime.now(timezone.utc).isoformat(),
            "identidad_confirmada": True,
        }
        if selfie_destruida:
            cambios["url_selfie"] = None
            cambios["selfie_destruida_el"] = datetime.now(timezone.utc).isoformat()

        actualizado = self._repository.update_driver_verification(user_id, cambios)
        if actualizado is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo actualizar el estado del conductor.",
            )
        return {"estado_verificacion": "aprobado", "identidad_confirmada": True}

    def obtener_documentos_kyc(self, user_id: str) -> dict:
        """Genera Signed URLs temporales de los documentos KYC para un admin.

        El bucket es PRIVADO y su RLS solo deja leer al dueño de la carpeta, por
        lo que el frontend de administración NO puede firmar estas URLs: debe
        pasar por aquí (service_role). Solo se firman los documentos presentes;
        si la selfie ya fue destruida tras la aprobación, simplemente no aparece.
        """
        driver = self._repository.get_driver_by_user(user_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conductor no encontrado.",
            )

        # Mapa documento lógico -> columna con su path dentro del bucket privado.
        paths = {
            "carnet_frontal": driver.get("url_carnet_frontal"),
            "carnet_reverso": driver.get("url_carnet_reverso"),
            "licencia": driver.get("url_licencia"),
            "padron": driver.get("url_padron"),
            "selfie": driver.get("url_selfie"),
        }
        # URLs de vida corta (15 min): suficiente para la revisión manual.
        documentos = {
            clave: self._repository.signed_url(path, expires_in=900)
            for clave, path in paths.items()
            if path
        }
        return {"documentos": documentos}

    def rechazar_conductor(self, user_id: str, motivo: str | None = None) -> dict:
        """Rechaza al conductor (queda fuera del semáforo de aprobación)."""
        actualizado = self._repository.update_driver_verification(
            user_id, {"estado_verificacion": "rechazado"}
        )
        if actualizado is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conductor no encontrado.",
            )
        return {"estado_verificacion": "rechazado", "motivo": motivo}

    # --- Consulta -------------------------------------------------------------
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
