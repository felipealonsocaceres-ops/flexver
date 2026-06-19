import os
from fastapi import APIRouter, HTTPException, status
from supabase import create_client, Client
from app.schemas.freight import FreightCreate, FreightUpdate, FreightResponse, EstadoFlete

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 🧠 MÁQUINA DE ESTADOS EXTENDIDA (Basada en tu base de datos)
TRANSICIONES_PERMITIDAS = {
    EstadoFlete.PENDIENTE: [EstadoFlete.BUSCANDO_CONDUCTOR, EstadoFlete.CANCELADO],
    EstadoFlete.BUSCANDO_CONDUCTOR: [EstadoFlete.ASIGNADO, EstadoFlete.CANCELADO],
    EstadoFlete.ASIGNADO: [EstadoFlete.EN_CAMINO, EstadoFlete.CANCELADO],
    EstadoFlete.EN_CAMINO: [EstadoFlete.CARGA_RECOGIDA],
    EstadoFlete.CARGA_RECOGIDA: [EstadoFlete.ENTREGADO],
    EstadoFlete.ENTREGADO: [], 
    EstadoFlete.CANCELADO: []
}

@router.post("/", response_model=FreightResponse, status_code=status.HTTP_201_CREATED)
async def crear_flete(payload: FreightCreate):
    try:
        data = payload.model_dump()
        respuesta = supabase.table("fletes").insert(data).execute()
        return respuesta.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.patch("/{id_flete}/estado", response_model=FreightResponse)
async def actualizar_estado_flete(id_flete: str, payload: FreightUpdate):
    # 1. Consultar estado actual (usando tu columna id_flete)
    flete_actual = supabase.table("fletes").select("*").eq("id_flete", id_flete).execute()
    if not flete_actual.data:
        raise HTTPException(status_code=404, detail="Flete no encontrado")
    
    estado_actual = flete_actual.data[0]["estado"]
    nuevo_estado = payload.nuevo_estado

    # 2. Validar regla antifraude
    if nuevo_estado not in TRANSICIONES_PERMITIDAS.get(EstadoFlete(estado_actual), []):
        raise HTTPException(
            status_code=400, 
            detail=f"Transición prohibida: No puedes pasar de '{estado_actual}' a '{nuevo_estado}'"
        )

    actualizacion = {"estado": nuevo_estado}
    
    # 3. Regla para Asignación
    if nuevo_estado == EstadoFlete.ASIGNADO:
        if not payload.id_conductor:
            raise HTTPException(status_code=400, detail="Falta el id_conductor para asignar.")
        actualizacion["id_conductor"] = payload.id_conductor

    # 💳 4. Gancho de Pasarela de Pagos (Simulado al entregar)
    if nuevo_estado == EstadoFlete.ENTREGADO:
        monto = flete_actual.data[0].get('monto_total', 0)
        print(f"💰 [SISTEMA DE PAGOS] Procesando cobro de ${monto} CLP...")
        print("✅ Cobro exitoso. Fondos liberados.")
        # Aquí más adelante podemos actualizar una tabla de pagos si lo necesitas

    # 5. Guardar cambios en la BD
    respuesta = supabase.table("fletes").update(actualizacion).eq("id_flete", id_flete).execute()
    return respuesta.data[0]