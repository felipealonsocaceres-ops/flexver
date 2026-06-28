/**
 * Capa de API del Motor Analítico (Dashboard BI).
 *
 * Lee las métricas agregadas desde el backend protegido por rol 'administrador',
 * adjuntando el JWT de la sesión de Supabase. La agregación abarca TODA la
 * operación (sin RLS), por eso vive detrás del endpoint de admin y NO se
 * consulta a Supabase directamente desde el panel.
 */

import { supabase } from './supabase'

const API_URL =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

/** Espejo de PuntoAsignacion (analytics.py). */
export interface PuntoAsignacion {
  hora: number
  minutos_promedio: number
  muestras: number
}

/** Espejo de PuntoSLAKyc (analytics.py). */
export interface PuntoSLAKyc {
  semana: string // ISO date (YYYY-MM-DD)
  horas_promedio: number
  muestras: number
}

/** Espejo de ResumenOperativo (analytics.py). */
export interface ResumenOperativo {
  fletes_completados: number
  fletes_cancelados: number
  tasa_conversion: number
  comision_proyectada: number
}

/** Espejo de AnalyticsDashboard (analytics.py). */
export interface AnalyticsDashboard {
  resumen: ResumenOperativo
  sla_kyc_semanal: PuntoSLAKyc[]
  asignacion_por_hora: PuntoAsignacion[]
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Trae el payload completo del Dashboard BI en una sola petición. */
export async function getDashboardBI(): Promise<AnalyticsDashboard> {
  const res = await fetch(`${API_URL}/api/v1/analytics/dashboard`, {
    headers: { Accept: 'application/json', ...(await authHeaders()) },
  })
  if (!res.ok) throw new Error('No se pudieron cargar las métricas analíticas.')
  return (await res.json()) as AnalyticsDashboard
}
