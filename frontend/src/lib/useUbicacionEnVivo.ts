/**
 * Hook de ubicación física en tiempo real (GPS del dispositivo).
 *
 * Envuelve navigator.geolocation.watchPosition para seguir la posición real del
 * usuario de forma continua y reactiva. Se usa para pintar el "punto azul" del
 * cliente en el mapa (igual que el camioncito del conductor), de modo que sepa
 * dónde está parado físicamente antes de confirmar el origen del flete.
 *
 * - Devuelve `null` hasta el primer fix (o si el permiso es denegado).
 * - Limpia el watcher en el cleanup para no fugar suscripciones del navegador.
 */
import { useEffect, useState } from 'react'

export interface PosicionEnVivo {
  lng: number
  lat: number
  accuracy: number // precisión del fix en metros (radio de incertidumbre)
}

export function useUbicacionEnVivo(activo = true): PosicionEnVivo | null {
  const [posicion, setPosicion] = useState<PosicionEnVivo | null>(null)

  useEffect(() => {
    if (!activo || !('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setPosicion({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
        }),
      // Silencioso: el cliente puede no haber concedido el permiso; no rompemos la UI.
      (err) => console.warn('watchPosition (ubicación en vivo) falló:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [activo])

  return posicion
}
