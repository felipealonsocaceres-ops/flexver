import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    </div>
  )
}