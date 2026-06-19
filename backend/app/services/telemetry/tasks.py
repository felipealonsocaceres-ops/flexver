import os
from supabase import create_client, Client
from app.core.celery_app import celery_app

# Inicializar Supabase de forma global para el worker
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@celery_app.task
def procesar_coordenadas_lote(datos: dict):
    """
    Toma el paquete de telemetría de Redis y lo inserta en la base de datos PostgreSQL.
    """
    print(f"📦 Intentando guardar coordenada en BD: {datos}")
    
    try:
        # Armamos el diccionario exactamente con los nombres de columnas de la tabla
        payload = {
            "id_conductor": datos["driver_id"],
            "latitud": datos["latitud"],
            "longitud": datos["longitud"],
            "velocidad": datos.get("velocidad", 0)
            # No enviamos el 'timestamp', dejamos que Postgres ponga la hora exacta del servidor (NOW)
        }
        
        # Ejecutamos el INSERT a través del cliente de Supabase
        respuesta = supabase.table("telemetria_gps").insert(payload).execute()
        
        print(f"✅ Éxito! Coordenada guardada en BD. ID: {respuesta.data[0]['id']}")
        return True
        
    except Exception as e:
        print(f"❌ Error crítico al guardar en Supabase: {str(e)}")
        return False