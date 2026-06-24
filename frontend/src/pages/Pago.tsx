/**
 * Confirmación de pago Transbank + calificación del conductor.
 *
 * Webpay redirige de vuelta a /pago/confirmar?token_ws=... tras el pago. Aquí:
 *   1) Confirmamos la transacción contra el backend.
 *   2) Marcamos `pagos.estado_pago = 'completado'` (FK id_flete).
 *   3) Pedimos al cliente calificar al conductor -> insert en `calificaciones`
 *      (FK id_conductor + id_flete).
 *
 * El id_flete se recupera de localStorage (lo guardó PanelCliente antes del
 * redirect); como respaldo se deduce del buy_order ("flete-XXXXXXXX").
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Star, Truck, CreditCard } from 'lucide-react'
import { pagosApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { celebrar } from '../lib/celebrar'

type Fase = 'confirmando' | 'calificar' | 'fallido' | 'enviando' | 'listo' | 'sin-pago'

const formatCLP = (monto: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(monto)

export default function Pago() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenWs = searchParams.get('token_ws')

  const [fase, setFase] = useState<Fase>(tokenWs ? 'confirmando' : 'sin-pago')
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState<{ orden?: string; monto?: number; codigo_autorizacion?: string }>({})

  // Contexto del flete (para actualizar pago y crear la calificación).
  const idFleteRef = useRef<string | null>(null)
  const idConductorRef = useRef<string | null>(null)

  // Estado del formulario de calificación.
  const [puntaje, setPuntaje] = useState(0)
  const [hover, setHover] = useState(0)
  const [comentario, setComentario] = useState('')

  // ---- 1) Confirmación del pago al volver de Transbank ----------------------
  useEffect(() => {
    if (!tokenWs) return
    let cancelado = false

    const confirmar = async () => {
      try {
        const result = await pagosApi.confirmar(tokenWs)
        if (cancelado) return
        setDetalle({
          orden: result.orden,
          monto: result.monto,
          codigo_autorizacion: result.codigo_autorizacion,
        })

        if (result.estado !== 'completado') {
          setFase('fallido')
          return
        }

        // Recupera el id_flete (localStorage primero, buy_order como respaldo).
        let idFlete: string | null = null
        const guardado = localStorage.getItem('flexver_pago')
        if (guardado) {
          try {
            idFlete = (JSON.parse(guardado) as { id_flete?: string }).id_flete ?? null
          } catch {
            idFlete = null
          }
        }

        if (idFlete) {
          await supabase
            .from('pagos')
            .update({ estado_pago: 'completado', token_transbank: tokenWs })
            .eq('id_flete', idFlete)
        } else if (result.orden) {
          // Respaldo: buy_order = "flete-XXXXXXXX" (prefijo de 8 chars del UUID).
          const prefijo = result.orden.replace('flete-', '')
          const { data } = await supabase
            .from('fletes')
            .select('id_flete')
            .ilike('id_flete', `${prefijo}%`)
            .limit(1)
            .maybeSingle()
          idFlete = data?.id_flete ?? null
          if (idFlete) {
            await supabase
              .from('pagos')
              .update({ estado_pago: 'completado', token_transbank: tokenWs })
              .eq('id_flete', idFlete)
          }
        }

        // Busca el conductor del flete para poder calificarlo.
        if (idFlete) {
          idFleteRef.current = idFlete
          const { data: flete } = await supabase
            .from('fletes')
            .select('id_conductor')
            .eq('id_flete', idFlete)
            .maybeSingle()
          idConductorRef.current = flete?.id_conductor ?? null
        }

        if (!cancelado) {
          setFase('calificar')
          celebrar()
          toast.success('¡Pago aprobado! 🎉')
        }
      } catch (e) {
        if (cancelado) return
        setError(e instanceof Error ? e.message : 'Error al confirmar el pago')
        setFase('fallido')
      }
    }

    confirmar()
    return () => {
      cancelado = true
    }
  }, [tokenWs])

  // ---- 2) Envío de la calificación ------------------------------------------
  const enviarCalificacion = async (omitir: boolean) => {
    if (!omitir) {
      setFase('enviando')
      const { error: err } = await supabase.from('calificaciones').insert({
        id_flete: idFleteRef.current,
        id_conductor: idConductorRef.current,
        puntaje,
        comentario: comentario.trim() || null,
      })
      if (err) {
        setError(err.message)
        setFase('calificar')
        return
      }
      toast.success('¡Gracias por tu calificación!')
    }
    localStorage.removeItem('flexver_pago')
    navigate('/home')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/80 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
      >
        {/* Confirmando */}
        {fase === 'confirmando' && (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primario" />
            <h2 className="mt-4 text-xl font-bold text-white">Confirmando pago…</h2>
            <p className="mt-1 text-sm text-slate-400">Estamos validando tu transacción con Transbank.</p>
          </div>
        )}

        {/* Calificar conductor (tras pago exitoso) */}
        {(fase === 'calificar' || fase === 'enviando') && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">¡Pago exitoso!</h2>
                <p className="text-sm text-slate-400">
                  {detalle.monto != null ? `${formatCLP(detalle.monto)} · ` : ''}Califica tu experiencia
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-slate-300">
                <Truck className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-medium">¿Cómo estuvo el conductor?</span>
              </div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPuntaje(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        n <= (hover || puntaje) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Deja un comentario (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primario"
            />

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-5 space-y-2">
              <button
                onClick={() => enviarCalificacion(false)}
                disabled={puntaje === 0 || fase === 'enviando'}
                className="w-full rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {fase === 'enviando' ? 'Enviando…' : 'Enviar calificación'}
              </button>
              <button
                onClick={() => enviarCalificacion(true)}
                disabled={fase === 'enviando'}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white disabled:opacity-50"
              >
                Omitir
              </button>
            </div>
          </div>
        )}

        {/* Pago fallido */}
        {fase === 'fallido' && (
          <div className="py-4 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-xl font-bold text-white">Pago no completado</h2>
            <p className="mt-1 text-sm text-slate-400">{error || 'La transacción no pudo completarse.'}</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* Sin pago pendiente (acceso directo a la ruta) */}
        {fase === 'sin-pago' && (
          <div className="py-4 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-slate-500" />
            <h2 className="mt-4 text-xl font-bold text-white">No hay pago pendiente</h2>
            <p className="mt-1 text-sm text-slate-400">Solicita o finaliza un flete para pagar.</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
