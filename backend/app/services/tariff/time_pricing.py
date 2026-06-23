from app.schemas.tariff import TariffRequest, TariffBreakdown
from app.services.tariff.base import TariffStrategy

class TimePricingStrategy(TariffStrategy):
    """Aplica un multiplicador sobre el costo base si el viaje ocurre en hora punta."""
    
    def __init__(self, factor_punta: float = 0.25):
        self.factor_punta = factor_punta

    def calculate(self, request: TariffRequest, breakdown: TariffBreakdown) -> TariffBreakdown:
        hora = request.fecha_hora.hour
        
        # Bloques de hora punta matutino y vespertino habituales en logística urbana
        es_hora_punta = (7 <= hora <= 9) or (18 <= hora <= 20)
        
        if es_hora_punta:
            costo_base_actual = breakdown.base_fija + breakdown.costo_distancia
            breakdown.recargo_hora_punta = round(costo_base_actual * self.factor_punta, 2)
        else:
            breakdown.recargo_hora_punta = 0.0
            
        return breakdown