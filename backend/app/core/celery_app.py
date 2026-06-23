import os
from celery import Celery

# Leemos la URL de Redis desde las variables de entorno (o usamos localhost si corres sin Docker)
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Inicializamos la app de Celery
# 'broker' es de donde lee los mensajes (Redis)
# 'backend' es donde guarda los resultados (Redis)
celery_app = Celery(
    "flexver_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.services.telemetry.tasks"] # Aquí vivirán nuestras tareas pesadas
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Santiago",
    enable_utc=True,
)