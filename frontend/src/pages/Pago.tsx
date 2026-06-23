/**
 * Página de pago — maneja 2 estados:
 *   - Sin token: muestra botón para ir a Transbank
 *   - Con token (redirect de Transbank): confirma el pago automáticamente
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { pagosApi } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function Pago() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Datos del flete recibidos desde SolicitarFlete via navigate state
  const { id_flete, monto } = (location.state || {}) as {
    id_flete?: string
    monto?: number
  }

  const [estado, setEstado] = useState<'idle' | 'cargando' | 'exitoso' | 'fallido'>('idle')
  const [detalle, setDetalle] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  const tokenWs = searchParams.get('token_ws')

  // Si hay token en la URL, confirmar automaticamente
  useEffect(() => {
    if (!tokenWs) return

    const confirmar = async () => {
      setEstado('cargando')
      try {
        const result = await pagosApi.confirmar(tokenWs)
        setDetalle(result)

        if (result.estado === 'completado') {
          setEstado('exitoso')

          const orden = result.orden as string
          const idFlete = orden.replace('flete-', '')

          await supabase.from('pagos').update({
            estado_pago: 'completado',
            token_transbank: tokenWs,
          }).eq('id_flete', idFlete)

          await supabase.from('fletes').update({
            estado: 'buscando_conductor',
          }).ilike('id_flete', `${idFlete}%`)

        } else {
          setEstado('fallido')
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al confirmar pago')
        setEstado('fallido')
      }
    }

    confirmar()
  }, [tokenWs])

  // Iniciar pago
  const handlePagar = async () => {
    if (!id_flete || !monto) return
    setEstado('cargando')
    setError('')

    try {
      await supabase.from('pagos').insert({
        id_flete,
        monto,
        estado_pago: 'pendiente',
      })

      const { url, token } = await pagosApi.iniciar(id_flete, monto)

      window.location.href = `${url}?token_ws=${token}`

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar pago')
      setEstado('idle')
    }
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }} className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Cargando */}
        {estado === 'cargando' && (
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
            className="rounded-2xl p-8 text-center"
          >
            <h2 className="text-xl font-semibold text-white">
              {tokenWs ? 'Confirmando pago...' : 'Iniciando pago...'}
            </h2>
            <p className="text-slate-400 text-sm mt-2">Por favor espera</p>
          </div>
        )}

        {/* Pago exitoso */}
        {estado === 'exitoso' && detalle && (
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #166534' }}
            className="rounded-2xl p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-green-400">Pago exitoso</h2>
              <p className="text-slate-400 text-sm mt-1">Tu flete ha sido confirmado</p>
            </div>

            <div
              style={{ backgroundColor: '#0f2818', borderColor: '#166534' }}
              className="border rounded-xl p-4 space-y-2 text-sm"
            >
              <div className="flex justify-between">
                <span className="text-slate-400">Orden</span>
                <span className="text-white">{detalle.orden as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto</span>
                <span className="text-white">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
                    .format(detalle.monto as number)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Autorizacion</span>
                <span className="text-white">{detalle.codigo_autorizacion as string}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/home')}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              className="w-full py-3 text-white font-semibold rounded-xl mt-6 hover:opacity-90 transition-all"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* Pago fallido */}
        {estado === 'fallido' && (
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
            className="rounded-2xl p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-red-400">Pago fallido</h2>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              {error || 'La transaccion no pudo completarse'}
            </p>
            <button
              onClick={() => navigate('/home')}
              style={{ backgroundColor: '#0f0f1a', borderColor: '#2d2d4e' }}
              className="w-full py-3 border text-slate-400 font-medium rounded-xl hover:text-white transition-all"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* Estado inicial */}
        {estado === 'idle' && !tokenWs && id_flete && monto && (
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
            className="rounded-2xl p-8"
          >
            <h2 className="text-xl font-semibold text-white mb-2">Confirmar pago</h2>
            <p className="text-slate-400 text-sm mb-6">
              Seras redirigido a Transbank para completar el pago de forma segura
            </p>

            <div
              style={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca' }}
              className="border rounded-xl p-4 mb-6 text-sm"
            >
              <div className="flex justify-between">
                <span className="text-slate-400">Total a pagar</span>
                <span className="text-violet-400 font-bold text-lg">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
                    .format(monto)}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handlePagar}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
            >
              Pagar con Transbank
            </button>
          </div>
        )}

        {/* Si no hay datos ni token, redirigir */}
        {estado === 'idle' && !tokenWs && !id_flete && (
          <div
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #6e1f2e' }}
            className="rounded-2xl p-8 text-center"
          >
            <h2 className="text-xl font-semibold text-white mb-4">No hay pago pendiente</h2>
            <button
              onClick={() => navigate('/home')}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}