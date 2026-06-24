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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/home')
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo y titulo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚚</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">FlexVer</h1>
          <p className="text-slate-400 mt-2 text-sm">Logistica de ultima milla</p>
        </div>

        {/* Card */}
        <div
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
          className="rounded-2xl shadow-2xl p-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesion</h2>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Correo electronico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e', color: '#ffffff' }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              className="w-full py-3 text-white font-semibold rounded-lg transition-all hover:opacity-90 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div style={{ borderColor: '#2d2d4e' }} className="border-t mt-6 pt-6">
            <p className="text-center text-sm text-slate-500">
              No tienes cuenta?{' '}
              <Link to="/register" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">
                Registrate aqui
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          2026 FlexVer — Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  )
}