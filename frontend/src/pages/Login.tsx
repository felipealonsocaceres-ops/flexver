import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle, LogIn, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Sistema de diseño compartido (Deep Dark Tech Premium) ────────────────────
// Mantiene consistencia visual exacta con la pantalla de Registro.

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
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 transition-colors [&:has(+input:focus)]:text-primario">
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

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      // No redirigimos a mano por rol: vamos a /home y el RoleGuard
      // reenvía automáticamente al conductor a /panel-conductor.
      navigate('/home')
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } finally {
      // Pase lo que pase (éxito o error) el spinner se apaga.
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
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-7 sm:p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5"
      >
        {/* Logo y titulo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FlexVer</h1>
          <p className="text-slate-400 mt-1">Logística de última milla</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <FloatingField
            id="login-email"
            label="Correo electrónico"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <FloatingField
            id="login-password"
            label="Contraseña"
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-terciario text-sm bg-red-950/30 p-3 rounded-lg border border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="group relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl py-3 font-bold text-white mt-2 bg-linear-to-r from-primario to-secundario shadow-lg shadow-primario/25 transition-all hover:shadow-primario/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primario/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <span>Ingresar</span>
                <LogIn className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primario font-semibold hover:underline">
              Regístrate aquí
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
