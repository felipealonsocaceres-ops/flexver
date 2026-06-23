import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, Phone, AlertCircle, Truck, Store } from 'lucide-react'
import { motion } from 'framer-motion'

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

    try {
      const payload = {
        nombre_completo: nombre,
        email: email,
        password: password,
        telefono: telefono,
        rol: rol,
        ...(rol === 'conductor' && {
          rut: '11111111-1',
          estado_verificacion: 'pendiente',
          disponible: true,
          latitud_actual: 0.0,
          longitud_actual: 0.0
        })
      }

      // Cambia la definición de endpointUrl por esta:
      const endpointUrl = rol === 'conductor' 
        ? 'http://localhost:8000/api/v1/users/users/driver' // Agregamos el /users/ extra que pide tu router
        : 'http://localhost:8000/api/v1/users/users/client'

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error en el servidor al crear la cuenta.')
      }

      setLoading(false)
      alert('¡Cuenta creada exitosamente en el Backend!')
      navigate('/login')

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Ocurrió un error inesperado al conectar con el servidor.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-8 max-w-md w-full my-8"
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Crear cuenta</h1>
          <p className="text-slate-400 text-sm">Únete a la red de FlexVer</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          
          <div className="flex gap-4 mb-2">
            <button
              type="button"
              onClick={() => setRol('cliente')}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all ${rol === 'cliente' ? 'bg-primario/20 border-primario text-primario' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
              <Store className="h-6 w-6 mb-1" />
              <span className="text-sm font-semibold">Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setRol('conductor')}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all ${rol === 'conductor' ? 'bg-secundario/20 border-secundario text-secundario' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
              <Truck className="h-6 w-6 mb-1" />
              <span className="text-sm font-semibold">Conductor</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" required
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 6)" required minLength={6}
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-slate-500" />
            </div>
            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (+56 9...)" required
              className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario" />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-terciario text-sm bg-red-950/30 p-3 rounded-lg border border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-linear-to-r from-primario to-secundario text-white rounded-lg py-3 font-bold hover:opacity-90 transition-opacity mt-2 disabled:opacity-50">
            {loading ? 'Procesando en Backend...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primario font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}