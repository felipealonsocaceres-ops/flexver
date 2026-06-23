"""Cliente Transbank Webpay Plus para ambiente de integración (Sandbox).

Credenciales de prueba públicas proporcionadas por Transbank:
  Commerce Code : 597055555532
  API Key       : 579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
"""

from transbank.webpay.webpay_plus.transaction import Transaction
from transbank.common.integration_type import IntegrationType
from transbank.common.options import WebpayOptions

from app.core.config import settings


def get_transaction() -> Transaction:
    """Retorna una instancia de Transaction configurada para Sandbox."""
    return Transaction(
        WebpayOptions(
            commerce_code=settings.TRANSBANK_COMMERCE_CODE,
            api_key=settings.TRANSBANK_API_KEY,
            integration_type=IntegrationType.TEST,
        )
    )


def iniciar_pago(id_flete: str, monto: int, return_url: str) -> dict:
    """Crea una transacción en Transbank y retorna la URL de pago y el token."""
    tx = get_transaction()

    buy_order = f"flete-{id_flete[:8]}"
    session_id = f"session-{id_flete[:8]}"

    response = tx.create(
        buy_order=buy_order,
        session_id=session_id,
        amount=monto,
        return_url=return_url,
    )

    return {
        "url": response["url"],
        "token": response["token"],
    }


def confirmar_pago(token_ws: str) -> dict:
    """Confirma una transacción Transbank usando el token retornado por Webpay."""
    tx = get_transaction()
    response = tx.commit(token_ws)

    estado = "completado" if response["response_code"] == 0 else "fallido"

    return {
        "estado": estado,
        "monto": response.get("amount"),
        "orden": response.get("buy_order"),
        "codigo_autorizacion": response.get("authorization_code"),
        "tipo_pago": response.get("payment_type_code"),
        "cuotas": response.get("installments_number"),
    }