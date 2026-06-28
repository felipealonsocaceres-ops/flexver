"""Endpoints HTTP del dominio Analítico (Motor de Toma de Decisiones).

Reservado a administradores: la agregación abarca TODA la operación, así que se
expone solo tras `get_current_admin`. No contiene lógica de negocio: inyecta el
`AnalyticsService` y delega.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, get_analytics_service, get_current_admin
from app.schemas.analytics import AnalyticsDashboard
from app.services.analytics_service import AnalyticsService

router = APIRouter()

ServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboard,
    summary="Métricas del Dashboard BI (solo admin)",
)
def dashboard(
    service: ServiceDep,
    _admin: Annotated[CurrentUser, Depends(get_current_admin)],
) -> AnalyticsDashboard:
    """Entrega KPIs, SLA de onboarding y tiempos de asignación en una llamada."""
    return service.obtener_dashboard()
