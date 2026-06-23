import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rol, setRol] = useState<'cliente' | 'conductor'>('cliente')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('No se pudo crear el usuario')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('usuarios').insert({
      id_usuario: authData.user.id,
      nombre_completo: nombre,
      email,
      telefono,
      rol,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (rol === 'conductor') {
      await supabase.from('conductores').insert({
        id_usuario: authData.user.id,
        rut: '',
        estado_verificacion: 'pendiente',
      })
    }

    setLoading(false)
    navigate('/login')
  }

  const inputStyle = {
    backgroundColor: '#0f0f1a',
    borderColor: '#2d2d4e',
    color: '#ffffff'
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚚</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">FlexVer</h1>
          <p className="text-slate-400 mt-2 text-sm">Logística de última milla</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }} className="rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>

          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Felipe Cerda"
                style={inputStyle}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>

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
                style={inputStyle}
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
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                style={inputStyle}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 XXXX XXXX"
                style={inputStyle}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Tipo de cuenta
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setRol('cliente')}
                  style={{
                    backgroundColor: rol === 'cliente' ? '#7c3aed' : '#0f0f1a',
                    borderColor: rol === 'cliente' ? '#7c3aed' : '#2d2d4e',
                  }}
                  className="py-3 rounded-lg border text-white font-medium transition-all text-sm"
                >
                  🏪 Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setRol('conductor')}
                  style={{
                    backgroundColor: rol === 'conductor' ? '#7c3aed' : '#0f0f1a',
                    borderColor: rol === 'conductor' ? '#7c3aed' : '#2d2d4e',
                  }}
                  className="py-3 rounded-lg border text-white font-medium transition-all text-sm"
                >
                  🚛 Conductor
                </button>
              </div>
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <div style={{ borderColor: '#2d2d4e' }} className="border-t mt-6 pt-6">
            <p className="text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">
                Inicia sesión
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