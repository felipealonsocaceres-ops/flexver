import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Repeat, X, MapPin } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Función Premium #3 — Radar de Retorno Inteligente                           */
/*  Mockeado: modal que se dispara al finalizar un viaje y ofrece un flete de   */
/*  retorno cercano para que el conductor no vuelva con el camión vacío.        */
/* -------------------------------------------------------------------------- */

export default function RadarRetorno({
  open,
  onVerFlete,
  onCerrar,
}: {
  open: boolean
  onVerFlete: () => void
  onCerrar: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-70 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-slate-900/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-2xl backdrop-saturate-150"
          >
            {/* Halo radar de fondo */}
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/15 blur-3xl" />
            <span className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-primario/20 blur-3xl" />

            <button
              onClick={onCerrar}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Ícono radar pulsante */}
            <div className="mb-4 flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center">
                <span className="absolute h-12 w-12 animate-ping rounded-full bg-amber-400/30" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/40">
                  <Zap className="h-6 w-6 text-white" />
                </span>
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">Oportunidad detectada</p>
                <h3 className="text-base font-bold text-white">Retorno Inteligente</h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-200">
              Una <span className="font-semibold text-white">ferretería a 2 km</span> necesita enviar carga hacia tu{' '}
              <span className="font-semibold text-white">comuna de origen</span>. ¿Ver flete de retorno para no volver
              vacío?
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>Ferretería El Maestro · 2 km de tu posición actual</span>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={onCerrar}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Ahora no
              </button>
              <button
                onClick={onVerFlete}
                className="flex flex-2 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-transform hover:scale-[1.02]"
              >
                <Repeat className="h-4 w-4" /> Ver flete de retorno
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
