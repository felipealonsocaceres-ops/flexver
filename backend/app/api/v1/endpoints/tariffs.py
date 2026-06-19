from fastapi import APIRouter, Depends, status
from app.schemas.tariff import TariffRequest, TariffResponse
from app.services.tariff.engine import TariffEngine
from app.services.mapbox_client import MapboxClient

router = APIRouter()

def get_tariff_engine() -> TariffEngine:
    return TariffEngine()

def get_mapbox_client() -> MapboxClient:
    return MapboxClient()

@router.post(
    "/calculate",
    response_model=TariffResponse,
    status_code=status.HTTP_200_OK,
    summary="Calcula tarifa dinámica integrando mapas reales"
)
async def calculate_tariff(
    payload: TariffRequest, 
    engine: TariffEngine = Depends(get_tariff_engine),
    mapbox: MapboxClient = Depends(get_mapbox_client)
):
    # 1. Consultar inteligencia espacial a Mapbox
    distancia_real_km = await mapbox.get_driving_distance_km(
        lat_origen=payload.latitud_origen,
        lon_origen=payload.longitud_origen,
        lat_destino=payload.latitud_destino,
        lon_destino=payload.longitud_destino
    )
    
    # 2. Inyectar la distancia real en la petición
    payload.distancia_km = distancia_real_km
    
    # 3. El Motor de Tarifas hace el cálculo matemático
    return engine.calculate_fare(payload)