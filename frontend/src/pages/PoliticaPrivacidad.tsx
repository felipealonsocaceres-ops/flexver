import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, Database, Eye, Lock, RotateCcw, Trash2 } from 'lucide-react'
import { POLICY_VERSION } from '../lib/privacy'

/**
 * Política de Privacidad versionada (Ley 21.719).
 * Ruta pública, siempre accesible. La versión sale de POLICY_VERSION (fuente
 * única de verdad espejada del backend).
 */

const PRINCIPIOS = [
  { icon: Database, titulo: 'Minimización', texto: 'Pedimos y guardamos solo lo estrictamente necesario para prestar el servicio.' },
  { icon: ShieldCheck, titulo: 'Consentimiento granular', texto: 'Separamos lo contractual (obligatorio) de lo opcional. Nada viene premarcado.' },
  { icon: Eye, titulo: 'Transparencia', texto: 'Te informamos por capas, sin muros de texto, qué hacemos con tus datos.' },
  { icon: RotateCcw, titulo: 'Revocabilidad', texto: 'Puedes cambiar de opinión y ejercer tus derechos cuando quieras.' },
]

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-white">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

export default function PoliticaPrivacidad() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-primario hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Política de Privacidad</h1>
            <p className="text-sm text-slate-400">
              Versión <span className="font-mono text-primario">{POLICY_VERSION}</span> · FlexVer · Ley 21.719 (Chile)
            </p>
          </div>
        </div>

        {/* Principios rectores, por capas */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {PRINCIPIOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-primario">
                <Icon className="h-5 w-5" />
                <h3 className="font-semibold text-white">{titulo}</h3>
              </div>
              <p className="text-sm text-slate-400">{texto}</p>
            </div>
          ))}
        </div>

        <Seccion titulo="1. Quiénes somos y qué tratamos">
          <p>
            FlexVer es un marketplace de fletes que conecta clientes con conductores independientes.
            Tratamos datos de identidad, contacto y, en el caso de conductores, documentación para
            verificar su habilitación para conducir y transportar carga.
          </p>
        </Seccion>

        <Seccion titulo="2. Qué datos recolectamos y para qué (minimización)">
          <p>· <strong>Identidad y contacto:</strong> nombre, correo y teléfono, para crear tu cuenta y coordinar los viajes.</p>
          <p>· <strong>Cédula de identidad (frente/reverso):</strong> verificar tu identidad. Finalidad única; almacenamiento cifrado en bucket privado.</p>
          <p>· <strong>Licencia de conducir:</strong> confirmar que estás habilitado para conducir.</p>
          <p>· <strong>Padrón del vehículo:</strong> extraemos solo patente, capacidad y vigencia. No conservamos el documento como dato vivo.</p>
          <p>· <strong>Selfie de validación:</strong> se usa exclusivamente para contrastarla con tu cédula. Una vez aprobada tu cuenta, la imagen cruda se destruye y solo queda el registro lógico de “identidad confirmada”.</p>
          <p>· <strong>Telemetría/ubicación:</strong> necesaria para prestar el servicio durante un viaje. El historial extendido es opcional y revocable.</p>
        </Seccion>

        <Seccion titulo="3. Base de tratamiento y consentimiento">
          <p>
            La aceptación de estos Términos y de la Política es la base contractual obligatoria. Los usos
            opcionales (marketing, historial de telemetría) requieren tu consentimiento expreso, nunca
            premarcado, y los registramos como evidencia inmutable (qué aceptaste, cuándo y bajo qué versión).
          </p>
        </Seccion>

        <Seccion titulo="4. Seguridad del almacenamiento">
          <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-emerald-400" /> Los documentos viajan a un bucket privado con control de acceso por usuario (RLS).</p>
          <p className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-emerald-400" /> La selfie de validación se destruye o cifra (AES-256) tras la aprobación.</p>
        </Seccion>

        <Seccion titulo="5. Tus derechos (revocabilidad)">
          <p>
            Puedes acceder, rectificar, oponerte y revocar consentimientos opcionales desde el Centro de
            Privacidad dentro de la app, o escribiéndonos. Revocar marketing o telemetría no afecta tu
            capacidad de usar el servicio.
          </p>
        </Seccion>

        <Seccion titulo="6. Cambios de versión">
          <p>
            Cuando actualicemos esta política, subiremos su número de versión y te pediremos que vuelvas a
            otorgar tu consentimiento la próxima vez que inicies sesión.
          </p>
        </Seccion>

        <p className="mt-10 text-center text-xs text-slate-600">© 2026 FlexVer — Política versión {POLICY_VERSION}</p>
      </div>
    </div>
  )
}
