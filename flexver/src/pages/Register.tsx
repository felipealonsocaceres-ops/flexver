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

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

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

    // 2. Insertar en tabla usuarios
    const { error: insertError } = await supabase.from('usuarios').insert({
      id_usuario: authData.user.id,
      nombre_completo: nombre,
      email: email,
      telefono: telefono,
      rol: rol,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // 3. Si es conductor, crear registro en tabla conductores
    if (rol === 'conductor') {
      const { error: conductorError } = await supabase.from('conductores').insert({
        id_usuario: authData.user.id,
        rut: '', // se completará después
        estado_verificacion: 'pendiente',
      })

      if (conductorError) {
        setError(conductorError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Registro - FlexVer</h1>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '12px' }}>
          <label>Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Teléfono</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Tipo de cuenta</label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as 'cliente' | 'conductor')}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="cliente">Cliente (Ferretería)</option>
            <option value="conductor">Conductor</option>
          </select>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: '10px' }}>
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>

      <p style={{ marginTop: '16px' }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  )
}