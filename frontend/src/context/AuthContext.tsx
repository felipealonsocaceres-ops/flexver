import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Usuario } from '../types'

type Rol = Usuario['rol']

interface AuthContextType {
  session: Session | null
  user: User | null
  rol: Rol | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  rol: null,
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // El rol vive en la tabla `usuarios`, no en el token de Auth:
    // lo resolvemos a partir de la sesión.
    const cargarRol = async (session: Session | null) => {
      if (!session?.user) {
        setRol(null)
        return
      }
      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id_usuario', session.user.id)
        .single()
      setRol((data?.rol as Rol) ?? null)
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await cargarRol(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      // No usar await aquí: liberamos el lock de Supabase antes de hacer
      // otra consulta. Diferir con setTimeout(0) evita el deadlock que
      // dejaba colgado a signInWithPassword.
      setTimeout(() => { cargarRol(session) }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, rol, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
