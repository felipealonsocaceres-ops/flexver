"""Router agregador de la API v1."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    users,
    tariffs,
    telemetry,
    freights,
    payments,
    consents,
    analytics,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router, prefix="/users", tags=["Usuarios"])
# El router de consentimientos ya trae su propio prefix="/consentimientos".
api_router.include_router(consents.router)
api_router.include_router(tariffs.router, prefix="/tariffs", tags=["Tarifas"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetria"])
api_router.include_router(freights.router, prefix="/freights", tags=["Orquestacion de fletes"])
api_router.include_router(payments.router, prefix="/payments", tags=["Pagos"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analitica"])