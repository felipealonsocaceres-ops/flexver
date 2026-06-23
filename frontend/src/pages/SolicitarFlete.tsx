import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calcularTarifa, formatearPrecio } from '../lib/calcularTarifa'
import Mapa from '../components/Mapa'
import type { Tarifa } from '../types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface Sugerencia {
  place_name: string
  center: [number, number]
}

function BuscadorDireccion({
  placeholder,
  onSeleccionar,
}: {
  placeholder: string
  onSeleccionar: (direccion: string, lng: number, lat: number) => void
}) {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [seleccionado, setSeleccionado] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = async (texto: string) => {
    if (texto.length < 3) {
      setSugerencias([])
      return
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texto)}.json?access_token=${MAPBOX_TOKEN}&country=CL&language=es&limit=5`

    const res = await fetch(url)
    const data = await res.json()

    if (data.features) {
      setSugerencias(
        data.features.map((f: { place_name: string; center: [number, number] }) => ({
          place_name: f.place_name,
          center: f.center,
        }))
      )
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setQuery(valor)
    setSeleccionado('')

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => buscar(valor), 400)
  }

  const handleSeleccionar = (sug: Sugerencia) => {
    setQuery(sug.place_name)
    setSeleccionado(sug.place_name)
    setSugerencias([])
    onSeleccionar(sug.place_name, sug.center[0], sug.center[1])
  }

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '10px',
          boxSizing: 'border-box',
          border: seleccionado ? '2px solid #22c55e' : '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
        }}
      />

      {sugerencias.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {sugerencias.map((sug, i) => (
            <div
              key={i}
              onClick={() => handleSeleccionar(sug)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: i < sugerencias.length - 1 ? '1px solid #f3f4f6' : 'none',
                color: '#374151',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              {sug.place_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SolicitarFlete() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [origenDir, setOrigenDir] = useState('')
  const [origenLat, setOrigenLat] = useState<number | null>(null)
  const [origenLng, setOrigenLng] = useState<number | null>(null)

  const [destinoDir, setDestinoDir] = useState('')
  const [destinoLat, setDestinoLat] = useState<number | null>(null)
  const [destinoLng, setDestinoLng] = useState<number | null>(null)

  const [descripcion, setDescripcion] = useState('')
  const [volumen, setVolumen] = useState<number>(0)
  const [distancia, setDistancia] = useState<number>(0)

  useEffect(() => {
    const cargarTarifa = async () => {
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')
        .eq('vigente', true)
        .single()

      if (!error && data) setTarifa(data)
    }
    cargarTarifa()
  }, [])

  const calcularDistancia = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10
  }

  const handleSeleccionarOrigen = (dir: string, lng: number, lat: number) => {
    setOrigenDir(dir)
    setOrigenLat(lat)
    setOrigenLng(lng)
    if (destinoLat && destinoLng) {
      setDistancia(calcularDistancia(lat, lng, destinoLat, destinoLng))
    }
  }

  const handleSeleccionarDestino = (dir: string, lng: number, lat: number) => {
    setDestinoDir(dir)
    setDestinoLat(lat)
    setDestinoLng(lng)
    if (origenLat && origenLng) {
      setDistancia(calcularDistancia(origenLat, origenLng, lat, lng))
    }
  }

  const handleMapaOrigen = (lng: number, lat: number) => {
    setOrigenLat(lat)
    setOrigenLng(lng)
    if (destinoLat && destinoLng) {
      setDistancia(calcularDistancia(lat, lng, destinoLat, destinoLng))
    }
  }

  const handleMapaDestino = (lng: number, lat: number) => {
    setDestinoLat(lat)
    setDestinoLng(lng)
    if (origenLat && origenLng) {
      setDistancia(calcularDistancia(origenLat, origenLng, lat, lng))
    }
  }

  const handleSubmit = async () => {
    if (!user || !tarifa || !origenLat || !destinoLat) return
    setLoading(true)
    setError('')

    const monto = calcularTarifa(tarifa, distancia, volumen)

    const { error } = await supabase.from('fletes').insert({
      id_usuario: user.id,
      id_tarifa: tarifa.id_tarifa,
      origen_direccion: origenDir,
      origen_lat: origenLat,
      origen_lng: origenLng,
      destino_direccion: destinoDir,
      destino_lat: destinoLat,
      destino_lng: destinoLng,
      descripcion_carga: descripcion,
      distancia_km: distancia,
      monto_total: monto,
      estado: 'pendiente',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/home')
  }

  const montoCotizado = tarifa && distancia > 0
    ? calcularTarifa(tarifa, distancia, volumen)
    : null

  const botonStyle = (activo: boolean) => ({
    padding: '12px',
    background: activo ? '#2563eb' : '#e5e7eb',
    color: activo ? 'white' : '#6b7280',
    border: 'none',
    borderRadius: '8px',
    cursor: activo ? 'pointer' : 'not-allowed',
    fontWeight: 'bold' as const,
  })

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>Solicitar Flete</h1>

      {/* Indicador de pasos */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {[1, 2, 3].map((p) => (
          <div
            key={p}
            style={{
              flex: 1,
              padding: '10px',
              textAlign: 'center',
              background: paso === p ? '#2563eb' : paso > p ? '#22c55e' : '#e5e7eb',
              color: paso >= p ? 'white' : '#6b7280',
              borderRadius: '8px',
              fontWeight: 'bold',
            }}
          >
            {p === 1 ? '1. Origen' : p === 2 ? '2. Destino' : '3. Carga'}
          </div>
        ))}
      </div>

      {/* PASO 1 - Origen */}
      {paso === 1 && (
        <div>
          <h2>Punto de origen</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Busca la direccion o haz clic en el mapa
          </p>

          <BuscadorDireccion
            placeholder="Buscar direccion de origen (ej: Ferreteria Central, Santiago)"
            onSeleccionar={handleSeleccionarOrigen}
          />

          <Mapa
            modo="origen"
            onSeleccionarOrigen={handleMapaOrigen}
            origenLat={origenLat ?? undefined}
            origenLng={origenLng ?? undefined}
          />

          {origenLat && (
            <p style={{ color: '#22c55e', marginTop: '10px', fontSize: '13px' }}>
              Origen seleccionado: {origenDir || `${origenLat.toFixed(4)}, ${origenLng?.toFixed(4)}`}
            </p>
          )}

          <button
            onClick={() => setPaso(2)}
            disabled={!origenLat}
            style={{ marginTop: '20px', width: '100%', ...botonStyle(!!origenLat) }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* PASO 2 - Destino */}
      {paso === 2 && (
        <div>
          <h2>Punto de destino</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Busca la direccion o haz clic en el mapa
          </p>

          <BuscadorDireccion
            placeholder="Buscar direccion de destino (ej: Obra en construccion, Maipu)"
            onSeleccionar={handleSeleccionarDestino}
          />

          <Mapa
            modo="destino"
            onSeleccionarDestino={handleMapaDestino}
            origenLat={origenLat ?? undefined}
            origenLng={origenLng ?? undefined}
            destinoLat={destinoLat ?? undefined}
            destinoLng={destinoLng ?? undefined}
          />

          {destinoLat && (
            <p style={{ color: '#22c55e', marginTop: '10px', fontSize: '13px' }}>
              Destino seleccionado: {destinoDir || `${destinoLat.toFixed(4)}, ${destinoLng?.toFixed(4)}`}
            </p>
          )}

          {distancia > 0 && (
            <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px' }}>
              Distancia aproximada: {distancia} km
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setPaso(1)}
              style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
            >
              Volver
            </button>
            <button
              onClick={() => setPaso(3)}
              disabled={!destinoLat}
              style={{ flex: 2, ...botonStyle(!!destinoLat) }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 - Carga */}
      {paso === 3 && (
        <div>
          <h2>Descripcion de la carga</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>
              Descripcion
            </label>
            <textarea
              placeholder="Ej: Sacos de cemento, materiales de construccion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>
              Volumen aproximado (m3)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={volumen}
              onChange={(e) => setVolumen(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
          </div>

          {montoCotizado && tarifa && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0369a1', fontSize: '15px' }}>Cotizacion estimada</h3>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Distancia: {distancia} km</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Volumen: {volumen} m3</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Precio base: {formatearPrecio(tarifa.precio_base)}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Por distancia: {formatearPrecio(tarifa.precio_por_km * distancia)}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Por volumen: {formatearPrecio(tarifa.precio_por_m3 * volumen)}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #bae6fd', margin: '10px 0' }} />
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#0369a1' }}>
                Total: {formatearPrecio(montoCotizado)}
              </p>
            </div>
          )}

          {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setPaso(2)}
              style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
            >
              Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !descripcion}
              style={{
                flex: 2,
                padding: '12px',
                background: descripcion ? '#22c55e' : '#e5e7eb',
                color: descripcion ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: descripcion ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Solicitando...' : 'Confirmar solicitud'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}