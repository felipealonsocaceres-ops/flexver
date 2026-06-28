import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  ShieldX,
  X,
  Loader2,
  Inbox,
  RefreshCw,
  ScanFace,
  AlertTriangle,
  FileImage,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import {
  getDocumentosKYC,
  aprobarConductor,
  rechazarConductor,
  type DocumentosKYC,
  type DocumentoKYC,
} from '../../lib/admin'

/* -------------------------------------------------------------------------- */
/*  Validación KYC — la prioridad operativa del panel.                          */
/*  Lista los conductores en 'en_revision', y al seleccionar uno abre un panel  */
/*  lateral que firma y renderiza sus documentos desde el bucket privado, con   */
/*  las acciones Aprobar (destruye la selfie) y Rechazar.                        */
/* -------------------------------------------------------------------------- */

/** Fila de la cola de revisión: conductor + datos del usuario embebidos. */
interface SolicitanteKYC {
  id_conductor: string
  id_usuario: string
  rut: string
  patente: string | null
  capacidad_m3: number | null
  estado_verificacion: string
  usuarios: {
    nombre_completo: string
    email: string
    telefono: string | null
  } | null
}

// Orden y etiquetas legibles de cada documento dentro del panel de revisión.
const DOC_ORDER: { clave: DocumentoKYC; label: string }[] = [
  { clave: 'carnet_frontal', label: 'Cédula — Frontal' },
  { clave: 'carnet_reverso', label: 'Cédula — Reverso' },
  { clave: 'licencia', label: 'Licencia de conducir' },
  { clave: 'padron', label: 'Padrón del vehículo' },
  { clave: 'selfie', label: 'Selfie de validación' },
]

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

/* -------------------------------------------------------------------------- */
/*  Panel lateral de revisión documental                                        */
/* -------------------------------------------------------------------------- */

