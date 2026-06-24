import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

interface MapaProps {
  origenLng?: number
  origenLat?: number
  destinoLng?: number
  destinoLat?: number
  // Tercer parámetro opcional: dirección resuelta por reverse geocoding al arrastrar.
  onSeleccionarOrigen?: (lng: number, lat: number, direccion?: string) => void
  onSeleccionarDestino?: (lng: number, lat: number, direccion?: string) => void
  modo: 'origen' | 'destino' | 'ver'
}

/* -------------------------------------------------------------------------- */
/*  Reverse Geocoding: convierte [lng, lat] en un texto de dirección legible.  */
/*  Encapsulado y con try/catch: si la red falla devuelve null y no rompe el   */
/*  mapa (el llamador simplemente se queda con las coordenadas).               */
/* -------------------------------------------------------------------------- */
async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&country=CL&language=es&limit=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Geocoding respondió HTTP ${res.status}`)
    const data = await res.json()
    return data.features?.[0]?.place_name ?? null
  } catch (err) {
    console.error('Reverse geocoding falló:', err)
    return null
  }
}

export default function Mapa(props: MapaProps) {
  const {
    origenLng,
    origenLat,
    destinoLng,
    destinoLat,
    onSeleccionarOrigen,
    onSeleccionarDestino,
    modo,
  } = props

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerOrigen = useRef<mapboxgl.Marker | null>(null)
  const markerDestino = useRef<mapboxgl.Marker | null>(null)

  /* ------------------------------------------------------------------------ */
  /*  Crea un marcador ARRASTRABLE. Al soltarlo (dragend) lee sus coordenadas, */
  /*  las convierte en dirección (reverse geocoding) y avisa al componente.    */
  /* ------------------------------------------------------------------------ */
  const crearMarcadorArrastrable = (
    lng: number,
    lat: number,
    color: string,
    onMover: (lng: number, lat: number, direccion?: string) => void
  ): mapboxgl.Marker => {
    const marcador = new mapboxgl.Marker({ color, draggable: true }).setLngLat([lng, lat])

    marcador.on('dragend', async () => {
      const pos = marcador.getLngLat()
      const direccion = await reverseGeocode(pos.lng, pos.lat)
      onMover(pos.lng, pos.lat, direccion ?? undefined)
    })

    return marcador
  }

  useEffect(() => {
    if (!mapContainer.current) {
      return
    }

    const nuevoMapa = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-70.6483, -33.4569],
      zoom: 11,
    })

    map.current = nuevoMapa

    nuevoMapa.addControl(new mapboxgl.NavigationControl())

    nuevoMapa.on('click', (e) => {
      const lng = e.lngLat.lng
      const lat = e.lngLat.lat

      if (modo === 'origen' && onSeleccionarOrigen) {
        if (markerOrigen.current) {
          markerOrigen.current.remove()
        }
        markerOrigen.current = crearMarcadorArrastrable(lng, lat, '#22c55e', onSeleccionarOrigen)
        markerOrigen.current.addTo(nuevoMapa)
        // Al hacer clic ya conocemos las coordenadas; resolvemos la dirección en paralelo.
        reverseGeocode(lng, lat).then((dir) => onSeleccionarOrigen(lng, lat, dir ?? undefined))
      }

      if (modo === 'destino' && onSeleccionarDestino) {
        if (markerDestino.current) {
          markerDestino.current.remove()
        }
        markerDestino.current = crearMarcadorArrastrable(lng, lat, '#ef4444', onSeleccionarDestino)
        markerDestino.current.addTo(nuevoMapa)
        reverseGeocode(lng, lat).then((dir) => onSeleccionarDestino(lng, lat, dir ?? undefined))
      }
    })

    return () => {
      nuevoMapa.remove()
    }
  }, [])

  useEffect(() => {
    const mapaActual = map.current
    if (!mapaActual) {
      return
    }

    if (origenLat && origenLng) {
      if (markerOrigen.current) {
        markerOrigen.current.remove()
      }
      // Con callback → arrastrable; sin callback (modo "ver") → marcador fijo.
      markerOrigen.current = onSeleccionarOrigen
        ? crearMarcadorArrastrable(origenLng, origenLat, '#22c55e', onSeleccionarOrigen)
        : new mapboxgl.Marker({ color: '#22c55e' }).setLngLat([origenLng, origenLat])
      markerOrigen.current.addTo(mapaActual)
    }

    if (destinoLat && destinoLng) {
      if (markerDestino.current) {
        markerDestino.current.remove()
      }
      markerDestino.current = onSeleccionarDestino
        ? crearMarcadorArrastrable(destinoLng, destinoLat, '#ef4444', onSeleccionarDestino)
        : new mapboxgl.Marker({ color: '#ef4444' }).setLngLat([destinoLng, destinoLat])
      markerDestino.current.addTo(mapaActual)
    }
  }, [origenLat, origenLng, destinoLat, destinoLng])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '400px', borderRadius: '8px' }}
    />
  )
}
