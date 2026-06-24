import { motion } from 'framer-motion'
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Mocks — datos simulados que respetan el esquema (tabla `fletes`)            */
/*  Para la demo no hay backend; estos arrays se renderizan de inmediato.       */
/* -------------------------------------------------------------------------- */

interface FleteMock {
  id: string
  origen: string
  destino: string
  monto_total: number // fletes.monto_total
  estado: 'entregado' | 'en_curso' | 'pendiente' // fletes.estado
}

const FLETES_HOY: FleteMock[] = [
  { id: 'FL-1042', origen: 'Bodega Central, Quilicura', destino: 'Obra Las Condes', monto_total: 38500, estado: 'entregado' },
  { id: 'FL-1041', origen: 'Ferretería San Pablo', destino: 'Depto. Ñuñoa', monto_total: 22900, estado: 'entregado' },
  { id: 'FL-1040', origen: 'Mall Plaza Vespucio', destino: 'Maipú Centro', monto_total: 31200, estado: 'entregado' },
  { id: 'FL-1039', origen: 'Easy Américo Vespucio', destino: 'Providencia', monto_total: 18750, estado: 'en_curso' },
  { id: 'FL-1038', origen: 'Sodimac La Florida', destino: 'Puente Alto', monto_total: 27400, estado: 'pendiente' },
]

// Resumen calculado a partir de los fletes entregados (como lo haría el backend).
const ENTREGADOS = FLETES_HOY.filter((f) => f.estado === 'entregado')
const INGRESOS_HOY = ENTREGADOS.reduce((acc, f) => acc + f.monto_total, 0)

const formatCLP = (valor: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor)

/* -------------------------------------------------------------------------- */
/*  Sub-componente: tarjeta de resumen rápido                                   */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Etiqueta de estado del flete                                                */
/* -------------------------------------------------------------------------- */

const ESTADO_BADGE: Record<FleteMock['estado'], { label: string; clazz: string }> = {
  entregado: { label: 'Entregado', clazz: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
  en_curso: { label: 'En curso', clazz: 'bg-secundario/15 text-blue-300 border-blue-400/20' },
  pendiente: { label: 'Pendiente', clazz: 'bg-amber-500/15 text-amber-300 border-amber-400/20' },
}

/* -------------------------------------------------------------------------- */
/*  Vista principal                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardVista() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-gray-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-md md:p-8"
    >
      {/* Encabezado */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">Resumen de tu jornada de hoy</p>
      </header>

      {/* Tarjetas de resumen rápido */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Ingresos de hoy"
          value={formatCLP(INGRESOS_HOY)}
          hint={`${ENTREGADOS.length} fletes entregados`}
          accent="bg-emerald-500/15 text-emerald-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Viajes completados"
          value={`${ENTREGADOS.length}`}
          hint="Hoy · meta diaria: 6"
          accent="bg-secundario/15 text-blue-300"
        />
        <StatCard
          icon={TrendingUp}
          label="Promedio por flete"
          value={formatCLP(Math.round(INGRESOS_HOY / Math.max(ENTREGADOS.length, 1)))}
          hint="+12% vs. ayer"
          accent="bg-primario/15 text-violet-300"
        />
      </div>

      {/* Últimos fletes realizados */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Clock className="h-4 w-4 text-slate-400" />
            Últimos fletes realizados
          </h3>
          <button className="flex items-center gap-1 text-xs font-medium text-blue-300 transition-colors hover:text-blue-200">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {FLETES_HOY.map((flete) => {
            const badge = ESTADO_BADGE[flete.estado]
            return (
              <li
                key={flete.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{flete.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.clazz}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-200">
                    <span className="text-slate-400">{flete.origen}</span>
                    <ArrowRight className="mx-1.5 inline h-3 w-3 text-slate-500" />
                    <span className="text-white">{flete.destino}</span>
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-white">{formatCLP(flete.monto_total)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </motion.section>
  )
}
