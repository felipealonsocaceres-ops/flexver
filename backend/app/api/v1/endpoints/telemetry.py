import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.telemetry.tasks import procesar_coordenadas_lote

router = APIRouter()

@router.websocket("/ws/{driver_id}")
async def websocket_telemetry(websocket: WebSocket, driver_id: str):
    """
    Endpoint de WebSocket para recibir telemetría en tiempo real.
    El celular del conductor se conecta aquí y envía ráfagas de coordenadas.
    """
    await websocket.accept()
    print(f"🟢 Conductor {driver_id} conectado a la telemetría.")
    
    try:
        while True:
            # 1. Recibimos el mensaje de texto (JSON) desde la app del conductor
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            
            # 2. Le inyectamos el ID del conductor por seguridad
            data["driver_id"] = driver_id
            
            # 3. 🚀 Magia Asíncrona: Enviamos los datos a Celery/Redis en segundo plano
            # El método .delay() encola la tarea y libera a FastAPI inmediatamente
            procesar_coordenadas_lote.delay(data)
            
            # 4. Respondemos al frontend que lo recibimos con éxito
            await websocket.send_json({
                "status": "ok", 
                "mensaje": "Coordenada encolada en Redis"
            })
            
    except WebSocketDisconnect:
        print(f"🔴 Conductor {driver_id} se ha desconectado.")
    except json.JSONDecodeError:
        await websocket.send_json({"error": "Formato de datos inválido. Se espera JSON."})