import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, Phone, AlertCircle, Truck, Store, UploadCloud, IdCard, ShieldCheck, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Cero hardcodeo: la URL del backend vive en una variable de entorno.
// El fallback a localhost es solo una comodidad para desarrollo local.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

export default function Register() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rut, setRut] = useState('') // El estado del RUT (formateado: XX.XXX.XXX-X)
  const [rol, setRol] = useState<'cliente' | 'conductor'>('cliente')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Estados para los archivos del conductor
  const [fileCarnetFrente, setFileCarnetFrente] = useState<File | null>(null)
  const [fileCarnetReverso, setFileCarnetReverso] = useState<File | null>(null)
  const [fileLicencia, setFileLicencia] = useState<File | null>(null)

  const fuerza = evaluarPassword(password)
  const passwordDebil = password.length === 0 || fuerza.nivel === 'debil'

  // Función auxiliar para subir a Supabase Storage
  const subirArchivo = async (file: File, prefijo: string) => {
    try {
      console.log(`[1] Iniciando subida de: ${file.name}`)
      const fileExt = file.name.split('.').pop()
      const fileName = `${prefijo}-${Date.now()}.${fileExt}`

      console.log(`[2] Subiendo a Supabase como: ${fileName}`)
      const { error } = await supabase.storage
        .from('documentos')
        .upload(fileName, file)

      if (error) {
        console.error("[X] Error interno de Supabase:", error)
        throw new Error(`Error Supabase: ${error.message || 'Falló la subida'}`, { cause: error })
      }

      console.log(`[3] Archivo subido, obteniendo URL pública...`)
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName)

      console.log(`[4] URL obtenida exitosamente:`, urlData.publicUrl)
      return urlData.publicUrl

    } catch (e: unknown) {
      console.error("[X] Excepción atrapada en subirArchivo:", e)
      if (e instanceof Error) {
        throw new Error(e.message, { cause: e })
      }
      throw new Error("Error inesperado al procesar el archivo", { cause: e })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Timeout defensivo: si el backend no responde en 12s, abortamos la petición
    // para no dejar la UI colgada en "Procesando...".
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12_000)

    try {
      let urlFrente = "", urlReverso = "", urlLic = "";

      // Si es conductor, validamos y subimos los archivos primero
      if (rol === 'conductor') {
        if (!fileCarnetFrente || !fileCarnetReverso || !fileLicencia) {
          throw new Error("Debes adjuntar todos los documentos solicitados.")
        }
        urlFrente = await subirArchivo(fileCarnetFrente, 'carnet-frente')
        urlReverso = await subirArchivo(fileCarnetReverso, 'carnet-reverso')
        urlLic = await subirArchivo(fileLicencia, 'licencia')
      }

      const payload = {
        nombre_completo: nombre,
        email: email,
        password: password,
        telefono: telefono,
        rol: rol,
        ...(rol === 'conductor' && {
          // Pydantic acepta el RUT con guion pero sin puntos (ej: 12345678-5).
          // Limpiamos los puntos del valor formateado antes de enviarlo.
          rut: rut.replace(/\./g, ''),
          // Eliminamos estado_verificacion, disponible, latitud y longitud.
          // El backend se encargará de gestionarlos de forma segura.
          url_carnet_frontal: urlFrente,
          url_carnet_reverso: urlReverso,
          url_licencia: urlLic
        })
      }

      const endpointUrl = rol === 'conductor'
        ? `${API_URL}/api/v1/users/users/driver`
        : `${API_URL}/api/v1/users/users/client`

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

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

                <h3 className="text-sm font-semibold text-secundario flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" /> Documentos requeridos
                </h3>

                <div className="text-xs text-slate-400 flex flex-col gap-1">
                  <label>Carnet Frontal</label>
                  <input type="file" accept="image/*" onChange={(e) => setFileCarnetFrente(e.target.files?.[0] || null)} required className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secundario/20 file:text-secundario hover:file:bg-secundario/30" />
                </div>

                <div className="text-xs text-slate-400 flex flex-col gap-1">
                  <label>Carnet Reverso</label>
                  <input type="file" accept="image/*" onChange={(e) => setFileCarnetReverso(e.target.files?.[0] || null)} required className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secundario/20 file:text-secundario hover:file:bg-secundario/30" />
                </div>

                <div className="text-xs text-slate-400 flex flex-col gap-1">
                  <label>Licencia de Conducir</label>
                  <input type="file" accept="image/*" onChange={(e) => setFileLicencia(e.target.files?.[0] || null)} required className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secundario/20 file:text-secundario hover:file:bg-secundario/30" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
            disabled={loading || passwordDebil}
            whileHover={{ scale: loading || passwordDebil ? 1 : 1.02 }}
            whileTap={{ scale: loading || passwordDebil ? 1 : 0.98 }}
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
