"""Punto de entrada de la aplicación FlexVer API.

Instancia FastAPI, configura CORS y expone un endpoint de salud que confirma
que el servidor arrancó y la configuración (Supabase) se cargó correctamente.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

# --- Instancia principal con metadata de la API ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description="Backend logístico FlexVer: usuarios, tarifas dinámicas y telemetría GPS.",
)

# --- CORS abierto para desarrollo local (restringir en producción) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
async def health_check() -> dict[str, str | bool]:
    """Endpoint de prueba.

    Confirma que el servidor está activo y que las credenciales de Supabase
    fueron cargadas (verifica presencia, no expone el valor de la key).
    """
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.API_VERSION,
        "status": "ok",
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_KEY),
    }


# --- Monta todas las rutas de la API v1 bajo /api/v1 ---
app.include_router(api_router)
