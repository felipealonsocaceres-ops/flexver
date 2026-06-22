import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

interface MapaProps {
  origenLng?: number
  origenLat?: number
  destinoLng?: number
  destinoLat?: number
  onSeleccionarOrigen?: (lng: number, lat: number) => void
  onSeleccionarDestino?: (lng: number, lat: number) => void
  modo: 'origen' | 'destino' | 'ver'
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
        const nuevoMarcador = new mapboxgl.Marker({ color: '#22c55e' })
        nuevoMarcador.setLngLat([lng, lat])
        nuevoMarcador.addTo(nuevoMapa)
        markerOrigen.current = nuevoMarcador
        onSeleccionarOrigen(lng, lat)
      }

      if (modo === 'destino' && onSeleccionarDestino) {
        if (markerDestino.current) {
          markerDestino.current.remove()
        }
        const nuevoMarcador = new mapboxgl.Marker({ color: '#ef4444' })
        nuevoMarcador.setLngLat([lng, lat])
        nuevoMarcador.addTo(nuevoMapa)
        markerDestino.current = nuevoMarcador
        onSeleccionarDestino(lng, lat)
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
      const nuevoMarcador = new mapboxgl.Marker({ color: '#22c55e' })
      nuevoMarcador.setLngLat([origenLng, origenLat])
      nuevoMarcador.addTo(mapaActual)
      markerOrigen.current = nuevoMarcador
    }

    if (destinoLat && destinoLng) {
      if (markerDestino.current) {
        markerDestino.current.remove()
      }
      const nuevoMarcador = new mapboxgl.Marker({ color: '#ef4444' })
      nuevoMarcador.setLngLat([destinoLng, destinoLat])
      nuevoMarcador.addTo(mapaActual)
      markerDestino.current = nuevoMarcador
    }
  }, [origenLat, origenLng, destinoLat, destinoLng])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '400px', borderRadius: '8px' }}
    />
  )
}