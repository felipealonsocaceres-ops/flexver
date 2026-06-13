import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [conexion, setConexion] = useState('Probando conexión...')

  useEffect(() => {
    const probarConexion = async () => {
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')

      if (error) {
        setConexion('❌ Error: ' + error.message)
      } else {
        setConexion('✅ Conexión exitosa! Tarifas encontradas: ' + data.length)
      }
    }
    probarConexion()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>FlexVer 🚚</h1>
      <p>{conexion}</p>
    </div>
  )
}

export default App