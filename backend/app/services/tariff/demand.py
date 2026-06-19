from app.schemas.tariff import TariffRequest, TariffBreakdown
from app.services.tariff.base import TariffStrategy

class DemandPricingStrategy(TariffStrategy):
    """Aplica recargos operativos si el flete ocurre en fin de semana o día festivo."""
    
    def __init__(self, factor_fin_semana: float = 0.15):
        self.factor_fin_semana = factor_fin_semana

    def calculate(self, request: TariffRequest, breakdown: TariffBreakdown) -> TariffBreakdown:
        # En Python, weekday() devuelve 0 para Lunes y 6 para Domingo.
        # Por lo tanto, 5 (Sábado) y 6 (Domingo) son fin de semana.
        es_fin_semana = request.fecha_hora.weekday() >= 5
        
        if es_fin_semana:
            # El recargo se aplica sobre el costo operativo base (fija + distancia)
            costo_operativo = breakdown.base_fija + breakdown.costo_distancia
            breakdown.recargo_festivo_demanda = round(costo_operativo * self.factor_fin_semana, 2)
        else:
            breakdown.recargo_festivo_demanda = 0.0
            
        return breakdown