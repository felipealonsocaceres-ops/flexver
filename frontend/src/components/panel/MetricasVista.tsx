import { motion } from 'framer-motion'
import { Star, Award, TrendingUp, ThumbsUp } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Mocks — simulan las tablas `calificaciones` y agregados de `fletes`         */
/* -------------------------------------------------------------------------- */

// calificaciones.puntaje (1-5) → promedio simulado del conductor.
const PUNTAJE_PROMEDIO = 4.8
const TOTAL_CALIFICACIONES = 213

// Distribución de estrellas (cuántas calificaciones por puntaje).
const DISTRIBUCION = [
  { estrellas: 5, cantidad: 178 },
  { estrellas: 4, cantidad: 26 },
  { estrellas: 3, cantidad: 6 },
  { estrellas: 2, cantidad: 2 },
  { estrellas: 1, cantidad: 1 },
]

// Volumen de trabajo semanal (fletes completados por día) — barras de progreso.
const VOLUMEN_SEMANAL = [
  { dia: 'Lun', fletes: 5 },
  { dia: 'Mar', fletes: 7 },
  { dia: 'Mié', fletes: 4 },
  { dia: 'Jue', fletes: 8 },
  { dia: 'Vie', fletes: 9 },
  { dia: 'Sáb', fletes: 6 },
  { dia: 'Dom', fletes: 2 },
]

const MAX_FLETES = Math.max(...VOLUMEN_SEMANAL.map((d) => d.fletes))

/* -------------------------------------------------------------------------- */
/*  Sub-componente: fila de estrellas                                           */
/* -------------------------------------------------------------------------- */

function Estrellas({ puntaje }: { puntaje: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i <= Math.round(puntaje) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
          }`}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vista principal                                                             */
/* -------------------------------------------------------------------------- */

export default function MetricasVista() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-gray-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-md md:p-8"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white">Mis Métricas</h2>
        <p className="mt-1 text-sm text-slate-400">Tu desempeño según las calificaciones de clientes</p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ---------------------- Puntaje promedio ---------------------- */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-primario/15 to-secundario/10 p-6 backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15">
            <Award className="h-6 w-6 text-amber-300" />
          </span>
          <p className="mt-3 text-5xl font-bold text-white">{PUNTAJE_PROMEDIO.toFixed(1)}</p>
          <div className="mt-2">
            <Estrellas puntaje={PUNTAJE_PROMEDIO} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Basado en {TOTAL_CALIFICACIONES} calificaciones
          </p>
        </div>

        {/* ---------------- Distribución de calificaciones ---------------- */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ThumbsUp className="h-4 w-4 text-slate-400" />
            Distribución de puntajes
          </h3>
          <div className="flex flex-col gap-2.5">
            {DISTRIBUCION.map((row) => {
              const pct = Math.round((row.cantidad / TOTAL_CALIFICACIONES) * 100)
              return (
                <div key={row.estrellas} className="flex items-center gap-2">
                  <span className="flex w-8 items-center gap-0.5 text-xs text-slate-400">
                    {row.estrellas} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-400/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-400">{row.cantidad}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ------------------ Volumen de trabajo semanal ------------------ */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Volumen de trabajo semanal
          </h3>
          <span className="text-xs text-slate-400">
            {VOLUMEN_SEMANAL.reduce((a, d) => a + d.fletes, 0)} fletes esta semana
          </span>
        </div>

        {/* Barras verticales hechas solo con Tailwind */}
        <div className="flex h-40 items-end justify-between gap-2 sm:gap-4">
          {VOLUMEN_SEMANAL.map((d) => (
            <div key={d.dia} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-medium text-slate-300">{d.fletes}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.fletes / MAX_FLETES) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full rounded-t-lg bg-linear-to-t from-secundario to-primario"
              />
              <span className="text-[11px] text-slate-400">{d.dia}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
