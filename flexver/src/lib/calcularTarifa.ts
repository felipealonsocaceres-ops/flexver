import type { Tarifa } from '../types'

export function calcularTarifa(
  tarifa: Tarifa,
  distancia_km: number,
  volumen_m3: number = 0
): number {
  const total =
    tarifa.precio_base +
    tarifa.precio_por_km * distancia_km +
    tarifa.precio_por_m3 * volumen_m3

  return Math.round(total)
}

export function formatearPrecio(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(monto)
}