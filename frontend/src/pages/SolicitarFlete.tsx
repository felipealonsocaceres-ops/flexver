import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calcularTarifa, formatearPrecio } from '../lib/calcularTarifa'
import Mapa from '../components/Mapa'
import type { Tarifa } from '../types'

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

  const handleSeleccionarOrigen = (lng: number, lat: number) => {
    setOrigenLat(lat)
    setOrigenLng(lng)
    if (destinoLat && destinoLng) {
      setDistancia(calcularDistancia(lat, lng, destinoLat, destinoLng))
    }
  }

  const handleSeleccionarDestino = (lng: number, lat: number) => {
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

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🚚 Solicitar Flete</h1>

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

      {paso === 1 && (
        <div>
          <h2>📍 Selecciona el punto de origen</h2>
          <p style={{ color: '#6b7280' }}>Haz clic en el mapa para marcar el origen</p>

          <input
            type="text"
            placeholder="Descripción del origen (ej: Ferretería Central, Santiago)"
            value={origenDir}
            onChange={(e) => setOrigenDir(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '16px', boxSizing: 'border-box' }}
          />

          <Mapa
            modo="origen"
            onSeleccionarOrigen={handleSeleccionarOrigen}
            origenLat={origenLat ?? undefined}
            origenLng={origenLng ?? undefined}
          />

          {origenLat && (
            <p style={{ color: '#22c55e', marginTop: '10px' }}>
              ✅ Origen seleccionado: {origenLat.toFixed(4)}, {origenLng?.toFixed(4)}
            </p>
          )}

          <button
            onClick={() => setPaso(2)}
            disabled={!origenLat || !origenDir}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              background: origenLat && origenDir ? '#2563eb' : '#e5e7eb',
              color: origenLat && origenDir ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: origenLat && origenDir ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {paso === 2 && (
        <div>
          <h2>🏁 Selecciona el punto de destino</h2>
          <p style={{ color: '#6b7280' }}>Haz clic en el mapa para marcar el destino</p>

          <input
            type="text"
            placeholder="Descripción del destino (ej: Obra en construcción, Maipú)"
            value={destinoDir}
            onChange={(e) => setDestinoDir(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '16px', boxSizing: 'border-box' }}
          />

          <Mapa
            modo="destino"
            onSeleccionarDestino={handleSeleccionarDestino}
            origenLat={origenLat ?? undefined}
            origenLng={origenLng ?? undefined}
            destinoLat={destinoLat ?? undefined}
            destinoLng={destinoLng ?? undefined}
          />

          {destinoLat && (
            <p style={{ color: '#22c55e', marginTop: '10px' }}>
               Destino seleccionado: {destinoLat.toFixed(4)}, {destinoLng?.toFixed(4)}
            </p>
          )}

          {distancia > 0 && (
            <p style={{ color: '#2563eb', fontWeight: 'bold' }}>
              📏 Distancia aproximada: {distancia} km
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setPaso(1)}
              style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
            >
              ← Volver
            </button>
            <button
              onClick={() => setPaso(3)}
              disabled={!destinoLat || !destinoDir}
              style={{
                flex: 2,
                padding: '12px',
                background: destinoLat && destinoDir ? '#2563eb' : '#e5e7eb',
                color: destinoLat && destinoDir ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: destinoLat && destinoDir ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div>
          <h2>📦 Descripción de la carga</h2>

          <div style={{ marginBottom: '16px' }}>
            <label>Descripción de la carga</label>
            <textarea
              placeholder="Ej: Sacos de cemento, materiales de construcción, etc."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px', marginTop: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Volumen aproximado (m³)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={volumen}
              onChange={(e) => setVolumen(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px', marginTop: '6px', boxSizing: 'border-box' }}
            />
          </div>

          {montoCotizado && tarifa && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>💰 Cotización estimada</h3>
              <p style={{ margin: '4px 0' }}>📍 Distancia: {distancia} km</p>
              <p style={{ margin: '4px 0' }}>📦 Volumen: {volumen} m³</p>
              <p style={{ margin: '4px 0' }}>🏷️ Precio base: {formatearPrecio(tarifa.precio_base)}</p>
              <p style={{ margin: '4px 0' }}>🛣️ Por distancia: {formatearPrecio(tarifa.precio_por_km * distancia)}</p>
              <p style={{ margin: '4px 0' }}>📦 Por volumen: {formatearPrecio(tarifa.precio_por_m3 * volumen)}</p>
              <hr />
              <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', fontSize: '18px', color: '#0369a1' }}>
                Total: {formatearPrecio(montoCotizado)}
              </p>
            </div>
          )}

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setPaso(2)}
              style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
            >
              ← Volver
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
              {loading ? 'Solicitando...' : '✅ Confirmar solicitud'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}