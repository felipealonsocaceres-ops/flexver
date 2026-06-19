from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
from datetime import datetime

class EstadoFlete(str, Enum):
    # Usamos exactamente los estados de tu 'constraint check'
    PENDIENTE = "pendiente"
    BUSCANDO_CONDUCTOR = "buscando_conductor"
    ASIGNADO = "asignado"
    EN_CAMINO = "en_camino"
    CARGA_RECOGIDA = "carga_recogida"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"

class FreightCreate(BaseModel):
    id_usuario: str = Field(..., description="UUID del usuario que pide el flete")
    origen_direccion: str = Field(..., description="Dirección en texto")
    origen_lat: float
    origen_lng: float
    destino_direccion: str = Field(..., description="Dirección en texto")
    destino_lat: float
    destino_lng: float
    distancia_km: Optional[float] = None
    descripcion_carga: Optional[str] = None
    monto_total: float = Field(..., gt=0, description="Precio en CLP")

class FreightUpdate(BaseModel):
    nuevo_estado: EstadoFlete
    id_conductor: Optional[str] = Field(None, description="Obligatorio si pasa a asignado")

class FreightResponse(BaseModel):
    id_flete: str
    id_usuario: Optional[str]
    id_conductor: Optional[str]
    estado: str
    monto_total: Optional[float]
    created_at: Optional[datetime]