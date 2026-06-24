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

async function get<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
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

// --- Tarifas (motor de precios dinámico del backend) ---
export type CategoriaCarga = 'chica' | 'mediana' | 'grande'

// Espejo de TariffBreakdown (tariff.py)
export interface DesgloseTarifa {
  base_fija: number
  costo_distancia: number
  recargo_hora_punta: number
  recargo_festivo_demanda: number
}

// Espejo de TariffResponse (tariff.py)
export interface CotizacionResponse {
  tarifa_total: number
  moneda: string
  desglose: DesgloseTarifa
  estimado_id: string | null
}

// --- Fletes (orquestación / datos relacionados) ---
export interface ConductorPublico {
  nombre: string
  telefono: string | null
  rut: string | null
  calificacion: number | null
  total_calificaciones: number
}

export const freightsApi = {
  // Datos públicos del conductor asignado (corre con service-role, sin RLS).
  conductorDeFlete: (id_flete: string) =>
    get<ConductorPublico>(`/api/v1/freights/${id_flete}/conductor`),
}

export const tarifasApi = {
  // OJO: la ruta real es /api/v1/tariffs/calculate (no /api/tarifas/cotizar)
  cotizar: (body: {
    categoria: CategoriaCarga
    latitud_origen: number
    longitud_origen: number
    latitud_destino: number
    longitud_destino: number
  }) => post<CotizacionResponse>('/api/v1/tariffs/calculate', body),
}