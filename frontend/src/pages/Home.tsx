import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatearPrecio } from '../lib/calcularTarifa'
import type { Flete, Usuario } from '../types'

const ESTADO_CONFIG: Record<Flete['estado'], { label: string; color: string; bg: string }> = {
  pendiente:           { label: 'Pendiente',           color: '#92400e', bg: '#fef3c7' },
  buscando_conductor:  { label: 'Buscando conductor',  color: '#1e40af', bg: '#dbeafe' },
  asignado:            { label: 'Conductor asignado',   color: '#065f46', bg: '#d1fae5' },
  en_camino:           { label: 'En camino',            color: '#5b21b6', bg: '#ede9fe' },
  carga_recogida:      { label: 'Carga recogida',       color: '#9a3412', bg: '#ffedd5' },
  entregado:           { label: 'Entregado',            color: '#14532d', bg: '#dcfce7' },
  cancelado:           { label: 'Cancelado',            color: '#7f1d1d', bg: '#fee2e2' },
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [fletes, setFletes] = useState<Flete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const cargarDatos = async () => {
      const { data: perfilData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', user.id)
        .single()

      if (perfilData) setUsuario(perfilData)

      const { data: fletesData } = await supabase
        .from('fletes')
        .select('*')
        .eq('id_usuario', user.id)
        .order('created_at', { ascending: false })

      if (fletesData) setFletes(fletesData)

      setLoading(false)
    }

    cargarDatos()

    const canal = supabase
      .channel('fletes_usuario')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fletes',
          filter: `id_usuario=eq.${user.id}`,
        },
        (payload) => {
          setFletes((prev) =>
            prev.map((f) =>
              f.id_flete === payload.new.id_flete
                ? { ...f, ...payload.new as Flete }
                : f
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>FlexVer</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Bienvenido, <strong>{usuario?.nombre_completo ?? user?.email}</strong>
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            background: 'white',
            color: '#6b7280',
          }}
        >
          Cerrar sesion
        </button>
      </div>

      {/* Boton solicitar flete */}
      <button
        onClick={() => navigate('/solicitar')}
        style={{
          width: '100%',
          padding: '16px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '32px',
        }}
      >
        Solicitar nuevo flete
      </button>

      {/* Lista de fletes */}
      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Mis fletes</h2>

      {fletes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: '#f9fafb',
          borderRadius: '12px',
          color: '#6b7280',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>No tienes fletes aun</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
            Solicita tu primer flete con el boton de arriba
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fletes.map((flete) => {
            const estadoConfig = ESTADO_CONFIG[flete.estado]
            return (
              <div
                key={flete.id_flete}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '16px',
                  background: 'white',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: estadoConfig.color,
                    background: estadoConfig.bg,
                  }}>
                    {estadoConfig.label}
                  </span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Origen: </span>
                    {flete.origen_direccion}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Destino: </span>
                    {flete.destino_direccion}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f3f4f6',
                  fontSize: '13px',
                  color: '#6b7280',
                }}>
                  <span>{flete.distancia_km} km</span>
                  <span>{formatearPrecio(flete.monto_total)}</span>
                  <span>{new Date(flete.created_at).toLocaleDateString('es-CL')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}