"""Esquemas del dominio Analítico (Motor de Toma de Decisiones).

Espejo tipado de lo que devuelven las funciones SQL de agregación. La capa de
presentación (panel de admin) consume `AnalyticsDashboard` en una sola llamada.
"""

from datetime import date

from pydantic import BaseModel, Field


class PuntoAsignacion(BaseModel):
    """Minutos promedio de espera en 'buscando_conductor' por hora del día."""

    hora: int = Field(..., ge=0, le=23, description="Hora del día (0-23)")
    minutos_promedio: float = Field(..., description="Espera promedio hasta 'asignado'")
    muestras: int = Field(..., description="Cantidad de fletes que aportan al promedio")


class PuntoSLAKyc(BaseModel):
    """Horas promedio que tarda la validación KYC, por semana de ingreso."""

    semana: date = Field(..., description="Lunes de la semana (date_trunc 'week')")
    horas_promedio: float = Field(..., description="Tiempo de verificación en horas")
    muestras: int = Field(..., description="Conductores verificados esa semana")


class ResumenOperativo(BaseModel):
    """KPIs inteligentes de cabecera."""

    fletes_completados: int = 0
    fletes_cancelados: int = 0
    tasa_conversion: float = Field(0, description="% entregados sobre entregados+cancelados")
    comision_proyectada: float = Field(0, description="10% del monto de fletes entregados (CLP)")


class AnalyticsDashboard(BaseModel):
    """Payload completo que alimenta el Dashboard BI en una sola petición."""

    resumen: ResumenOperativo
    sla_kyc_semanal: list[PuntoSLAKyc]
    asignacion_por_hora: list[PuntoAsignacion]
