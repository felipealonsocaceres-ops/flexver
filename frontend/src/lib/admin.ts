/**
 * Capa de API del Panel de Administración.
 *
 * Centraliza las llamadas a los endpoints protegidos por rol 'administrador',
 * adjuntando siempre el JWT de la sesión de Supabase. Las acciones sensibles
 * (firmar documentos KYC, aprobar/rechazar) viven en el backend con
 * service_role: el bucket `documentos-kyc` es privado y su RLS solo deja leer
 * al dueño, por lo que el admin NO puede firmar esas URLs desde el cliente.
 */

import { supabase } from './supabase'

const API_URL =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

/** Documentos lógicos que el conductor sube en el onboarding. */
export type DocumentoKYC = 'carnet_frontal' | 'carnet_reverso' | 'licencia' | 'padron' | 'selfie'

/** Mapa documento -> Signed URL temporal. La selfie puede faltar (ya destruida). */
export type DocumentosKYC = Partial<Record<DocumentoKYC, string>>

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Firma las URLs temporales de los documentos KYC de un conductor. */
export async function getDocumentosKYC(idUsuario: string): Promise<DocumentosKYC> {
  const res = await fetch(`${API_URL}/api/v1/users/users/driver/${idUsuario}/documentos`, {
    headers: { Accept: 'application/json', ...(await authHeaders()) },
  })
  if (!res.ok) throw new Error('No se pudieron firmar los documentos del conductor.')
  const json = await res.json()
  return (json.documentos ?? {}) as DocumentosKYC
}

/**
 * Aprueba al conductor. El backend DESTRUYE la selfie cruda (minimización,
 * Ley 21.719) y deja el semáforo en 'aprobado' con identidad_confirmada = true.
 */
export async function aprobarConductor(idUsuario: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/users/users/driver/${idUsuario}/aprobar`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(await authHeaders()) },
  })
  if (!res.ok) throw new Error('No se pudo aprobar al conductor.')
}

/** Rechaza al conductor, opcionalmente con un motivo (queda registrado). */
export async function rechazarConductor(idUsuario: string, motivo?: string): Promise<void> {
  const form = new FormData()
  if (motivo) form.append('motivo', motivo)
  const res = await fetch(`${API_URL}/api/v1/users/users/driver/${idUsuario}/rechazar`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(await authHeaders()) },
    body: form,
  })
  if (!res.ok) throw new Error('No se pudo rechazar al conductor.')
}
