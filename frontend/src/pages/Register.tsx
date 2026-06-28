import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, Phone, AlertCircle, Truck, Store, UploadCloud, IdCard, ShieldCheck, Loader2, ScanFace, FileText, Car, Lock as LockIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { POLICY_VERSION } from '../lib/privacy'

// Cero hardcodeo: la URL del backend vive en una variable de entorno.
// El fallback a localhost es solo una comodidad para desarrollo local.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Microcopy de minimización: por cada documento informamos finalidad y retención
// de forma honesta. Los documentos viajan al backend, que los cifra en un bucket
// PRIVADO bajo la carpeta del usuario (nunca públicos).
type DocInfo = { finalidad: string; retencion: string }
const DOC_INFO: Record<string, DocInfo> = {
  carnet: { finalidad: 'Verificar tu identidad.', retencion: 'Cifrado en bucket privado mientras tu cuenta esté activa.' },
  licencia: { finalidad: 'Confirmar que estás habilitado para conducir.', retencion: 'Cifrado en bucket privado mientras tu cuenta esté activa.' },
  padron: { finalidad: 'Extraer solo patente, capacidad y vigencia.', retencion: 'No conservamos el documento como dato vivo, solo los campos extraídos.' },
  selfie: { finalidad: 'Contrastarla manualmente con tu cédula.', retencion: 'Se destruye (o cifra AES-256) al aprobar tu cuenta; queda solo “identidad confirmada”.' },
}

// ── Utilidades de UX (formateo y validación visual) ──────────────────────────

