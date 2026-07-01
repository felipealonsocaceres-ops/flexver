import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Truck } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Edge Case #2 — ETA Dinámico (estilo PedidosYa)                              */
/*  Tarjeta flotante destacada que aparece cuando el flete está 'asignado' o     */
/*  'en_curso'. Toma la duración real de Mapbox Directions (segundos), le suma   */
/*  un buffer de 10 min por tráfico y muestra la hora exacta de llegada.         */
/* -------------------------------------------------------------------------- */

const BUFFER_TRAFICO_MIN = 10

export default function EtaCard({ duracionSeg }: { duracionSeg: number | null | undefined }) {
  // Hora de referencia capturada una sola vez al montar (lazy init: la forma
  // idiomática de React para leer un valor impuro sin romper la pureza del render).
  const [montadoEn] = useState(() => Date.now())

  const { horaLlegada, minutosTotales } = useMemo(() => {
    if (duracionSeg == null) return { horaLlegada: null, minutosTotales: null }
    const minutos = Math.round(duracionSeg / 60) + BUFFER_TRAFICO_MIN
    const llegada = new Date(montadoEn + minutos * 60_000)
    const hh = llegada.getHours().toString().padStart(2, '0')
    const mm = llegada.getMinutes().toString().padStart(2, '0')
    return { horaLlegada: `${hh}:${mm}`, minutosTotales: minutos }
  }, [duracionSeg, montadoEn])

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="pointer-events-none absolute left-1/2 top-20 z-30 w-[88%] max-w-xs -translate-x-1/2 transform-gpu overflow-hidden rounded-2xl border border-emerald-400/30 bg-slate-900/80 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-2xl backdrop-saturate-150"
    >
      {/* Brillo decorativo */}
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/15 blur-2xl" />

      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
          {/* Camión con sutil halo en vivo */}
          <span className="absolute h-11 w-11 animate-ping rounded-xl bg-emerald-400/15" />
          <Truck className="relative h-5 w-5 text-emerald-300" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300">
            Tiempo estimado de llegada
          </p>
          {horaLlegada ? (
            <p className="mt-0.5 text-lg font-bold leading-tight text-white">
              Llegada estimada: {horaLlegada} hrs
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-medium leading-tight text-slate-300">
              Calculando ruta y tráfico…
            </p>
          )}
          {minutosTotales != null && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" /> ~{minutosTotales} min (incl. tráfico)
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
