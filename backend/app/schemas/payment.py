"""Schemas Pydantic para el dominio de pagos Transbank."""

from pydantic import BaseModel
from typing import Optional


class IniciarPagoRequest(BaseModel):
    id_flete: str
    monto: int
    return_url: str


class IniciarPagoResponse(BaseModel):
    url: str
    token: str


class ConfirmarPagoRequest(BaseModel):
    token_ws: str


class ConfirmarPagoResponse(BaseModel):
    estado: str
    monto: Optional[float] = None
    orden: Optional[str] = None
    codigo_autorizacion: Optional[str] = None
    tipo_pago: Optional[str] = None
    cuotas: Optional[int] = None