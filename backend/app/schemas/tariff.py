from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class CategoriaCarga(str, Enum):
    CHICA = "chica"
    MEDIANA = "mediana"
    GRANDE = "grande"

class TariffRequest(BaseModel):
    """Datos de entrada para cotizar un flete enviados desde el cliente."""
    categoria: CategoriaCarga = Field(default=CategoriaCarga.MEDIANA, description="Categoría del flete")
    latitud_origen: float = Field(..., ge=-90.0, le=90.0)
    longitud_origen: float = Field(..., ge=-180.0, le=180.0)
    latitud_destino: float = Field(..., ge=-90.0, le=90.0)
    longitud_destino: float = Field(..., ge=-180.0, le=180.0)
    fecha_hora: datetime = Field(default_factory=datetime.now)
    
    # Este campo ya no viene del usuario, lo inyectaremos en el backend
    distancia_km: float | None = Field(default=None, description="Calculado internamente por Mapbox")

class TariffBreakdown(BaseModel):
    """Detalle analítico del cálculo de la tarifa."""
    base_fija: float
    costo_distancia: float
    recargo_hora_punta: float
    recargo_festivo_demanda: float

class TariffResponse(BaseModel):
    """Respuesta final de la cotización enviada al frontend."""
    tarifa_total: float
    moneda: str = "CLP"
    desglose: TariffBreakdown
    estimado_id: str | None = None