function DrawerRevision({
  solicitante,
  onClose,
  onResuelto,
}: {
  solicitante: SolicitanteKYC
  onClose: () => void
  onResuelto: (idUsuario: string) => void
}) {
  const [docs, setDocs] = useState<DocumentosKYC | null>(null)
  const [cargandoDocs, setCargandoDocs] = useState(true)
  const [errorDocs, setErrorDocs] = useState(false)
  const [accion, setAccion] = useState<'idle' | 'aprobando' | 'rechazando'>('idle')
  const [modoRechazo, setModoRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')

  const nombre = solicitante.usuarios?.nombre_completo ?? 'Conductor'

  // Firma las URLs de los documentos al abrir el panel (vía backend / service_role).
  useEffect(() => {
    let cancelado = false
    setCargandoDocs(true)
    setErrorDocs(false)
    getDocumentosKYC(solicitante.id_usuario)
      .then((d) => {
        if (!cancelado) setDocs(d)
      })
      .catch(() => {
        if (!cancelado) setErrorDocs(true)
      })
      .finally(() => {
        if (!cancelado) setCargandoDocs(false)
      })
    return () => {
      cancelado = true
    }
  }, [solicitante.id_usuario])

  const handleAprobar = async () => {
    setAccion('aprobando')
    try {
      await aprobarConductor(solicitante.id_usuario)
      toast.success('Conductor aprobado', {
        description: `${nombre} ya puede operar. La selfie fue destruida (minimización).`,
      })
      onResuelto(solicitante.id_usuario)
    } catch {
      toast.error('No se pudo aprobar al conductor.')
      setAccion('idle')
    }
  }

  const handleRechazar = async () => {
    setAccion('rechazando')
    try {
      await rechazarConductor(solicitante.id_usuario, motivo.trim() || undefined)
      toast.success('Conductor rechazado', { description: `${nombre} quedó fuera del proceso.` })
      onResuelto(solicitante.id_usuario)
    } catch {
      toast.error('No se pudo rechazar al conductor.')
      setAccion('idle')
    }
  }

  const ocupado = accion !== 'idle'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0d1222] shadow-2xl shadow-black/50"
      >
        {/* Encabezado del solicitante */}
        <header className="flex items-start justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primario to-secundario text-base font-bold text-white">
              {iniciales(nombre)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{nombre}</h2>
              <p className="text-sm text-slate-400">{solicitante.usuarios?.email}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                <span>RUT: {solicitante.rut}</span>
                {solicitante.patente && <span>Patente: {solicitante.patente}</span>}
                {solicitante.capacidad_m3 != null && <span>{solicitante.capacidad_m3} m³</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Documentos */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Documentación
          </p>

          {cargandoDocs && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-sm">Firmando documentos seguros…</span>
            </div>
          )}

          {errorDocs && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              No se pudieron firmar los documentos. Revisa permisos de administrador o reintenta.
            </div>
          )}

          {!cargandoDocs && !errorDocs && docs && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DOC_ORDER.map(({ clave, label }) => {
                const url = docs[clave]
                const esSelfie = clave === 'selfie'
                return (
                  <div
                    key={clave}
                    className={`overflow-hidden rounded-xl border bg-black/20 ${
                      esSelfie ? 'border-amber-500/30' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                        {esSelfie ? (
                          <ScanFace className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <FileImage className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        {label}
                      </span>
                    </div>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir en grande">
                        <img
                          src={url}
                          alt={label}
                          loading="lazy"
                          className="h-40 w-full bg-black/40 object-contain transition-opacity hover:opacity-90"
                        />
                      </a>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-xs text-slate-600">
                        No disponible
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Recordatorio de privacidad sobre la selfie */}
          {!cargandoDocs && !errorDocs && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80">
              <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              Contrasta manualmente la selfie con la cédula. Al aprobar, la imagen biométrica se
              destruye y solo queda el registro lógico “identidad confirmada” (Ley 21.719).
            </p>
          )}
        </div>

        {/* Acciones */}
        <footer className="border-t border-white/10 p-6">
          <AnimatePresence mode="wait" initial={false}>
            {modoRechazo ? (
              <motion.div
                key="rechazo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-3"
              >
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo del rechazo (opcional, ayuda a la trazabilidad)…"
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-terciario/50"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setModoRechazo(false)}
                    disabled={ocupado}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRechazar}
                    disabled={ocupado}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-terciario py-3 text-sm font-bold text-white shadow-lg shadow-terciario/25 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {accion === 'rechazando' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldX className="h-4 w-4" />
                    )}
                    Confirmar rechazo
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="acciones"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex gap-3"
              >
                <button
                  onClick={() => setModoRechazo(true)}
                  disabled={ocupado}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-terciario/30 bg-terciario/10 py-3 text-sm font-bold text-terciario transition-colors hover:bg-terciario/20 disabled:opacity-50"
                >
                  <ShieldX className="h-4 w-4" />
                  Rechazar
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={ocupado || cargandoDocs}
                  className="flex flex-2 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {accion === 'aprobando' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Aprobar Conductor
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </footer>
      </motion.aside>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vista principal: cola de revisión                                           */
/* -------------------------------------------------------------------------- */

export default function ValidacionKYC() {
  const [solicitantes, setSolicitantes] = useState<SolicitanteKYC[]>([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState<SolicitanteKYC | null>(null)

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('conductores')
      .select(
        'id_conductor, id_usuario, rut, patente, capacidad_m3, estado_verificacion, usuarios ( nombre_completo, email, telefono )',
      )
      .eq('estado_verificacion', 'en_revision')

    if (error) {
      toast.error('No se pudo cargar la cola de revisión.')
      setSolicitantes([])
    } else {
      setSolicitantes((data ?? []) as unknown as SolicitanteKYC[])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  // Cuando una solicitud se resuelve (aprobada/rechazada): la quitamos de la cola.
  const handleResuelto = (idUsuario: string) => {
    setSolicitantes((prev) => prev.filter((s) => s.id_usuario !== idUsuario))
    setSeleccionado(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Encabezado */}
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Validación KYC</h1>
          <p className="mt-1 text-sm text-slate-400">
            Conductores a la espera de verificación manual de identidad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300">
            {solicitantes.length} en revisión
          </span>
          <button
            onClick={cargar}
            disabled={cargando}
            title="Recargar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1222]">
        {cargando ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-sm">Cargando solicitudes…</span>
          </div>
        ) : solicitantes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <Inbox className="h-8 w-8" />
            <span className="text-sm">No hay conductores en revisión. ¡Todo al día!</span>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-medium">Conductor</th>
                <th className="px-6 py-3 font-medium">RUT</th>
                <th className="hidden px-6 py-3 font-medium md:table-cell">Patente</th>
                <th className="hidden px-6 py-3 font-medium lg:table-cell">Contacto</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {solicitantes.map((s) => {
                const nombre = s.usuarios?.nombre_completo ?? 'Conductor'
                return (
                  <tr
                    key={s.id_conductor}
                    onClick={() => setSeleccionado(s)}
                    className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                          {iniciales(nombre)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{nombre}</p>
                          <p className="truncate text-xs text-slate-500">{s.usuarios?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{s.rut}</td>
                    <td className="hidden px-6 py-4 text-slate-300 md:table-cell">
                      {s.patente ?? '—'}
                    </td>
                    <td className="hidden px-6 py-4 text-slate-400 lg:table-cell">
                      {s.usuarios?.telefono ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        En revisión
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-medium text-secundario">Revisar →</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel lateral de revisión */}
      <AnimatePresence>
        {seleccionado && (
          <DrawerRevision
            solicitante={seleccionado}
            onClose={() => setSeleccionado(null)}
            onResuelto={handleResuelto}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
