import { motion } from 'framer-motion'
import { CheckCircle2, PartyPopper, CreditCard, Star, Phone, UserRound, XCircle } from 'lucide-react'
import { formatearPrecio } from '../../lib/calcularTarifa'
import { codigoDeFlete } from '../../lib/codigoEntrega'
import type { ConductorPublico } from '../../lib/api'

// Iniciales para el avatar a partir del nombre del conductor.
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'C'
}

/* -------------------------------------------------------------------------- */
/*  Tarjeta flotante de estado del viaje del cliente.                          */
/*  Refleja fletes.estado: buscando_conductor -> asignado -> entregado.        */
/* -------------------------------------------------------------------------- */
export interface EstadoViajeCardProps {
  estado: 'buscando_conductor' | 'asignado' | 'entregado'
  idFlete: string
  origenDir: string
  destinoDir: string
  distancia: number
  tarifaTotal: number | null
  pagando: boolean
  conductor: ConductorPublico | null
  onCancelar: () => void
  onPagar: () => void
  onCerrar: () => void
}

export default function EstadoViajeCard(props: EstadoViajeCardProps) {
  const { estado, idFlete, origenDir, destinoDir, distancia, tarifaTotal, pagando, conductor, onCancelar, onPagar, onCerrar } = props

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md space-y-4 rounded-t-3xl border border-white/15 bg-slate-900/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150 md:bottom-4 md:rounded-3xl"
    >
      {/* Encabezado dinámico */}
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          {estado === 'buscando_conductor' && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-primario/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primario border-r-secundario" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🚚</div>
            </>
          )}
          {estado === 'asignado' && (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
          )}
          {estado === 'entregado' && (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primario/20">
              <PartyPopper className="h-7 w-7 text-primario" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">
            {estado === 'buscando_conductor' && 'Buscando conductor…'}
            {estado === 'asignado' && '¡Conductor en camino!'}
            {estado === 'entregado' && '¡Viaje completado!'}
          </h2>
          <p className="truncate text-sm text-slate-300">
            {estado === 'buscando_conductor' && 'Conectándote con un conductor cercano.'}
            {estado === 'asignado' && 'Un conductor aceptó tu viaje.'}
            {estado === 'entregado' && 'Gracias por usar FlexVer.'}
          </p>
        </div>
      </div>

      {/* Tarjeta del conductor real (cuando ya fue asignado) */}
      {estado === 'asignado' && conductor && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primario to-secundario text-sm font-bold text-white">
            {iniciales(conductor.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
              <UserRound className="h-3.5 w-3.5 text-slate-400" />
              {conductor.nombre}
            </p>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {conductor.calificacion != null
                  ? `${conductor.calificacion} (${conductor.total_calificaciones})`
                  : 'Nuevo'}
              </span>
              {conductor.telefono && (
                <a href={`tel:${conductor.telefono}`} className="flex items-center gap-1 transition-colors hover:text-white">
                  <Phone className="h-3.5 w-3.5" />
                  {conductor.telefono}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Código de entrega (solo cuando hay conductor asignado) */}
      {estado === 'asignado' && (
        <div className="rounded-xl border border-primario/30 bg-primario/10 p-4 text-center">
          <p className="text-xs text-slate-300">Código de entrega — dáselo al conductor al llegar</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-white">{codigoDeFlete(idFlete)}</p>
        </div>
      )}

      {/* Resumen del viaje */}
      <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <Linea label="Origen" value={origenDir || '—'} />
        <Linea label="Destino" value={destinoDir || '—'} />
        <Linea label="Distancia" value={`${distancia} km`} />
        {tarifaTotal !== null && (
          <div className="mt-1 flex justify-between border-t border-white/10 pt-1">
            <span className="font-medium text-slate-300">Total estimado</span>
            <span className="font-bold text-primario">{formatearPrecio(tarifaTotal)}</span>
          </div>
        )}
      </div>

      {estado !== 'entregado' && <p className="text-xs text-slate-500">El pago se realizará al finalizar el viaje.</p>}

      {/* Acciones */}
      {estado === 'entregado' ? (
        <div className="space-y-2">
          <button
            onClick={onPagar}
            disabled={pagando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-bold text-white shadow-lg shadow-primario/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard className="h-5 w-5" />
            {pagando ? 'Redirigiendo a Transbank…' : 'Pagar viaje'}
          </button>
          <button
            onClick={onCerrar}
            disabled={pagando}
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white disabled:opacity-50"
          >
            Pagar más tarde
          </button>
        </div>
      ) : (
        <button
          onClick={onCancelar}
          className={
            estado === 'buscando_conductor'
              ? // Botón de cristal elegante mientras se busca conductor.
                'flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3 font-semibold text-slate-200 backdrop-blur-md transition-colors hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-300'
              : 'flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3 font-bold text-red-400 transition-colors hover:bg-red-500/20'
          }
        >
          <XCircle className="h-5 w-5" />
          {estado === 'buscando_conductor' ? 'Cancelar Solicitud' : 'Cancelar viaje'}
        </button>
      )}
    </motion.div>
  )
}

function Linea({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate text-right text-white">{value}</span>
    </div>
  )
}
