import { motion } from 'framer-motion'
import { ShieldCheck, Clock, FileCheck2, Lock, XCircle, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { EstadoVerificacion } from '../../types'

/**
 * Guardián de Onboarding (Ley 21.719 / verificación manual de 7 días).
 * Pantalla flotante central con Glassmorphism premium que bloquea por completo
 * el mapa de fletes y la telemetría hasta que el conductor esté 'aprobado'.
 */

type Config = {
  icon: typeof Clock
  badge: string
  badgeClass: string
  titulo: string
  mensaje: string
  cta?: { texto: string; to: string }
}

const POR_ESTADO: Record<Exclude<EstadoVerificacion, 'aprobado'>, Config> = {
  en_revision: {
    icon: Clock,
    badge: 'En revisión',
    badgeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    titulo: 'Estamos validando tus documentos',
    mensaje:
      'Tu cédula, licencia, padrón y selfie están bajo validación segura en un bucket privado y cifrado. Este proceso manual toma un plazo estimado de hasta 7 días hábiles. Te avisaremos en cuanto tu cuenta quede habilitada.',
  },
  faltan_documentos: {
    icon: UploadCloud,
    badge: 'Faltan documentos',
    badgeClass: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    titulo: 'Completa tu documentación',
    mensaje:
      'Aún no recibimos toda la documentación necesaria para verificar tu identidad y habilitación. Completa la carga para iniciar el proceso de validación.',
    cta: { texto: 'Completar registro', to: '/register' },
  },
  rechazado: {
    icon: XCircle,
    badge: 'Rechazado',
    badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
    titulo: 'No pudimos verificar tu cuenta',
    mensaje:
      'La documentación entregada no superó la validación. Si crees que se trata de un error o quieres reenviar tus documentos, contáctanos para reabrir tu proceso.',
  },
}

export default function OnboardingGuard({ estado }: { estado: Exclude<EstadoVerificacion, 'aprobado'> }) {
  const cfg = POR_ESTADO[estado]
  const Icon = cfg.icon

  // Pasos del semáforo para situar al conductor en el proceso.
  const pasos = [
    { label: 'Documentos recibidos', done: estado !== 'faltan_documentos' },
    { label: 'Validación manual', done: estado === 'rechazado', activo: estado === 'en_revision' },
    { label: 'Cuenta habilitada', done: false },
  ]

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0a0e1a] p-4">
      {/* Fondo con orbes para coherencia visual */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primario/25 blur-[140px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-secundario/25 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150"
      >
        {/* Candado: el panel está bloqueado */}
        <div className="absolute right-5 top-5 flex items-center gap-1 text-[11px] text-slate-400">
          <Lock className="h-3.5 w-3.5" /> Panel bloqueado
        </div>

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30"
        >
          <Icon className="h-8 w-8 text-white" />
        </motion.div>

        <span className={`mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium ${cfg.badgeClass}`}>
          {cfg.badge}
        </span>

        <h1 className="mb-3 text-xl font-bold text-white">{cfg.titulo}</h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-300">{cfg.mensaje}</p>

        {/* Línea de seguridad: garantía de minimización y cifrado */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Validación segura · datos cifrados en bucket privado
        </div>

        {/* Semáforo de pasos */}
        <div className="mb-6 flex items-center justify-between gap-2">
          {pasos.map((p, i) => (
            <div key={p.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                  p.done
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                    : p.activo
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-white/15 bg-white/5 text-slate-500'
                }`}
              >
                {p.done ? <FileCheck2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-[10px] leading-tight text-slate-400">{p.label}</span>
            </div>
          ))}
        </div>

        {cfg.cta && (
          <Link
            to={cfg.cta.to}
            className="inline-block w-full rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-bold text-white shadow-lg shadow-primario/25 transition-opacity hover:opacity-90"
          >
            {cfg.cta.texto}
          </Link>
        )}
      </motion.div>
    </div>
  )
}
