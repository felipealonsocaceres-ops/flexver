import os
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client
from app.schemas.freight import FreightCreate, FreightUpdate, FreightResponse, EstadoFlete

router = APIRouter()


class ConductorPublico(BaseModel):
    """Datos públicos del conductor que ve el cliente cuando le asignan el viaje."""
    nombre: str
    telefono: Optional[str] = None
    rut: Optional[str] = None
    calificacion: Optional[float] = None
    total_calificaciones: int = 0

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


@router.get("/{id_flete}/conductor", response_model=ConductorPublico)
async def obtener_conductor_del_flete(id_flete: str):
    """Devuelve los datos públicos del conductor asignado a un flete.

    Corre con el cliente service-role del backend, por lo que NO depende de las
    políticas RLS (un cliente no puede leer la fila del conductor directamente).
    """
    flete = supabase.table("fletes").select("id_conductor").eq("id_flete", id_flete).execute()
    if not flete.data:
        raise HTTPException(status_code=404, detail="Flete no encontrado")

    id_conductor = flete.data[0].get("id_conductor")
    if not id_conductor:
        raise HTTPException(status_code=404, detail="El flete aún no tiene conductor asignado")

    cond = (
        supabase.table("conductores")
        .select("id_usuario, rut")
        .eq("id_conductor", id_conductor)
        .execute()
    )
    if not cond.data:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    id_usuario = cond.data[0].get("id_usuario")
    nombre, telefono = "Conductor", None
    if id_usuario:
        usuario = (
            supabase.table("usuarios")
            .select("nombre_completo, telefono")
            .eq("id_usuario", id_usuario)
            .execute()
        )
        if usuario.data:
            nombre = usuario.data[0].get("nombre_completo") or "Conductor"
            telefono = usuario.data[0].get("telefono")

    # Promedio de calificaciones del conductor.
    cals = (
        supabase.table("calificaciones")
        .select("puntaje")
        .eq("id_conductor", id_conductor)
        .execute()
    )
    puntajes = [c["puntaje"] for c in (cals.data or []) if c.get("puntaje") is not None]
    promedio = round(sum(puntajes) / len(puntajes), 1) if puntajes else None

    return ConductorPublico(
        nombre=nombre,
        telefono=telefono,
        rut=cond.data[0].get("rut"),
        calificacion=promedio,
        total_calificaciones=len(puntajes),
    )