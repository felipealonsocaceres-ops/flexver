import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatearPrecio } from '../lib/calcularTarifa'
import type { Flete, Usuario } from '../types'

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  pendiente:          { label: 'Pendiente',          color: '#6b7280' },
  buscando_conductor: { label: 'Buscando conductor', color: '#d97706' },
  asignado:           { label: 'Asignado',           color: '#2563eb' },
  en_camino:          { label: 'En camino',          color: '#7c3aed' },
  carga_recogida:     { label: 'Carga recogida',     color: '#0891b2' },
  entregado:          { label: 'Entregado',          color: '#16a34a' },
  cancelado:          { label: 'Cancelado',          color: '#dc2626' },
}

const ESTADOS_ACTIVOS = ['pendiente', 'buscando_conductor', 'asignado', 'en_camino', 'carga_recogida']
const ESTADOS_HISTORIAL = ['entregado', 'cancelado']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [fletes, setFletes] = useState<Flete[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'activos' | 'historial'>('activos')

  useEffect(() => {
    if (!user) return

    const cargarDatos = async () => {
      const { data: perfilData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', user.id)
        .single()

      if (perfilData) setPerfil(perfilData)

      const { data: fletesData } = await supabase
        .from('fletes')
        .select('*')
        .eq('id_usuario', user.id)
        .order('created_at', { ascending: false })

      if (fletesData) setFletes(fletesData)
      setLoading(false)
    }

    cargarDatos()

    // Suscripcion en tiempo real para actualizar estados
    const canal = supabase
      .channel('fletes_usuario')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fletes',
          filter: `id_usuario=eq.${user.id}`,
        },
        (payload) => {
          setFletes((prev) =>
            prev.map((f) =>
              f.id_flete === payload.new.id_flete
                ? { ...f, ...payload.new as Flete }
                : f
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const nombreCorto = perfil?.nombre_completo?.split(' ')[0] ?? 'Usuario'
  const fletesActivos = fletes.filter(f => ESTADOS_ACTIVOS.includes(f.estado))
  const fletesHistorial = fletes.filter(f => ESTADOS_HISTORIAL.includes(f.estado))
  const totalGastado = fletes
    .filter(f => f.estado === 'entregado')
    .reduce((acc, f) => acc + f.monto_total, 0)

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    )
  }

  const TarjetaFlete = ({ flete }: { flete: Flete }) => {
    const badge = ESTADO_BADGE[flete.estado] ?? { label: flete.estado, color: '#6b7280' }
    return (
      <div
        style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4e' }}
        className="rounded-xl p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                style={{
                  backgroundColor: badge.color + '22',
                  color: badge.color,
                  border: `1px solid ${badge.color}44`
                }}
                className="text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {badge.label}
              </span>
              <span className="text-slate-600 text-xs">
                {new Date(flete.created_at).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <div
                  style={{ backgroundColor: '#22c55e', minWidth: '8px', minHeight: '8px' }}
                  className="rounded-full mt-1.5"
                />
                <p className="text-white text-sm font-medium truncate">
                  {flete.origen_direccion}
                </p>
              </div>
              <div
                style={{ borderLeft: '1px dashed #2d2d4e', marginLeft: '3px', height: '12px' }}
              />
              <div className="flex items-start gap-2">
                <div
                  style={{ backgroundColor: '#ef4444', minWidth: '8px', minHeight: '8px' }}
                  className="rounded-full mt-1.5"
                />
                <p className="text-slate-400 text-sm truncate">
                  {flete.destino_direccion}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <span className="text-slate-600 text-xs">
                {flete.distancia_km} km
              </span>
              <span style={{ color: '#2d2d4e' }} className="text-xs">|</span>
              <span className="text-slate-600 text-xs truncate">
                {flete.descripcion_carga}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-violet-400 font-bold text-lg">
              {formatearPrecio(flete.monto_total)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen">

      {/* Navbar */}
      <nav
        style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid #2d2d4e' }}
        className="px-6 py-4 flex items-center justify-between"
      >
        <span className="text-white font-bold text-xl">FlexVer</span>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Hola, {nombreCorto}</span>
          <button
            onClick={handleLogout}
            style={{ borderColor: '#2d2d4e' }}
            className="text-slate-400 hover:text-white text-sm border px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesion
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Bienvenida */}
        <div
          style={{ background: 'linear-gradient(135deg, #7c3aed22, #2563eb22)', border: '1px solid #6e1f2e' }}
          className="rounded-2xl p-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">
            Bienvenido, {nombreCorto}
          </h1>
          <p className="text-slate-400 text-sm mb-4">
            Gestiona tus envios y solicita fletes desde aqui.
          </p>
          <button
            onClick={() => navigate('/solicitar')}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            className="px-6 py-2.5 text-white font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
          >
            Solicitar nuevo flete
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total fletes', value: fletes.length },
            { label: 'En curso', value: fletesActivos.length },
            { label: 'Total gastado', value: formatearPrecio(totalGastado) },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4e' }}
              className="rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div>
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4e' }}
            className="flex rounded-xl p-1 mb-4"
          >
            {(['activos', 'historial'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={tab === t
                  ? { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }
                  : { backgroundColor: 'transparent' }
                }
                className="flex-1 py-2 text-sm font-medium text-white rounded-lg transition-all capitalize"
              >
                {t === 'activos'
                  ? `Activos (${fletesActivos.length})`
                  : `Historial (${fletesHistorial.length})`
                }
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          {tab === 'activos' && (
            <div className="space-y-3">
              {fletesActivos.length === 0 ? (
                <div
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4e' }}
                  className="rounded-xl p-10 text-center"
                >
                  <p className="text-slate-400 mb-4">No tienes fletes activos en este momento.</p>
                  <button
                    onClick={() => navigate('/solicitar')}
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                    className="px-5 py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition-all text-sm"
                  >
                    Solicitar flete
                  </button>
                </div>
              ) : (
                fletesActivos.map(f => <TarjetaFlete key={f.id_flete} flete={f} />)
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-3">
              {fletesHistorial.length === 0 ? (
                <div
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4e' }}
                  className="rounded-xl p-10 text-center"
                >
                  <p className="text-slate-400">No tienes fletes completados aun.</p>
                </div>
              ) : (
                fletesHistorial.map(f => <TarjetaFlete key={f.id_flete} flete={f} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}