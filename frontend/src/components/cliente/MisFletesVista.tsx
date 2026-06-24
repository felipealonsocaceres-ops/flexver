import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Truck, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatearPrecio } from '../../lib/calcularTarifa'
import type { Flete } from '../../types'

const ESTADO_BADGE: Record<string, { label: string; clazz: string }> = {
  pendiente: { label: 'Pendiente', clazz: 'bg-slate-500/15 text-slate-300 border-slate-400/20' },
  buscando_conductor: { label: 'Buscando conductor', clazz: 'bg-amber-500/15 text-amber-300 border-amber-400/20' },
  asignado: { label: 'Asignado', clazz: 'bg-secundario/15 text-blue-300 border-blue-400/20' },
  en_camino: { label: 'En camino', clazz: 'bg-primario/15 text-violet-300 border-violet-400/20' },
  carga_recogida: { label: 'Carga recogida', clazz: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20' },
  entregado: { label: 'Entregado ✓', clazz: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
  cancelado: { label: 'Cancelado', clazz: 'bg-red-500/15 text-red-300 border-red-400/20' },
}

export default function MisFletesVista() {
  const { user } = useAuth()
  const [fletes, setFletes] = useState<Flete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('fletes')
      .select('*')
      .eq('id_usuario', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setFletes(data)
        setLoading(false)
      })
  }, [user])

  const stats = [
    { label: 'Total fletes', value: fletes.length, icon: Package, accent: 'bg-secundario/15 text-blue-300' },
    {
      label: 'En curso',
      value: fletes.filter((f) => ['asignado', 'en_camino', 'carga_recogida'].includes(f.estado)).length,
      icon: Truck,
      accent: 'bg-primario/15 text-violet-300',
    },
    {
      label: 'Completados',
      value: fletes.filter((f) => f.estado === 'entregado').length,
      icon: CheckCircle2,
      accent: 'bg-emerald-500/15 text-emerald-300',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-gray-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-md md:p-8"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white">Mis Fletes</h2>
        <p className="mt-1 text-sm text-slate-400">Historial de tus solicitudes</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Fletes recientes</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : fletes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
            Aún no tienes fletes. Usa “Solicitar nuevo flete” para empezar.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {fletes.map((flete) => {
              const badge = ESTADO_BADGE[flete.estado] ?? { label: flete.estado, clazz: 'bg-slate-500/15 text-slate-300 border-slate-400/20' }
              return (
                <li key={flete.id_flete} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.clazz}`}>{badge.label}</span>
                      <span className="text-[11px] text-slate-500">{new Date(flete.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-white">{flete.origen_direccion}</p>
                    <p className="truncate text-xs text-slate-400">→ {flete.destino_direccion}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{flete.distancia_km} km · {flete.descripcion_carga}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primario">{formatearPrecio(flete.monto_total)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </motion.section>
  )
}
