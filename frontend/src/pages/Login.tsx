import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

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

<<<<<<< HEAD
    const { error } = await supabase.auth.signInWithPassword({ email, password })
=======
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
>>>>>>> origin/Nicolas-C

    if (authError) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    navigate('/home')
  }

  return (
<<<<<<< HEAD
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚚</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">FlexVer</h1>
          <p className="text-slate-400 mt-2 text-sm">Logística de última milla</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }} className="rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              className="w-full py-3 text-white font-semibold rounded-lg transition-all hover:opacity-90 mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>

          <div style={{ borderColor: '#2d2d4e' }} className="border-t mt-6 pt-6">
            <p className="text-center text-sm text-slate-500">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2025 FlexVer — Todos los derechos reservados
        </p>
      </div>
=======
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">FlexVer</h1>
          <p className="text-slate-400">Logística de última milla</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario transition-colors"
            />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-terciario text-sm bg-red-950/30 p-3 rounded-lg border border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-primario to-secundario text-white rounded-lg py-3 font-bold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Ingresar'}
            {!loading && <LogIn className="h-5 w-5" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primario font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </motion.div>
>>>>>>> origin/Nicolas-C
    </div>
  )
}