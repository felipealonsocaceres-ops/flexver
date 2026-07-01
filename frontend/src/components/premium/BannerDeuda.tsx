import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Edge Case #4 — Banner de cuenta restringida por pago pendiente             */
/*  Banner rojo de cristal que bloquea visualmente la cuenta mientras exista    */
/*  una deuda. El botón "Regularizar Pago" simula el cobro y limpia la deuda.    */
/* -------------------------------------------------------------------------- */

function formatearCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto)
}

export default function BannerDeuda({
  monto,
  onRegularizar,
}: {
  monto: number
  onRegularizar: () => void
}) {
  const [procesando, setProcesando] = useState(false)

  const handleRegularizar = () => {
    setProcesando(true)
    // Simula el cobro (Transbank) antes de liberar la cuenta.
    setTimeout(() => {
      setProcesando(false)
      onRegularizar()
    }, 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -28 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="absolute left-1/2 top-4 z-40 w-[94%] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-red-400/40 bg-red-950/50 p-4 shadow-2xl shadow-red-900/40 backdrop-blur-2xl backdrop-saturate-150"
    >
      {/* Brillo de alerta */}
      <span className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 animate-pulse rounded-full bg-red-500/20 blur-2xl" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">
              ⚠️ Tienes un pago pendiente de {formatearCLP(monto)}.
            </p>
            <p className="text-xs text-red-200/80">Tu cuenta está restringida hasta regularizarlo.</p>
          </div>
        </div>

        <button
          onClick={handleRegularizar}
          disabled={procesando}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {procesando ? 'Procesando…' : 'Regularizar Pago'}
        </button>
      </div>
    </motion.div>
  )
}
