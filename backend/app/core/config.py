"""Configuración centralizada de la aplicación.

Lee las variables de entorno (o el archivo .env) una sola vez al arranque
y las expone como un objeto `settings` tipado y validado por Pydantic.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Esquema tipado de configuración de FlexVer.

    Cada atributo se mapea automáticamente a una variable de entorno del
    mismo nombre (case-insensitive). Si falta una variable obligatoria,
    Pydantic lanza un error en el arranque en lugar de fallar en runtime.
    """

    # --- Identidad de la API ---
    PROJECT_NAME: str = "FlexVer API"
    API_VERSION: str = "0.1.0"

    # --- Credenciales de Supabase (obligatorias, sin valor por defecto) ---
    SUPABASE_URL: str = Field(..., description="URL base del proyecto Supabase")
    SUPABASE_KEY: str = Field(..., description="API key (service_role o anon) de Supabase")

    # --- Mapbox ---
    MAPBOX_ACCESS_TOKEN: str = Field(default="", description="Token de acceso Mapbox")

    # --- Transbank Webpay Plus ---
    TRANSBANK_COMMERCE_CODE: str = Field(
        default="597055555532",
        description="Codigo de comercio Transbank (Sandbox por defecto)"
    )
    TRANSBANK_API_KEY: str = Field(
        default="579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
        description="API Key Transbank (Sandbox por defecto)"
    )
    TRANSBANK_AMBIENTE: str = Field(
        default="integration",
        description="Ambiente Transbank: integration o production"
    )

    # --- Frontend ---
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="URL base del frontend para CORS y redirects"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Retorna la instancia única de Settings (cacheada).

    El decorador `lru_cache` garantiza que el .env se lea una sola vez,
    evitando relecturas en cada inyección de dependencia.
    """
    return Settings()


# Instancia lista para importar: `from app.core.config import settings`
settings = get_settings()