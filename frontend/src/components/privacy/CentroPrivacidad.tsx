import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, Lock, Loader2, ChevronDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CONSENT_LABELS,
  POLICY_VERSION,
  getMisConsentimientos,
  registrarConsentimiento,
  type EstadoConsentimiento,
  type TipoConsentimiento,
} from '../../lib/privacy'

/**
 * Centro de Privacidad (Ley 21.719): aviso por capas + toggles granulares.
 * Lee el estado vigente del backend y permite otorgar/revocar lo opcional;
 * cada cambio se persiste como evento inmutable.
 */

const OPCIONALES: TipoConsentimiento[] = ['marketing', 'telemetria_historial']

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? 'bg-primario' : 'bg-slate-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function CentroPrivacidad({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [estados, setEstados] = useState<Record<string, EstadoConsentimiento>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getMisConsentimientos()
      .then((r) => {
        const map: Record<string, EstadoConsentimiento> = {}
        r.estados.forEach((e) => { map[e.tipo] = e })
        setEstados(map)
      })
      .catch(() => toast.error('No se pudo cargar tu configuración de privacidad.'))
      .finally(() => setLoading(false))
  }, [open])

  const cambiar = async (tipo: TipoConsentimiento, otorgar: boolean) => {
    setGuardando(tipo)
    try {
      await registrarConsentimiento(tipo, otorgar)
      setEstados((prev) => ({
        ...prev,
        [tipo]: { tipo, otorgado: otorgar, version_politica: POLICY_VERSION, creado_en: new Date().toISOString() },
      }))
      toast.success(otorgar ? 'Preferencia activada.' : 'Preferencia desactivada.')
    } catch {
      toast.error('No se pudo guardar tu preferencia.')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primario to-secundario">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">Centro de Privacidad</h2>
                  <p className="text-xs text-slate-400">Versión de política <span className="font-mono text-primario">{POLICY_VERSION}</span></p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Capa 1: resumen */}
            <div className="border-b border-white/10 bg-white/5 px-5 py-3 text-xs text-slate-400">
              Controlas qué tratamos. Lo contractual es obligatorio mientras tengas cuenta; lo opcional lo
              decides tú y puedes revocarlo cuando quieras.
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Términos: obligatorio, siempre activo y bloqueado */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-white">{CONSENT_LABELS.terminos_y_politica.titulo}</h3>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">Obligatorio</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{CONSENT_LABELS.terminos_y_politica.resumen}</p>
                  </div>

                  {/* Opcionales: toggles granulares (apagados por defecto) */}
                  {OPCIONALES.map((tipo) => {
                    const info = CONSENT_LABELS[tipo]
                    const on = estados[tipo]?.otorgado ?? false
                    return (
                      <div key={tipo} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <button onClick={() => setExpandido(expandido === tipo ? null : tipo)} className="flex items-center gap-1.5 text-left">
                            <h3 className="text-sm font-semibold text-white">{info.titulo}</h3>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandido === tipo ? 'rotate-180' : ''}`} />
                          </button>
                          {guardando === tipo ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primario" />
                          ) : (
                            <Toggle on={on} onClick={() => cambiar(tipo, !on)} />
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {expandido === tipo && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 overflow-hidden text-xs text-slate-400"
                            >
                              {info.resumen}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
              <Link to="/politica-privacidad" className="inline-flex items-center gap-1 text-xs text-primario hover:underline">
                Ver Política completa <ExternalLink className="h-3 w-3" />
              </Link>
              <button onClick={onClose} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">Listo</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
