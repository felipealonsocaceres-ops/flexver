import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Flag, Package, X } from 'lucide-react'
import { formatearPrecio } from '../../lib/calcularTarifa'
import { buscarDirecciones, type SugerenciaDireccion } from '../../lib/geo'
import type { DesgloseTarifa } from '../../lib/api'

/* -------------------------------------------------------------------------- */
/*  Buscador de direcciones con autocompletado (limitado a la RM vía lib/geo). */
/* -------------------------------------------------------------------------- */
function BuscadorDireccion({
  placeholder,
  valorInicial,
  onSeleccionar,
}: {
  placeholder: string
  valorInicial: string
  onSeleccionar: (direccion: string, lng: number, lat: number) => void
}) {
  const [query, setQuery] = useState(valorInicial)
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([])
  const [seleccionado, setSeleccionado] = useState(Boolean(valorInicial))
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setQuery(valor)
    setSeleccionado(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setSugerencias(await buscarDirecciones(valor))
    }, 350)
  }

  const handleSeleccionar = (sug: SugerenciaDireccion) => {
    setQuery(sug.place_name)
    setSeleccionado(true)
    setSugerencias([])
    onSeleccionar(sug.place_name, sug.center[0], sug.center[1])
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primario ${
          seleccionado ? 'border-emerald-400/60' : 'border-white/15'
        }`}
      />
      {sugerencias.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSeleccionar(sug)}
              className="flex w-full items-start gap-2 border-b border-white/5 px-3 py-2.5 text-left text-[13px] text-slate-300 transition-colors last:border-0 hover:bg-primario/20 hover:text-white"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>{sug.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Indicador de pasos                                                          */
/* -------------------------------------------------------------------------- */
function StepPills({ paso }: { paso: 1 | 2 | 3 }) {
  const pasos = [
    { n: 1, label: 'Origen', icon: MapPin },
    { n: 2, label: 'Destino', icon: Flag },
    { n: 3, label: 'Carga', icon: Package },
  ] as const
  return (
    <div className="grid grid-cols-3 gap-2">
      {pasos.map(({ n, label, icon: Icon }) => {
        const activo = paso === n
        const completado = paso > n
        return (
          <div
            key={n}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activo
                ? 'bg-linear-to-r from-primario to-secundario text-white'
                : completado
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/5 text-slate-400'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {n}. {label}
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Wizard de solicitud (modal flotante inferior). Presentacional: el estado    */
/*  vive en PanelCliente para que el mapa pueda dibujar marcadores y la ruta.   */
/* -------------------------------------------------------------------------- */
export interface WizardProps {
  paso: 1 | 2 | 3
  setPaso: (p: 1 | 2 | 3) => void
  origenDir: string
  origenSel: boolean
  destinoDir: string
  destinoSel: boolean
  descripcion: string
  setDescripcion: (v: string) => void
  volumen: number
  setVolumen: (v: number) => void
  distancia: number
  cotizando: boolean
  desglose: DesgloseTarifa | null
  tarifaTotal: number | null
  error: string
  loading: boolean
  onSeleccionarOrigen: (dir: string, lng: number, lat: number) => void
  onSeleccionarDestino: (dir: string, lng: number, lat: number) => void
  onConfirmar: () => void
  onCerrar: () => void
}

export default function WizardSolicitud(props: WizardProps) {
  const {
    paso, setPaso,
    origenDir, origenSel,
    destinoDir, destinoSel,
    descripcion, setDescripcion,
    volumen, setVolumen,
    distancia, cotizando, desglose, tarifaTotal, error, loading,
    onSeleccionarOrigen, onSeleccionarDestino, onConfirmar, onCerrar,
  } = props

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md rounded-t-3xl border border-white/15 bg-slate-900/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150 md:bottom-4 md:rounded-3xl"
    >
      {/* Encabezado */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Solicitar flete</h2>
          <p className="text-xs text-slate-400">Completa los 3 pasos para confirmar</p>
        </div>
        <button
          onClick={onCerrar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <StepPills paso={paso} />

      <div className="mt-4 space-y-4">
        {/* PASO 1 — Origen */}
        {paso === 1 && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-white">Punto de origen</h3>
              <p className="text-xs text-slate-400">Busca la dirección o haz clic en el mapa</p>
            </div>
            <BuscadorDireccion
              placeholder="Buscar dirección de origen (ej: Sodimac, Santiago)"
              valorInicial={origenDir}
              onSeleccionar={onSeleccionarOrigen}
            />
            {origenSel && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{origenDir || 'Origen seleccionado'}</span>
              </div>
            )}
            <button
              onClick={() => setPaso(2)}
              disabled={!origenSel}
              className="w-full rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </>
        )}

        {/* PASO 2 — Destino */}
        {paso === 2 && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-white">Punto de destino</h3>
              <p className="text-xs text-slate-400">Busca la dirección o haz clic en el mapa</p>
            </div>
            <BuscadorDireccion
              placeholder="Buscar dirección de destino (ej: Obra en Maipú)"
              valorInicial={destinoDir}
              onSeleccionar={onSeleccionarDestino}
            />
            {destinoSel && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <Flag className="h-3.5 w-3.5" />
                <span className="truncate">{destinoDir || 'Destino seleccionado'}</span>
              </div>
            )}
            {distancia > 0 && (
              <div className="rounded-lg border border-secundario/30 bg-secundario/10 px-3 py-2 text-xs text-blue-300">
                Distancia aproximada: <span className="font-bold text-white">{distancia} km</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaso(1)}
                className="rounded-xl border border-white/15 bg-white/5 py-3 font-medium text-slate-300 transition-colors hover:text-white"
              >
                Volver
              </button>
              <button
                onClick={() => setPaso(3)}
                disabled={!destinoSel}
                className="rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* PASO 3 — Carga + cotización */}
        {paso === 3 && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-white">Descripción de la carga</h3>
              <p className="text-xs text-slate-400">Detalla qué se va a transportar</p>
            </div>
            <textarea
              placeholder="Ej: Sacos de cemento, materiales de construcción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primario"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Volumen aproximado (m³)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={volumen}
                onChange={(e) => setVolumen(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primario"
              />
            </div>

            {cotizando && (
              <div className="rounded-xl border border-secundario/30 bg-secundario/10 p-3 text-xs text-slate-300">
                Calculando tarifa (distancia real + recargos)…
              </div>
            )}

            {!cotizando && desglose && tarifaTotal !== null && (
              <div className="space-y-2 rounded-xl border border-secundario/30 bg-secundario/10 p-4">
                <h4 className="text-xs font-semibold text-blue-300">Cotización dinámica</h4>
                <div className="space-y-1 text-xs text-slate-300">
                  <Row label="Distancia" value={`${distancia} km`} />
                  <Row label="Tarifa base" value={formatearPrecio(desglose.base_fija)} />
                  <Row label="Por distancia" value={formatearPrecio(desglose.costo_distancia)} />
                  {desglose.recargo_hora_punta > 0 && (
                    <Row label="Recargo hora punta ⏰" value={`+${formatearPrecio(desglose.recargo_hora_punta)}`} accent />
                  )}
                  {desglose.recargo_festivo_demanda > 0 && (
                    <Row label="Recargo festivo/demanda 📅" value={`+${formatearPrecio(desglose.recargo_festivo_demanda)}`} accent />
                  )}
                  <div className="mt-1 flex justify-between border-t border-white/10 pt-2">
                    <span className="font-bold text-white">Total estimado</span>
                    <span className="text-base font-bold text-primario">{formatearPrecio(tarifaTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaso(2)}
                className="rounded-xl border border-white/15 bg-white/5 py-3 font-medium text-slate-300 transition-colors hover:text-white"
              >
                Volver
              </button>
              <button
                onClick={onConfirmar}
                disabled={loading || !descripcion || tarifaTotal === null}
                className="rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Solicitando…' : 'Confirmar solicitud'}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={accent ? 'text-amber-300' : ''}>{label}</span>
      <span className={accent ? 'text-amber-300' : 'text-white'}>{value}</span>
    </div>
  )
}
