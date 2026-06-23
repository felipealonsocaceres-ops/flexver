/**
 * Cliente HTTP para comunicarse con el backend FlexVer (FastAPI).
 * Centraliza la URL base y los métodos de cada dominio.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error en el servidor')
  }

  return response.json()
}

// --- Pagos ---
export const pagosApi = {
  iniciar: (id_flete: string, monto: number) =>
    post<{ url: string; token: string }>('/api/v1/payments/iniciar', {
      id_flete,
      monto,
      return_url: `${window.location.origin}/pago/confirmar`,
    }),

  confirmar: (token_ws: string) =>
    post<{
      estado: string
      monto: number
      orden: string
      codigo_autorizacion: string
    }>('/api/v1/payments/confirmar', { token_ws }),
}