// Formatea en tiempo real al estándar chileno: XX.XXX.XXX-X
// Acepta solo dígitos y la 'K' del dígito verificador.
const formatRUT = (value: string): string => {
  const limpio = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length === 0) return ''

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  // Mientras se escribe el primer carácter aún no hay cuerpo + dv.
  if (limpio.length === 1) return limpio

  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpoConPuntos}-${dv}`
}

// Garantiza el prefijo +56 9 y agrupa el resto: +56 9 XXXX XXXX
const formatPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('56')) digits = digits.slice(2)
  if (digits.startsWith('9')) digits = digits.slice(1)
  digits = digits.slice(0, 8) // 8 dígitos del móvil tras el 9

  let result = '+56 9'
  if (digits.length > 0) result += ' ' + digits.slice(0, 4)
  if (digits.length > 4) result += ' ' + digits.slice(4, 8)
  return result
}

// Evalúa la fuerza de la contraseña: longitud, mayúsculas, números y símbolos.
type Fuerza = { nivel: 'debil' | 'media' | 'fuerte'; label: string; color: string; barra: string; ancho: string }

const evaluarPassword = (pwd: string): Fuerza => {
  let puntos = 0
  if (pwd.length >= 8) puntos++
  if (/[A-Z]/.test(pwd)) puntos++
  if (/[0-9]/.test(pwd)) puntos++
  if (/[^A-Za-z0-9]/.test(pwd)) puntos++

  // Una contraseña demasiado corta nunca supera "débil".
  if (pwd.length < 6 || puntos <= 1) {
    return { nivel: 'debil', label: 'Débil', color: 'text-red-400', barra: 'bg-red-500', ancho: 'w-1/3' }
  }
  if (puntos <= 3) {
    return { nivel: 'media', label: 'Media', color: 'text-yellow-400', barra: 'bg-yellow-500', ancho: 'w-2/3' }
  }
  return { nivel: 'fuerte', label: 'Fuerte', color: 'text-green-400', barra: 'bg-green-500', ancho: 'w-full' }
}

// ── Sistema de diseño compartido (Deep Dark Tech Premium) ────────────────────

// Partículas que flotan en el fondo. Posiciones deterministas (estables entre renders).
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  top: `${(i * 67 + 13) % 100}%`,
  size: 2 + (i % 3),
  duration: 7 + (i % 8),
  delay: (i % 6) * 0.7,
  drift: i % 2 === 0 ? -50 : -32,
}))

// Fondo "aurora": gradiente desplazándose + haz cónico girando + orbes y partículas.
// Definido a nivel de módulo para no recrearse en cada render.
function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Capa base: gradiente de colores desplazándose suavemente */}
      <div className="aurora-gradient absolute inset-0" />
      {/* Haz cónico girando lentamente para dar dinamismo */}
      <div className="aurora-beams absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax]" />

      {/* Orbes flotantes con pulso de opacidad */}
      <motion.div
        className="absolute -top-40 -left-40 h-112 w-md rounded-full bg-primario/35 blur-[140px]"
        animate={{ x: [0, 80, -30, 0], y: [0, 50, 100, 0], scale: [1, 1.18, 0.92, 1], opacity: [0.55, 0.85, 0.6, 0.55] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-104 w-104 rounded-full bg-secundario/35 blur-[140px]"
        animate={{ x: [0, -60, 40, 0], y: [0, -50, -90, 0], scale: [1, 0.9, 1.22, 1], opacity: [0.5, 0.8, 0.55, 0.5] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-indigo-500/30 blur-[130px]"
        animate={{ x: [0, 50, -40, 0], y: [0, -30, 30, 0], scale: [1, 1.1, 0.95, 1], opacity: [0.45, 0.75, 0.5, 0.45] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-[130px]"
        animate={{ x: [0, -40, 30, 0], y: [0, 40, -20, 0], scale: [1, 1.15, 0.9, 1], opacity: [0.4, 0.7, 0.45, 0.4] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Partículas flotando hacia arriba con leve parpadeo */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/50"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, p.drift, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// Input con floating label, ícono y glow violeta al enfocar.
// A nivel de módulo: nunca se remonta, por lo que el input no pierde el foco.
type FloatingFieldProps = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>

function FloatingField({ id, label, icon: Icon, value, onChange, ...rest }: FloatingFieldProps) {
  return (
    <div className="relative rounded-xl transition-shadow duration-300 focus-within:shadow-[0_0_22px_-6px_rgba(139,92,246,0.6)]">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 transition-colors peer-focus:text-primario [&:has(+input:focus)]:text-primario">
        <Icon className="h-5 w-5" />
      </div>
      <input
        id={id}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full pl-11 pr-3 pt-5 pb-2 bg-slate-900/50 border border-white/10 text-white rounded-xl outline-none transition-colors duration-200 focus:border-primario focus:ring-2 focus:ring-primario/30 placeholder-transparent"
        {...rest}
      />
      <label
        htmlFor={id}
        className="absolute left-11 top-2 text-xs text-slate-400 pointer-events-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primario"
      >
        {label}
      </label>
    </div>
  )
}

// Campo de documento con microcopy de minimización honesto: finalidad + retención.
// Definido a nivel de módulo para no remontarse en cada render.
function DocUpload({
  label,
  info,
  file,
  onSelect,
  icon: Icon,
}: {
  label: string
  info: DocInfo
  file: File | null
  onSelect: (f: File | null) => void
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-200">
        <Icon className="h-4 w-4 text-secundario" /> {label}
        {file && <ShieldCheck className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
      </div>
      <p className="mb-0.5 text-[11px] text-slate-400"><span className="text-slate-500">Finalidad:</span> {info.finalidad}</p>
      <p className="mb-2 text-[11px] text-slate-400"><span className="text-slate-500">Retención:</span> {info.retencion}</p>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
        required
        className="w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-secundario/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secundario hover:file:bg-secundario/30"
      />
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rut, setRut] = useState('') // El estado del RUT (formateado: XX.XXX.XXX-X)
  const [patente, setPatente] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [rol, setRol] = useState<'cliente' | 'conductor'>('cliente')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Consentimiento: términos OBLIGATORIO (bloquea el botón) + marketing OPCIONAL
  // apagado por defecto (nunca premarcado).
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaMarketing, setAceptaMarketing] = useState(false)

  // Estados para los archivos del conductor (cédula, licencia, padrón, selfie).
  const [fileCarnetFrente, setFileCarnetFrente] = useState<File | null>(null)
  const [fileCarnetReverso, setFileCarnetReverso] = useState<File | null>(null)
  const [fileLicencia, setFileLicencia] = useState<File | null>(null)
  const [filePadron, setFilePadron] = useState<File | null>(null)
  const [fileSelfie, setFileSelfie] = useState<File | null>(null)

  const fuerza = evaluarPassword(password)
  const passwordDebil = password.length === 0 || fuerza.nivel === 'debil'

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // El consentimiento contractual es condición de registro.
    if (!aceptaTerminos) {
      setError('Debes aceptar los Términos y la Política de Privacidad para continuar.')
      return
    }
    setLoading(true)

    // Timeout defensivo: si el backend no responde en 20s, abortamos la petición.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20_000)

    try {
      let endpointUrl: string
      let fetchInit: RequestInit

      if (rol === 'conductor') {
        if (!fileCarnetFrente || !fileCarnetReverso || !fileLicencia || !filePadron || !fileSelfie) {
          throw new Error('Debes adjuntar todos los documentos solicitados, incluida la selfie.')
        }
        // Multipart: los documentos los sube el BACKEND a un bucket privado bajo
        // la carpeta del usuario. El cliente nunca los hace públicos.
        const form = new FormData()
        form.append('nombre_completo', nombre)
        form.append('email', email)
        form.append('password', password)
        form.append('telefono', telefono)
        form.append('rut', rut.replace(/\./g, ''))
        if (patente) form.append('patente', patente.toUpperCase())
        if (capacidad) form.append('capacidad_m3', capacidad)
        form.append('acepta_terminos', String(aceptaTerminos))
        form.append('acepta_marketing', String(aceptaMarketing))
        form.append('carnet_frontal', fileCarnetFrente)
        form.append('carnet_reverso', fileCarnetReverso)
        form.append('licencia', fileLicencia)
        form.append('padron', filePadron)
        form.append('selfie', fileSelfie)
        endpointUrl = `${API_URL}/api/v1/users/users/driver`
        fetchInit = { method: 'POST', body: form, signal: controller.signal }
      } else {
        const payload = {
          nombre_completo: nombre,
          email,
          password,
          telefono,
          rol,
          acepta_terminos: aceptaTerminos,
          acepta_marketing: aceptaMarketing,
        }
        endpointUrl = `${API_URL}/api/v1/users/users/client`
        fetchInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      }

      const response = await fetch(endpointUrl, fetchInit)

      if (!response.ok) {
        const errorData = await response.json()

        // Manejo de Error 422 de Pydantic (Validaciones como el RUT)
        if (Array.isArray(errorData.detail)) {
          const mensajesValidacion = errorData.detail.map((err: { msg: string }) => err.msg).join(' | ')
          throw new Error(`Validación: ${mensajesValidacion}`)
        }

        throw new Error(errorData.detail || 'Error en el servidor al crear la cuenta.')
      }

      // Éxito: redirección fluida a login, sin alert() bloqueante.
      navigate('/login')

    } catch (err: unknown) {
      console.error("Error general detectado:", err)

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('El servidor tardó demasiado en responder. Por favor, inténtalo nuevamente.')
      } else if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String(err.message))
      } else {
        setError('Ocurrió un error inesperado al conectar con el servidor.')
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0a0e1a] overflow-hidden">

      {/* Fondo aurora animado */}
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md my-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-7 sm:p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5"
      >
        <div className="text-center mb-7">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Crear cuenta</h1>
          <p className="text-slate-400 text-sm mt-1">Únete a la red de FlexVer</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">

          {/* Selector de Rol con resaltado deslizante (layoutId) */}
          <div className="flex gap-3 mb-1">
            <button
              type="button"
              onClick={() => setRol('cliente')}
              className={`relative flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primario/50 ${rol === 'cliente' ? 'border-transparent text-primario' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              {rol === 'cliente' && (
                <motion.span
                  layoutId="rolActivo"
                  className="absolute inset-0 rounded-xl bg-primario/15 border border-primario"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Store className="relative z-10 h-6 w-6 mb-1" />
              <span className="relative z-10 text-sm font-semibold">Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setRol('conductor')}
              className={`relative flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secundario/50 ${rol === 'conductor' ? 'border-transparent text-secundario' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              {rol === 'conductor' && (
                <motion.span
                  layoutId="rolActivo"
                  className="absolute inset-0 rounded-xl bg-secundario/15 border border-secundario"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Truck className="relative z-10 h-6 w-6 mb-1" />
              <span className="relative z-10 text-sm font-semibold">Conductor</span>
            </button>
          </div>

          <FloatingField id="reg-nombre" label="Nombre completo" icon={User} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

          <FloatingField id="reg-email" label="Correo electrónico" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <div>
            <FloatingField id="reg-password" label="Contraseña (mínimo 6)" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

            {/* Medidor de fuerza de contraseña */}
            <AnimatePresence>
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${fuerza.barra}`}
                      initial={false}
                      animate={{ width: fuerza.ancho === 'w-1/3' ? '33%' : fuerza.ancho === 'w-2/3' ? '66%' : '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={`mt-1 text-xs font-medium ${fuerza.color}`}>
                    Seguridad: {fuerza.label}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <FloatingField id="reg-telefono" label="Teléfono (+56 9 XXXX XXXX)" icon={Phone} type="tel" value={telefono} onChange={(e) => setTelefono(formatPhone(e.target.value))} required />

          {/* Zona exclusiva para conductores: RUT + Archivos */}
          <AnimatePresence initial={false}>
            {rol === 'conductor' && (
              <motion.div
                key="zona-conductor"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col gap-3 p-4 bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden"
              >

                <div className="mb-1">
                  <FloatingField id="reg-rut" label="RUT (ej: 12.345.678-5)" icon={IdCard} type="text" value={rut} onChange={(e) => setRut(formatRUT(e.target.value))} required />
                </div>

                {/* Minimización del padrón: solo los campos necesarios. */}
                <div className="grid grid-cols-2 gap-2">
                  <FloatingField id="reg-patente" label="Patente" icon={Car} type="text" value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} />
                  <FloatingField id="reg-capacidad" label="Capacidad (m³)" icon={FileText} type="number" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
                </div>

                <h3 className="text-sm font-semibold text-secundario flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" /> Documentos requeridos
                </h3>

                {/* Garantía visual de cifrado/privacidad del almacenamiento. */}
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
                  <LockIcon className="h-3.5 w-3.5 shrink-0" /> Tus documentos se cifran y guardan en un bucket privado. Nadie más que tú y el equipo de validación puede verlos.
                </div>

                <DocUpload label="Cédula — Frontal" info={DOC_INFO.carnet} file={fileCarnetFrente} onSelect={setFileCarnetFrente} icon={IdCard} />
                <DocUpload label="Cédula — Reverso" info={DOC_INFO.carnet} file={fileCarnetReverso} onSelect={setFileCarnetReverso} icon={IdCard} />
                <DocUpload label="Licencia de Conducir" info={DOC_INFO.licencia} file={fileLicencia} onSelect={setFileLicencia} icon={FileText} />
                <DocUpload label="Padrón del Vehículo" info={DOC_INFO.padron} file={filePadron} onSelect={setFilePadron} icon={Car} />
                <DocUpload label="Selfie de validación" info={DOC_INFO.selfie} file={fileSelfie} onSelect={setFileSelfie} icon={ScanFace} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Consentimiento granular (Ley 21.719) ─────────────────────── */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4">
            {/* Términos: OBLIGATORIO. Bloquea el botón si no está marcado. */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primario"
              />
              <span className="text-xs text-slate-300">
                Acepto los{' '}
                <Link to="/politica-privacidad" target="_blank" className="text-primario hover:underline">
                  Términos y la Política de Privacidad
                </Link>{' '}
                <span className="text-slate-500">(v{POLICY_VERSION})</span>. Obligatorio para crear la cuenta.
              </span>
            </label>

            {/* Marketing: OPCIONAL, apagado por defecto (nunca premarcado). */}
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Quiero recibir novedades y promociones por correo <span className="text-slate-600">(opcional)</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={aceptaMarketing}
                onClick={() => setAceptaMarketing((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${aceptaMarketing ? 'bg-primario' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aceptaMarketing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 text-terciario text-sm bg-red-950/30 p-3 rounded-lg border border-red-900"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || passwordDebil || !aceptaTerminos}
            whileHover={{ scale: loading || passwordDebil || !aceptaTerminos ? 1 : 1.02 }}
            whileTap={{ scale: loading || passwordDebil || !aceptaTerminos ? 1 : 0.98 }}
            className="group relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl py-3 font-bold text-white mt-2 bg-linear-to-r from-primario to-secundario shadow-lg shadow-primario/25 transition-all hover:shadow-primario/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primario/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Procesando en Backend...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>Crear cuenta</span>
              </>
            )}
          </motion.button>

          {passwordDebil && password.length > 0 && (
            <p className="text-center text-xs text-slate-500">
              Refuerza tu contraseña para continuar.
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primario font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          2025 FlexVer — Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  )
}
