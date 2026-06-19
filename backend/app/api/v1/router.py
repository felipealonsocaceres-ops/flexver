"""Router agregador de la API v1.

Monta los routers de cada dominio bajo el prefijo `/api/v1`. A medida que
crezcan los sprints (fletes, tarifas, telemetría) se incluyen aquí.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import users, tariffs, telemetry, freights

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router, prefix="/users", tags=["Usuarios"])
api_router.include_router(tariffs.router, prefix="/tariffs", tags=["Tarifas"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetria"])
api_router.include_router(freights.router, prefix="/freights", tags=["Orquestacion de fletes"])