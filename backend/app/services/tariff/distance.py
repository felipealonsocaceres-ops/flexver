from app.schemas.tariff import TariffRequest, TariffBreakdown, CategoriaCarga
from app.services.tariff.base import TariffStrategy

class DistanceTariffStrategy(TariffStrategy):
    """Calcula el costo base adaptándose dinámicamente al tamaño del flete."""
    
    # Matriz de precios del mercado logístico chileno
    MATRIZ_TARIFAS = {
        CategoriaCarga.CHICA: {"base": 4500.0, "por_km": 500.0},
        CategoriaCarga.MEDIANA: {"base": 12000.0, "por_km": 850.0},
        CategoriaCarga.GRANDE: {"base": 22000.0, "por_km": 1200.0}
    }

    def calculate(self, request: TariffRequest, breakdown: TariffBreakdown) -> TariffBreakdown:
        # Extraemos la configuración según la categoría seleccionada
        config = self.MATRIZ_TARIFAS.get(request.categoria)
        
        breakdown.base_fija = config["base"]
        breakdown.costo_distancia = round(request.distancia_km * config["por_km"], 2)
        return breakdown