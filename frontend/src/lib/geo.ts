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
export type RutaFeature = {
  type: 'Feature'
  properties: Record<string, unknown>
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
/*  Directions API: ruta real (siguiendo calles) entre origen y destino.       */
/*  Devuelve null si falla; el llamador decide el respaldo (línea recta).       */
/* -------------------------------------------------------------------------- */
export async function obtenerRutaGeoJSON(
  origen: [number, number],
  destino: [number, number],
): Promise<RutaFeature | null> {
  try {
    const coords = `${origen[0]},${origen[1]};${destino[0]},${destino[1]}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.routes?.[0]) return null
    return { type: 'Feature', properties: {}, geometry: data.routes[0].geometry }
  } catch (e) {
    console.error('Directions API falló:', e)
    return null
  }
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
