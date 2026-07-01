import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, X, Route, TrendingUp, Fuel, PiggyBank, Gauge, Target, Loader2 } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Función Premium #5 — Billetera Inteligente y Eficiencia                      */
/*  Mockeado: drawer lateral con métricas financieras de la semana. Las cifras  */
/*  son ficticias pero matemáticamente exactas según la realidad chilena:       */
/*  Gasto Diésel = (km / 7 km·L) * $1.397/L → para 320 km = $63.862.            */
/* -------------------------------------------------------------------------- */

// --- Parámetros base (realidad operativa Chile) ----------------------------
const KILOMETROS = 320
const INGRESOS_BRUTOS = 245000
const RENDIMIENTO_KM_L = 7 // km por litro (camión diésel mediano)
const PRECIO_DIESEL = 1397 // CLP por litro
const HORAS_TRABAJADAS = 21
const META_SEMANAL = 400000

// --- Derivados (fórmulas exactas) ------------------------------------------
const LITROS = KILOMETROS / RENDIMIENTO_KM_L
const GASTO_DIESEL = Math.floor(LITROS * PRECIO_DIESEL) // 63.862
const GANANCIA_NETA = INGRESOS_BRUTOS - GASTO_DIESEL // 181.138
const EFICIENCIA_HORA = Math.floor(GANANCIA_NETA / HORAS_TRABAJADAS) // 8.625
const PROGRESO_META = Math.min(100, (GANANCIA_NETA / META_SEMANAL) * 100) // 45.28%

function clp(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function Metrica({
  icon: Icon,
  label,
  valor,
  sub,
  tono = 'neutral',
}: {
  icon: typeof Route
  label: string
  valor: string
  sub?: string
  tono?: 'neutral' | 'rojo' | 'verde'
}) {
  const color =
    tono === 'rojo' ? 'text-red-400' : tono === 'verde' ? 'text-emerald-400' : 'text-white'
  const iconBg =
    tono === 'rojo' ? 'bg-red-500/15 text-red-400' : tono === 'verde' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-300'
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{valor}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

export default function BilleteraInteligente({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cargando, setCargando] = useState(true)
  const [barra, setBarra] = useState(0)

  // Simula la "sincronización" de datos financieros al abrir.
  useEffect(() => {
    if (!open) return
    const t1 = setTimeout(() => setCargando(false), 900)
    // Anima la barra de progreso hacia el valor real tras cargar.
    const t2 = setTimeout(() => setBarra(PROGRESO_META), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      // Restaura el estado de carga al cerrar para la próxima apertura.
      setCargando(true)
      setBarra(0)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-60 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer lateral derecho */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="absolute inset-y-0 right-0 z-61 flex w-full max-w-md flex-col overflow-hidden border-l border-white/20 bg-slate-900/85 shadow-2xl shadow-black/60 backdrop-blur-2xl backdrop-saturate-150"
          >
            {/* Encabezado */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
                <Wallet className="h-5 w-5 text-white" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">Mis Finanzas</h2>
                <p className="text-xs text-slate-400">Resumen inteligente de la semana</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-5">
              {cargando ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-primario" />
                  <p className="text-sm">Sincronizando tus movimientos…</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Ganancia neta destacada */}
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-linear-to-br from-emerald-500/15 via-primario/10 to-secundario/10 p-5">
                    <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl" />
                    <div className="flex items-center gap-2 text-emerald-300">
                      <PiggyBank className="h-4 w-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wide">Ganancia Neta Semanal</span>
                    </div>
                    <p className="mt-1.5 text-4xl font-extrabold text-emerald-400">{clp(GANANCIA_NETA)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {clp(INGRESOS_BRUTOS)} brutos − {clp(GASTO_DIESEL)} diésel
                    </p>
                  </div>

                  {/* Métricas en grilla */}
                  <div className="grid grid-cols-2 gap-3">
                    <Metrica icon={Route} label="Kilómetros" valor={`${KILOMETROS} km`} sub="Recorridos esta semana" />
                    <Metrica icon={TrendingUp} label="Ingresos Brutos" valor={clp(INGRESOS_BRUTOS)} sub="Antes de gastos" />
                    <Metrica
                      icon={Fuel}
                      label="Gasto Diésel"
                      valor={`-${clp(GASTO_DIESEL)}`}
                      sub={`${KILOMETROS} km ÷ ${RENDIMIENTO_KM_L} km/L × ${clp(PRECIO_DIESEL)}`}
                      tono="rojo"
                    />
                    <Metrica
                      icon={Gauge}
                      label="Eficiencia en Ruta"
                      valor={`${clp(EFICIENCIA_HORA)}/h`}
                      sub={`${HORAS_TRABAJADAS} h trabajadas`}
                      tono="verde"
                    />
                  </div>

                  {/* Barra de progreso de cristal: neta vs meta semanal */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <Target className="h-4 w-4 text-primario" /> Meta semanal
                      </span>
                      <span className="text-xs font-bold text-white">{clp(META_SEMANAL)}</span>
                    </div>

                    {/* Pista de cristal */}
                    <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/15 bg-white/5 backdrop-blur-sm">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barra}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
                        className="relative h-full rounded-full bg-linear-to-r from-primario via-secundario to-emerald-400 shadow-lg shadow-primario/40"
                      >
                        {/* Reflejo de cristal */}
                        <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/25" />
                      </motion.div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-primario">{PROGRESO_META.toFixed(0)}% alcanzado</span>
                      <span className="text-slate-400">Faltan {clp(META_SEMANAL - GANANCIA_NETA)}</span>
                    </div>
                  </div>

                  <p className="px-1 text-center text-[10px] text-slate-600">
                    Datos demostrativos · cálculo de combustible basado en precio diésel referencial CLP.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
