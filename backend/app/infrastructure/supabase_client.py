"""Inicialización del cliente único de Supabase.

Centraliza la creación del cliente para que toda la app (repositorios,
servicios) consuma una sola conexión configurada, sin duplicar credenciales.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_client() -> Client:
    """Crea y retorna el cliente único de Supabase (singleton).

    Gracias a `lru_cache`, el cliente se instancia una sola vez y se reutiliza
    en cada llamada. Se inyecta como dependencia en repositorios y servicios.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Cliente listo para importar directamente donde se necesite.
supabase: Client = get_supabase_client()
