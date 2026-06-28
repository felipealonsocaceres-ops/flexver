"""Servicio del dominio Analítico.

Orquesta la lectura de las métricas y las valida/forma con Pydantic antes de
entregarlas al panel. La capa de API solo invoca `obtener_dashboard()`.
"""

from fastapi import HTTPException, status

from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.analytics import (
    AnalyticsDashboard,
    PuntoAsignacion,
    PuntoSLAKyc,
    ResumenOperativo,
)


class AnalyticsService:
    """Casos de uso del Motor Analítico de Toma de Decisiones."""

    def __init__(self, repository: AnalyticsRepository) -> None:
        """Recibe el repositorio inyectado (inversión de dependencias)."""
        self._repository = repository

    def obtener_dashboard(self) -> AnalyticsDashboard:
        """Compone el payload completo del Dashboard BI en una sola pasada.

        Cualquier fallo de la frontera con Supabase se traduce a un 502 sin
        filtrar detalles internos. Datasets vacíos son válidos (plataforma
        nueva): devolvemos listas vacías y KPIs en cero.
        """
        try:
            resumen_raw = self._repository.resumen_operativo()
            sla_raw = self._repository.sla_kyc_semanal()
            asignacion_raw = self._repository.tiempo_asignacion_por_hora()
        except Exception as exc:  # noqa: BLE001 - frontera con Supabase
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudieron calcular las métricas analíticas.",
            ) from exc

        return AnalyticsDashboard(
            resumen=ResumenOperativo.model_validate(resumen_raw or {}),
            sla_kyc_semanal=[PuntoSLAKyc.model_validate(p) for p in sla_raw],
            asignacion_por_hora=[PuntoAsignacion.model_validate(p) for p in asignacion_raw],
        )
