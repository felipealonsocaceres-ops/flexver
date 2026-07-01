/**
 * Utilidades de geolocalización y mapas compartidas entre el panel del cliente
 * y el del conductor. Centraliza el geocoding (limitado a la Región
 * Metropolitana), el reverse geocoding y el cálculo de la ruta real por calles.
 */

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

// Bounding box de la Región Metropolitana de Santiago: minLon,minLat,maxLon,maxLat.
// Mapbox FILTRA los resultados a esta caja (a diferencia de `proximity`, que solo
// los ordena). Por eso "sodimac" ya no devuelve Antofagasta ni Ñuble.
export const RM_BBOX = '-71.7,-34.3,-69.8,-32.9'

// Centro aproximado de Santiago (lng, lat). Lo usamos como centro inicial del mapa
// y como `proximity` para priorizar resultados cercanos dentro de la RM.
export const RM_CENTER: [number, number] = [-70.6483, -33.4569]

export interface SugerenciaDireccion {
  place_name: string
  center: [number, number] // [lng, lat]
}

// Feature GeoJSON de una ruta (LineString). Tipo local porque el proyecto no
// tiene instalado @types/geojson y así evitamos depender del namespace global.
// `properties` transporta la telemetría real de Mapbox Directions:
//   - duration: duración estimada del trayecto en segundos.
//   - distance: distancia total de la ruta en metros.
export type RutaFeature = {
  type: 'Feature'
  properties: { duration?: number; distance?: number } & Record<string, unknown>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

/* -------------------------------------------------------------------------- */
/*  Forward geocoding: texto -> sugerencias de direcciones (solo RM).          */
/* -------------------------------------------------------------------------- */
export async function buscarDirecciones(texto: string): Promise<SugerenciaDireccion[]> {
  if (texto.trim().length < 3) return []
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texto)}.json` +
      `?access_token=${TOKEN}&country=cl&language=es&limit=5` +
      `&bbox=${RM_BBOX}&proximity=${RM_CENTER[0]},${RM_CENTER[1]}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`)
    const data = await res.json()
    return (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
      place_name: f.place_name,
      center: f.center,
    }))
  } catch (err) {
    console.error('Forward geocoding falló:', err)
    return []
  }
}

/* -------------------------------------------------------------------------- */
/*  Reverse geocoding: [lng, lat] -> texto legible (para clics en el mapa).    */
/* -------------------------------------------------------------------------- */
export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&country=cl&language=es&limit=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Reverse geocoding HTTP ${res.status}`)
    const data = await res.json()
    return data.features?.[0]?.place_name ?? null
  } catch (err) {
    console.error('Reverse geocoding falló:', err)
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Directions API con múltiples puntos (waypoints): traza UNA sola línea        */
/*  continua que pasa, en orden, por cada coordenada entregada.                  */
/*  Ej: [conductor, origen, destino] => camión -> recogida -> entrega.           */
/*  Devuelve null si falla; el llamador decide el respaldo (línea recta).        */
/* -------------------------------------------------------------------------- */
export async function obtenerRutaMultiPunto(
  puntos: [number, number][],
): Promise<RutaFeature | null> {
  if (puntos.length < 2) return null
  try {
    const coords = puntos.map(([lng, lat]) => `${lng},${lat}`).join(';')
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.routes?.[0]) return null
    const ruta = data.routes[0]
    // Conservamos duration (s) y distance (m) reales para el ETA dinámico.
    return {
      type: 'Feature',
      properties: { duration: ruta.duration, distance: ruta.distance },
      geometry: ruta.geometry,
    }
  } catch (e) {
    console.error('Directions API falló:', e)
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Directions API: ruta real (siguiendo calles) entre origen y destino.        */
/*  Atajo de dos puntos sobre obtenerRutaMultiPunto.                             */
/* -------------------------------------------------------------------------- */
export function obtenerRutaGeoJSON(
  origen: [number, number],
  destino: [number, number],
): Promise<RutaFeature | null> {
  return obtenerRutaMultiPunto([origen, destino])
}

/* -------------------------------------------------------------------------- */
/*  Geolocalización del dispositivo: Promesa sobre navigator.geolocation.        */
/*  Traduce los códigos de error del navegador a mensajes legibles en español    */
/*  para que la UI pueda mostrarlos de forma elegante.                           */
/* -------------------------------------------------------------------------- */
export interface UbicacionActual {
  lng: number
  lat: number
}

export function obtenerUbicacionActual(): Promise<UbicacionActual> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu navegador no soporta geolocalización.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => {
        // GeolocationPositionError: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        const mensajes: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Actívalo en tu navegador.',
          2: 'No pudimos determinar tu ubicación. Revisa tu señal GPS.',
          3: 'La búsqueda de ubicación tardó demasiado. Inténtalo de nuevo.',
        }
        reject(new Error(mensajes[err.code] ?? 'No se pudo obtener tu ubicación.'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

/* -------------------------------------------------------------------------- */
/*  Rumbo (bearing) en grados [0,360) desde el norte, de A hacia B.            */
/*  Sirve para orientar el marcador del vehículo según su dirección de avance.  */
/* -------------------------------------------------------------------------- */
export function bearingDeg(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLon = toRad(lng2 - lng1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/* -------------------------------------------------------------------------- */
/*  Distancia en km entre dos coordenadas (fórmula de Haversine).              */
/* -------------------------------------------------------------------------- */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}
