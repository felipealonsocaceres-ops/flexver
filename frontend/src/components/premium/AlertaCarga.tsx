import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudRain, X, Clock } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Función Premium #4 — Alerta Contextual de Carga (Meteorológica)             */
/*  Mockeado: tarjeta temporal que flota sobre el mapa durante un viaje activo, */
/*  avisando del clima en destino y recomendando proteger los materiales.       */
/* -------------------------------------------------------------------------- */

export default function AlertaCarga({ activo }: { activo: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!activo) return
    // Aparece poco después de iniciar el viaje (sensación contextual).
    const t = setTimeout(() => setVisible(true), 2500)
    return () => {
      clearTimeout(t)
      setVisible(false)
    }
  }, [activo])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="absolute left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-sky-400/30 bg-slate-900/75 p-4 shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150 md:left-auto md:right-6 md:translate-x-0"
        >
          {/* Brillo frío decorativo */}
          <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-400/15 blur-2xl" />

          <div className="flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
              <CloudRain className="h-5 w-5 text-sky-300" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-300">Alerta Meteorológica</p>
                <button
                  onClick={() => setVisible(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
                Riesgo de <span className="font-semibold text-white">lluvia ligera</span> en destino. Recuerda cubrir
                los materiales (cemento/yeso) con carpa.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <Clock className="h-3.5 w-3.5" /> ETA ajustado +8 min
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
