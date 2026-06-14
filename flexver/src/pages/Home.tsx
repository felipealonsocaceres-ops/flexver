import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>FlexVer 🚚</h1>
      <p>Bienvenido, {user?.email}</p>
      <button onClick={handleLogout} style={{ padding: '10px 20px' }}>
        Cerrar sesión
      </button>
    </div>
  )
}