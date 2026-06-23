import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatearPrecio } from '../lib/calcularTarifa'
import type { Flete, Usuario } from '../types'

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  pendiente:           { label: 'Pendiente',          color: '#6b7280' },
  buscando_conductor:  { label: 'Buscando conductor', color: '#d97706' },
  asignado:            { label: 'Asignado',           color: '#2563eb' },
  en_camino:           { label: 'En camino',          color: '#7c3aed' },
  carga_recogida:      { label: 'Carga recogida',     color: '#0891b2' },
  entregado:           { label: 'Entregado ✓',        color: '#16a34a' },
  cancelado:           { label: 'Cancelado',          color: '#dc2626' },
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [fletes, setFletes] = useState<Flete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const cargarDatos = async () => {
      // Cargar perfil
      const { data: perfilData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', user.id)
        .single()

      if (perfilData) setPerfil(perfilData)

      // Cargar fletes del usuario
      const { data: fletesData } = await supabase
        .from('fletes')
        .select('*')
        .eq('id_usuario', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (fletesData) setFletes(fletesData)
      setLoading(false)
    }

    cargarDatos()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const nombreCorto = perfil?.nombre_completo?.split(' ')[0] ?? 'Usuario'

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen">

      {/* Navbar */}
      <nav style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid #2d2d4e' }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl"></span>
          <span className="text-white font-bold text-xl">FlexVer</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Hola, {nombreCorto}</span>
          <button
            onClick={handleLogout}
            style={{ borderColor: '#2d2d4e' }}
            className="text-slate-400 hover:text-white text-sm border px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Bienvenida */}
        <div style={{ background: 'linear-gradient(135deg, #7c3aed22, #2563eb22)', border: '1px solid #6e1f2e' }}
          className="rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Bienvenido, {nombreCorto} 
          </h1>
          <p className="text-slate-400 text-sm">
            Gestiona tus envíos y solicita fletes desde aquí.
          </p>
          <button
            onClick={() => navigate('/solicitar')}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            className="mt-4 px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            + Solicitar nuevo flete
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Total fletes',
              value: fletes.length,
              icon: '📦'
            },
            {
              label: 'En curso',
              value: fletes.filter(f => ['asignado', 'en_camino', 'carga_recogida'].includes(f.estado)).length,
              icon: '🚛'
            },
            {
              label: 'Completados',
              value: fletes.filter(f => f.estado === 'entregado').length,
              icon: '✅'
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
              className="rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Lista de fletes */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Mis fletes recientes</h2>

          {fletes.length === 0 ? (
            <div
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
              className="rounded-xl p-10 text-center"
            >
              <div className="text-4xl mb-3"></div>
              <p className="text-slate-400">Aún no tienes fletes registrados.</p>
              <button
                onClick={() => navigate('/solicitar')}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                className="mt-4 px-5 py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition-all text-sm"
              >
                Solicitar mi primer flete
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {fletes.map((flete) => {
                const badge = ESTADO_BADGE[flete.estado] ?? { label: flete.estado, color: '#6b7280' }
                return (
                  <div
                    key={flete.id_flete}
                    style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
                    className="rounded-xl p-5 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          style={{ backgroundColor: badge.color + '22', color: badge.color, border: `1px solid ${badge.color}44` }}
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                        >
                          {badge.label}
                        </span>
                        <span className="text-slate-600 text-xs">
                          {new Date(flete.created_at).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium truncate">
                         {flete.origen_direccion}
                      </p>
                      <p className="text-slate-400 text-sm truncate">
                         {flete.destino_direccion}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {flete.distancia_km} km · {flete.descripcion_carga}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-violet-400 font-bold text-lg">
                        {formatearPrecio(flete.monto_total)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}