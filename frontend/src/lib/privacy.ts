/**
 * Capa de privacidad del frontend (Ley 21.719).
 *
 * Espeja la versión vigente de la política (fuente de verdad en el backend:
 * `app/core/consent.py`) y centraliza las llamadas a los endpoints de
 * consentimiento, adjuntando siempre el JWT de la sesión de Supabase.
 */

import { supabase } from './supabase'

// Espejo de POLICY_VERSION del backend. Si cambia allá, actualiza aquí.
export const POLICY_VERSION = '1.0'

const API_URL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export type TipoConsentimiento = 'terminos_y_politica' | 'marketing' | 'telemetria_historial'

export interface EstadoConsentimiento {
  tipo: TipoConsentimiento
  otorgado: boolean
  version_politica: string | null
  creado_en: string | null
}

export interface ConsentStatusResponse {
  estados: EstadoConsentimiento[]
  version_politica_vigente: string
  version_politica_aceptada: string | null
  requiere_reconsentimiento: boolean
}

// Etiquetas legibles por capas (transparencia sin muros de texto).
export const CONSENT_LABELS: Record<TipoConsentimiento, { titulo: string; resumen: string; obligatorio: boolean }> = {
  terminos_y_politica: {
    titulo: 'Términos y Política de Privacidad',
    resumen: 'Base contractual para prestarte el servicio. Es obligatorio y no puede desactivarse mientras tengas cuenta.',
    obligatorio: true,
  },
  marketing: {
    titulo: 'Comunicaciones de marketing',
    resumen: 'Novedades, promociones y consejos por correo. Opcional: puedes activarlo o desactivarlo cuando quieras.',
    obligatorio: false,
  },
  telemetria_historial: {
    titulo: 'Historial de telemetría',
    resumen: 'Conservar tu historial de ubicación para métricas y mejoras. Opcional y revocable; no afecta los viajes activos.',
    obligatorio: false,
  },
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Lee el estado actual de consentimiento del usuario autenticado. */
export async function getMisConsentimientos(): Promise<ConsentStatusResponse> {
  const res = await fetch(`${API_URL}/api/v1/consentimientos/me`, {
    headers: { Accept: 'application/json', ...(await authHeaders()) },
  })
  if (!res.ok) throw new Error('No se pudo consultar el consentimiento.')
  return res.json()
}

/** Registra un evento inmutable de consentimiento (otorga o revoca). */
export async function registrarConsentimiento(tipo: TipoConsentimiento, otorgado: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/consentimientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ tipo, otorgado }),
  })
  if (!res.ok) throw new Error('No se pudo registrar tu preferencia.')
}
