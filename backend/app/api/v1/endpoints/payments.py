"""Endpoints del dominio de pagos — Transbank Webpay Plus.

Rutas:
  POST /api/v1/payments/iniciar    — Crea una transacción y retorna URL de pago
  POST /api/v1/payments/confirmar  — Confirma la transacción tras el redirect
"""

from fastapi import APIRouter, HTTPException

from app.schemas.payment import (
    IniciarPagoRequest,
    IniciarPagoResponse,
    ConfirmarPagoRequest,
    ConfirmarPagoResponse,
)
from app.services import transbank_client

router = APIRouter()


@router.post(
    "/iniciar",
    response_model=IniciarPagoResponse,
    summary="Iniciar pago Transbank",
)
async def iniciar_pago(body: IniciarPagoRequest) -> IniciarPagoResponse:
    """Crea una transacción Webpay Plus y retorna la URL + token para redirigir al usuario."""
    try:
        result = transbank_client.iniciar_pago(
            id_flete=body.id_flete,
            monto=body.monto,
            return_url=body.return_url,
        )
        return IniciarPagoResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/confirmar",
    response_model=ConfirmarPagoResponse,
    summary="Confirmar pago Transbank",
)
async def confirmar_pago(body: ConfirmarPagoRequest) -> ConfirmarPagoResponse:
    """Confirma la transacción Webpay tras el redirect y actualiza el estado del pago."""
    try:
        result = transbank_client.confirmar_pago(token_ws=body.token_ws)
        return ConfirmarPagoResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))