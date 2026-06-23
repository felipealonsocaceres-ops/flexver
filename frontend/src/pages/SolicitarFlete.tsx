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
    <div style={{ position: 'relative' }} className="mb-4">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        style={{
          backgroundColor: '#0f0f1a',
          borderColor: seleccionado ? '#22c55e' : '#2d2d4e',
          borderWidth: seleccionado ? '2px' : '1px',
          color: '#ffffff',
        }}
        className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
      />

      {sugerencias.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#1a1a2e',
            border: '1px solid #2d2d4e',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {sugerencias.map((sug, i) => (
            <div
              key={i}
              onClick={() => handleSeleccionar(sug)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: i < sugerencias.length - 1 ? '1px solid #2d2d4e' : 'none',
                color: '#cbd5e1',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2d2d4e'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#cbd5e1'
              }}
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

    const { data, error } = await supabase.from('fletes').insert({
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
    }).select()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/pago', {
      state: {
        id_flete: data[0].id_flete,
        monto: monto,
      }
    })
  }

  const montoCotizado = tarifa && distancia > 0
    ? calcularTarifa(tarifa, distancia, volumen)
    : null

  const btnPrimario = (activo: boolean) => ({
    background: activo ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#1a1a2e',
    color: activo ? '#ffffff' : '#4b5563',
    cursor: activo ? 'pointer' : 'not-allowed',
    border: activo ? 'none' : '1px solid #2d2d4e',
  })

  const pasoColor = (p: number) => {
    if (paso === p) return { background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#ffffff' }
    if (paso > p) return { backgroundColor: '#166534', color: '#ffffff' }
    return { backgroundColor: '#1a1a2e', color: '#6b7280', border: '1px solid #2d2d4e' }
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/home')}
            style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d4e', color: '#94a3b8' }}
            className="border px-4 py-2 rounded-lg text-sm hover:text-white transition-colors"
          >
            Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Solicitar Flete</h1>
            <p className="text-slate-500 text-sm">Completa los 3 pasos para confirmar tu solicitud</p>
          </div>
        </div>

        {/* Indicador de pasos */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { n: 1, label: '1. Origen' },
            { n: 2, label: '2. Destino' },
            { n: 3, label: '3. Carga' },
          ].map(({ n, label }) => (
            <div
              key={n}
              style={pasoColor(n)}
              className="py-3 rounded-xl text-center font-semibold text-sm transition-all"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
          className="rounded-2xl shadow-2xl p-6 space-y-4"
        >

          {/* PASO 1 - Origen */}
          {paso === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Punto de origen</h2>
                <p className="text-slate-500 text-sm">Busca la direccion o haz clic en el mapa</p>
              </div>

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
                <div
                  style={{ backgroundColor: '#0f2818', borderColor: '#166534' }}
                  className="border rounded-lg px-4 py-2"
                >
                  <p className="text-green-400 text-sm">
                    Origen seleccionado: {origenDir || `${origenLat.toFixed(4)}, ${origenLng?.toFixed(4)}`}
                  </p>
                </div>
              )}

              <button
                onClick={() => setPaso(2)}
                disabled={!origenLat}
                style={{ ...btnPrimario(!!origenLat) }}
                className="w-full py-3 rounded-xl font-semibold transition-all"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* PASO 2 - Destino */}
          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Punto de destino</h2>
                <p className="text-slate-500 text-sm">Busca la direccion o haz clic en el mapa</p>
              </div>

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
                <div
                  style={{ backgroundColor: '#0f2818', borderColor: '#166534' }}
                  className="border rounded-lg px-4 py-2"
                >
                  <p className="text-green-400 text-sm">
                    Destino seleccionado: {destinoDir || `${destinoLat.toFixed(4)}, ${destinoLng?.toFixed(4)}`}
                  </p>
                </div>
              )}

              {distancia > 0 && (
                <div
                  style={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca' }}
                  className="border rounded-lg px-4 py-2"
                >
                  <p className="text-blue-400 text-sm font-medium">
                    Distancia aproximada: <span className="text-white font-bold">{distancia} km</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaso(1)}
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#94a3b8' }}
                  className="py-3 rounded-xl border font-medium transition-all hover:text-white"
                >
                  Volver
                </button>
                <button
                  onClick={() => setPaso(3)}
                  disabled={!destinoLat}
                  style={btnPrimario(!!destinoLat)}
                  className="py-3 rounded-xl font-semibold transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* PASO 3 - Carga */}
          {paso === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Descripcion de la carga</h2>
                <p className="text-slate-500 text-sm">Detalla que se va a transportar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Descripcion</label>
                <textarea
                  placeholder="Ej: Sacos de cemento, materiales de construccion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Volumen aproximado (m3)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={volumen}
                  onChange={(e) => setVolumen(parseFloat(e.target.value) || 0)}
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Cotizacion */}
              {montoCotizado && tarifa && (
                <div
                  style={{ backgroundColor: '#1e1b4b', border: '1px solid #4338ca' }}
                  className="rounded-xl p-4 space-y-2"
                >
                  <h3 className="text-blue-400 font-semibold text-sm">Cotizacion estimada</h3>
                  <div className="space-y-1 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span>Distancia</span>
                      <span className="text-white">{distancia} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Precio base</span>
                      <span className="text-white">{formatearPrecio(tarifa.precio_base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Por distancia</span>
                      <span className="text-white">{formatearPrecio(tarifa.precio_por_km * distancia)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Por volumen</span>
                      <span className="text-white">{formatearPrecio(tarifa.precio_por_m3 * volumen)}</span>
                    </div>
                    <div
                      style={{ borderColor: '#4338ca' }}
                      className="border-t pt-2 flex justify-between"
                    >
                      <span className="text-white font-bold">Total estimado</span>
                      <span className="text-violet-400 font-bold text-lg">
                        {formatearPrecio(montoCotizado)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaso(2)}
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#94a3b8' }}
                  className="py-3 rounded-xl border font-medium transition-all hover:text-white"
                >
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !descripcion}
                  style={btnPrimario(!loading && !!descripcion)}
                  className="py-3 rounded-xl font-semibold transition-all"
                >
                  {loading ? 'Solicitando...' : 'Confirmar solicitud'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}