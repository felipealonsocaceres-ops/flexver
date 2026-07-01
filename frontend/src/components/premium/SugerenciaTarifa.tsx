import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, Check } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Función Premium #2 — Sugerencia de Tarifa Dinámica                          */
/*  Mockeado: aparece con un delay de 1.5s bajo el monto/cotización con un      */
/*  análisis de mercado y un botón para "aplicar" la sugerencia de precio.      */
/* -------------------------------------------------------------------------- */

export default function SugerenciaTarifa({
  monto = 2500,
  onAplicar,
}: {
  monto?: number
  onAplicar?: (monto: number) => void
}) {
  const [visible, setVisible] = useState(false)
  const [aplicada, setAplicada] = useState(false)

  // Simula el análisis de mercado: aparece tras 1.5s.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const montoFmt = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="overflow-hidden"
        >
          <div className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-linear-to-br from-amber-500/10 via-primario/10 to-secundario/10 p-3.5 backdrop-blur-sm">
            {/* Brillo decorativo */}
            <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">
                  <TrendingUp className="h-3.5 w-3.5" /> Análisis de Mercado
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
                  Alta demanda en destino. Aumentar{' '}
                  <span className="font-bold text-white">{montoFmt}</span> a tu oferta acelerará la asignación en un{' '}
                  <span className="font-bold text-emerald-300">40%</span>.
                </p>

                {aplicada ? (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> Sugerencia aplicada
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setAplicada(true)
                      onAplicar?.(monto)
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition-transform hover:scale-[1.03]"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Aplicar sugerencia
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
