/**
 * Flujo anti-fraude — Deuda pendiente por "Pago Contra Entrega" / "Pagar Después".
 *
 * Persistimos el estado en localStorage para que la restricción sobreviva a
 * recargas, y sincronizamos las distintas partes de la UI (banner + botón
 * "Nuevo Flete") mediante un evento custom en `window`. Así cualquier componente
 * que use `useDeuda()` se entera al instante cuando se genera o se regulariza.
 */

import { useEffect, useState } from 'react'

export type MetodoPago = 'online' | 'contra_entrega' | 'pagar_despues'

export interface EstadoDeuda {
  pendiente: boolean
  monto: number
}

const STORAGE_KEY = 'flexver_deuda'
const EVENT = 'flexver:deuda'
const SIN_DEUDA: EstadoDeuda = { pendiente: false, monto: 0 }

function leer(): EstadoDeuda {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SIN_DEUDA
    const data = JSON.parse(raw) as EstadoDeuda
    return data?.pendiente ? { pendiente: true, monto: data.monto ?? 0 } : SIN_DEUDA
  } catch {
    return SIN_DEUDA
  }
}

function escribir(estado: EstadoDeuda) {
  if (estado.pendiente) localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  else localStorage.removeItem(STORAGE_KEY)
  // Notifica a todas las instancias de useDeuda en esta pestaña.
  window.dispatchEvent(new CustomEvent(EVENT))
}

/** Registra una deuda pendiente (flete entregado sin pago anticipado). */
export function registrarDeuda(monto: number) {
  escribir({ pendiente: true, monto })
}

/** Limpia la deuda (simula la regularización del pago). */
export function limpiarDeuda() {
  escribir(SIN_DEUDA)
}

/** Hook reactivo: devuelve el estado de deuda y un atajo para regularizarla. */
export function useDeuda() {
  const [deuda, setDeuda] = useState<EstadoDeuda>(leer)

  useEffect(() => {
    const refrescar = () => setDeuda(leer())
    window.addEventListener(EVENT, refrescar)
    // 'storage' cubre el caso de otras pestañas.
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener(EVENT, refrescar)
      window.removeEventListener('storage', refrescar)
    }
  }, [])

  return { deuda, regularizar: limpiarDeuda }
}
