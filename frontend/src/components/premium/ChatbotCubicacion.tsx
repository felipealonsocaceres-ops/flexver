import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, Send, X, Loader2 } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Función Premium #1 — Chatbot "IA Logística" de Cubicación                   */
/*  Mockeado: el usuario lanza una consulta predefinida, la IA "escribe" 2s     */
/*  y responde con la cubicación estimada + opción de pre-llenar el formulario. */
/* -------------------------------------------------------------------------- */

interface Mensaje {
  autor: 'ia' | 'cliente'
  texto: string
}

const CONSULTA_DEMO = 'Calcular volumen para 50 sacos de cemento y 20 tubos PVC'
const RESPUESTA_IA =
  'Calculando... Esa carga equivale a ~1.250 kg. Te sugiero un camión de 2.5 m³. ¿Deseas que pre-llene tu formulario de flete con estos datos?'

export default function ChatbotCubicacion({
  onPrellenar,
}: {
  onPrellenar?: (descripcion: string, volumen: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { autor: 'ia', texto: '¡Hola! Soy tu asistente de cubicación. Cuéntame qué necesitas transportar y calcularé el volumen ideal. 📦' },
  ])
  const [escribiendo, setEscribiendo] = useState(false)
  const [consultaUsada, setConsultaUsada] = useState(false)
  const [ofreciendoPrellenar, setOfreciendoPrellenar] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll al último mensaje / indicador de escritura.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, escribiendo])

  const enviarConsulta = () => {
    if (consultaUsada || escribiendo) return
    setConsultaUsada(true)
    setMensajes((m) => [...m, { autor: 'cliente', texto: CONSULTA_DEMO }])
    setEscribiendo(true)
    // Simula 2s de procesamiento de la IA.
    setTimeout(() => {
      setEscribiendo(false)
      setMensajes((m) => [...m, { autor: 'ia', texto: RESPUESTA_IA }])
      setOfreciendoPrellenar(true)
    }, 2000)
  }

  const aplicarPrellenado = () => {
    onPrellenar?.('50 sacos de cemento y 20 tubos PVC', 2.5)
    setOfreciendoPrellenar(false)
    setMensajes((m) => [
      ...m,
      { autor: 'cliente', texto: 'Sí, pre-llena el formulario 👍' },
      { autor: 'ia', texto: '¡Listo! Abrí tu solicitud con la descripción y un volumen de 2.5 m³. Solo elige origen y destino. 🚚' },
    ])
    setAbierto(false)
  }

  return (
    <>
      {/* Botón flotante "IA Logística" */}
      <motion.button
        onClick={() => setAbierto((v) => !v)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
        whileTap={{ scale: 0.92 }}
        title="IA Logística"
        className="group absolute bottom-24 right-4 z-40 flex items-center gap-2 rounded-2xl border border-white/20 bg-linear-to-r from-primario to-secundario px-4 py-3 font-bold text-white shadow-2xl shadow-primario/40 backdrop-blur-md transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute h-6 w-6 animate-ping rounded-full bg-white/30" />
          <Bot className="relative h-5 w-5" />
        </span>
        <span className="text-sm">IA Logística</span>
        <Sparkles className="h-4 w-4 text-amber-200" />
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-24 right-4 z-50 flex h-112 w-[90vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900/80 shadow-2xl shadow-black/60 backdrop-blur-2xl backdrop-saturate-150 md:bottom-24 md:right-6"
          >
            {/* Encabezado */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
                <Bot className="h-5 w-5 text-white" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Asistente de Cubicación</h3>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> En línea · IA Logística
                </p>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensajes.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.autor === 'cliente' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-lg ${
                      m.autor === 'cliente'
                        ? 'rounded-br-sm bg-linear-to-r from-primario to-secundario text-white shadow-primario/20'
                        : 'rounded-bl-sm border border-white/10 bg-white/10 text-slate-100'
                    }`}
                  >
                    {m.texto}
                  </div>
                </motion.div>
              ))}

              {/* Indicador "Escribiendo..." */}
              {escribiendo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/10 bg-white/10 px-3.5 py-2.5 text-[13px] text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primario" />
                    <span className="flex gap-1">
                      Escribiendo
                      <span className="flex gap-0.5">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="h-1 w-1 animate-bounce rounded-full bg-slate-300"
                            style={{ animationDelay: `${d * 0.15}s` }}
                          />
                        ))}
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* CTA de pre-llenado */}
              {ofreciendoPrellenar && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <button
                    onClick={aplicarPrellenado}
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2.5 text-[13px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
                  >
                    <Sparkles className="h-4 w-4" />
                    Sí, pre-llenar mi formulario
                  </button>
                </motion.div>
              )}
            </div>

            {/* Sugerencia rápida / "input" */}
            <div className="border-t border-white/10 bg-white/5 p-3">
              <button
                onClick={enviarConsulta}
                disabled={consultaUsada}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-left text-[13px] text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="truncate">{CONSULTA_DEMO}</span>
                <Send className="h-4 w-4 shrink-0 text-primario" />
              </button>
              <p className="mt-1.5 px-1 text-[10px] text-slate-500">Toca la consulta sugerida para enviarla</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
