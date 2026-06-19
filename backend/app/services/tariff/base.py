from abc import ABC, abstractmethod
from app.schemas.tariff import TariffRequest, TariffBreakdown

class TariffStrategy(ABC):
    """Interfaz abstracta que define el contrato para cualquier estrategia de precio."""
    
    @abstractmethod
    def calculate(self, request: TariffRequest, breakdown: TariffBreakdown) -> TariffBreakdown:
        """Modifica el desglose tarifario aplicando las reglas específicas de la estrategia."""
        pass