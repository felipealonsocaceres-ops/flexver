from app.schemas.tariff import TariffRequest, TariffBreakdown, TariffResponse
from app.services.tariff.distance import DistanceTariffStrategy
from app.services.tariff.time_pricing import TimePricingStrategy
from app.services.tariff.demand import DemandPricingStrategy

class TariffEngine:
    """Orquestador central que ejecuta las estrategias logísticas configuradas."""
    
    def __init__(self):
        # Inyectamos el pipeline completo de estrategias
        self._strategies = [
            DistanceTariffStrategy(),
            TimePricingStrategy(),
            DemandPricingStrategy()  # <-- Nuestra nueva estrategia agregada al flujo
        ]

    def calculate_fare(self, request: TariffRequest) -> TariffResponse:
        breakdown = TariffBreakdown(
            base_fija=0.0,
            costo_distancia=0.0,
            recargo_hora_punta=0.0,
            recargo_festivo_demanda=0.0
        )
        
        for strategy in self._strategies:
            breakdown = strategy.calculate(request, breakdown)
            
        total = (
            breakdown.base_fija + 
            breakdown.costo_distancia + 
            breakdown.recargo_hora_punta + 
            breakdown.recargo_festivo_demanda
        )
        
        return TariffResponse(
            tarifa_total=round(total, 2),
            desglose=breakdown
        )