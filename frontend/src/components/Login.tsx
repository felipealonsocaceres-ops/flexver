import { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación específica en tiempo real
    if (!email.includes('@') || email.length < 5) {
      setError('Por favor introduce un correo electrónico válido.');
      setSuccess(false);
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setSuccess(false);
      return;
    }

    // Simulación de éxito
    setError('');
    setSuccess(true);
    console.log('Enviando a Supabase:', { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-fondo">
      {/* Animación de entrada con framer-motion */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-flexver shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-texto mb-2">Bienvenido a FlexVer</h1>
          <p className="text-gray-500">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Input de Email */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@mail.com"
              className={`w-full pl-10 pr-3 py-3 border ${error && !email.includes('@') ? 'border-terciario' : 'border-gray-200'} rounded-flexver focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario transition-colors`}
            />
          </div>

          {/* Input de Contraseña */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className={`w-full pl-10 pr-3 py-3 border ${error && password.length < 6 && password.length > 0 ? 'border-terciario' : 'border-gray-200'} rounded-flexver focus:outline-none focus:border-primario focus:ring-1 focus:ring-primario transition-colors`}
            />
          </div>

          {/* Mensajes de Feedback */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-terciario text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>¡Credenciales válidas!</span>
            </motion.div>
          )}

          {/* Call to Action Prominente */}
          <button
            type="submit"
            className="w-full bg-secundario text-white rounded-flexver py-3 font-semibold hover:bg-blue-700 transition-colors mt-2"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            ¿No tienes una cuenta?{' '}
            <button className="text-primario font-semibold hover:underline">
              Regístrate aquí
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};