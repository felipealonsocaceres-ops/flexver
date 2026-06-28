"""Repositorio del dominio Analítico.

Única capa autorizada a hablar con Supabase para la analítica. Delega la
agregación pesada (GROUP BY por hora/semana) a funciones SQL (`rpc`), porque
PostgREST no expresa bien esos agrupamientos. Corre con el cliente service_role
del backend, de modo que la consulta abarca TODAS las filas (sin RLS).
"""

from typing import Any

from supabase import Client


class AnalyticsRepository:
    """Acceso a las funciones de agregación del Motor de Decisiones."""

    def __init__(self, client: Client) -> None:
        """Recibe el cliente de Supabase ya configurado (inyección)."""
        self._client = client

    def _call(self, fn: str) -> list[dict[str, Any]]:
        """Invoca una función SQL sin parámetros y normaliza el resultado."""
        response = self._client.rpc(fn, {}).execute()
        return response.data or []

    def tiempo_asignacion_por_hora(self) -> list[dict[str, Any]]:
        """Minutos promedio de espera hasta 'asignado', por hora del día."""
        return self._call("fn_tiempo_asignacion_por_hora")

    def sla_kyc_semanal(self) -> list[dict[str, Any]]:
        """Horas promedio de validación KYC, por semana de ingreso."""
        return self._call("fn_sla_kyc_semanal")

    def resumen_operativo(self) -> dict[str, Any]:
        """KPIs de cabecera (conversión y comisión proyectada). Fila única."""
        filas = self._call("fn_resumen_operativo")
        return filas[0] if filas else {}
