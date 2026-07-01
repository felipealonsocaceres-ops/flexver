import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Loader2, Headset, Sparkles } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Edge Case #3 — Centro de Ayuda con Chatbot Inteligente (motor de reglas)    */
/*  Modal de soporte donde el usuario escribe libremente. Un mini motor de       */
/*  reglas (keywords/regex) responde: estima cubicación de materiales o          */
/*  transfiere el caso a un "operador humano" simulado tras 2 segundos.          */
/* -------------------------------------------------------------------------- */

interface Mensaje {
  autor: 'bot' | 'usuario' | 'operador'
  texto: string
}

const NOMBRES_OPERADOR = ['Carlos', 'Valentina', 'Matías', 'Fernanda', 'Diego', 'Camila']

// Materiales reconocidos por el "cálculo de cubicación" simulado.
const MATERIALES: Record<string, { densidad: string; m3: number }> = {
  cemento: { densidad: '~1.440 kg/m³', m3: 2.5 },
  madera: { densidad: '~700 kg/m³', m3: 4 },
  fierro: { densidad: '~7.850 kg/m³', m3: 1.5 },
}

const RE_CUBICACION = /\b(cemento|madera|fierro|fierros|hormig[oó]n|arena|ladrillo)\b/i
const RE_OPERADOR = /\b(operador|humano|reclamo|ayuda|persona|hablar|soporte)\b/i

function respuestaCubicacion(texto: string): string {
  const match = texto.toLowerCase().match(/cemento|madera|fierro/)
  const mat = match ? MATERIALES[match[0] === 'fierro' ? 'fierro' : match[0]] : null
  if (mat && match) {
    return (
      `📐 Calculando cubicación de ${match[0]}… Densidad estimada ${mat.densidad}. ` +
      `Para una carga estándar te recomiendo un camión de ~${mat.m3} m³. ` +
      `¿Quieres que cotice un flete con este volumen?`
    )
  }
  return (
    '📐 Estimando cubicación de tus materiales de construcción… Para una carga mixta ' +
    'estándar te recomiendo un camión de ~3 m³. ¿Deseas cotizar un flete?'
  )
}

const MENSAJE_INICIAL: Mensaje = {
  autor: 'bot',
  texto:
    '¡Hola! 👋 Soy FlexBot, tu asistente de FlexVer. Pregúntame por cubicación de materiales ' +
    '(ej: "tengo 50 sacos de cemento") o escribe "operador" para hablar con soporte humano.',
}

export default function CentroAyuda({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([MENSAJE_INICIAL])
  const [input, setInput] = useState('')
  const [escribiendo, setEscribiendo] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll al último mensaje / indicador de escritura.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, escribiendo])

  // Motor de reglas: decide la respuesta del bot según las keywords del usuario.
  const procesar = (texto: string) => {
    setEscribiendo(true)

    if (RE_OPERADOR.test(texto)) {
      // Handoff a operador humano simulado en dos tiempos.
      setTimeout(() => {
        setMensajes((m) => [
          ...m,
          { autor: 'bot', texto: 'Entiendo. Transfiriendo tu caso a un operador humano… 🎧' },
        ])
      }, 800)
      setTimeout(() => {
        const nombre = NOMBRES_OPERADOR[Math.floor(Math.random() * NOMBRES_OPERADOR.length)]
        setEscribiendo(false)
        setMensajes((m) => [
          ...m,
          {
            autor: 'operador',
            texto: `Hola, soy ${nombre}, del equipo de Soporte FlexVer. ¿En qué te puedo ayudar?`,
          },
        ])
      }, 2800)
      return
    }

    const respuesta = RE_CUBICACION.test(texto)
      ? respuestaCubicacion(texto)
      : 'Puedo ayudarte con cubicación de materiales (cemento, madera, fierro) o transferirte ' +
        'a un operador humano. Escribe "operador" si necesitas soporte. 🙂'

    setTimeout(() => {
      setEscribiendo(false)
      setMensajes((m) => [...m, { autor: 'bot', texto: respuesta }])
    }, 1400)
  }

  const enviar = () => {
    const texto = input.trim()
    if (!texto || escribiendo) return
    setMensajes((m) => [...m, { autor: 'usuario', texto }])
    setInput('')
    procesar(texto)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900/85 shadow-2xl shadow-black/60 backdrop-blur-2xl backdrop-saturate-150"
          >
            {/* Encabezado */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-secundario to-primario shadow-lg shadow-primario/30">
                <Headset className="h-5 w-5 text-white" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Centro de Ayuda</h3>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> FlexBot · respuesta inmediata
                </p>
              </div>
              <button
                onClick={onClose}
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
                  className={`flex ${m.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.autor !== 'usuario' && (
                    <span
                      className={`mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        m.autor === 'operador' ? 'bg-emerald-500/20' : 'bg-linear-to-br from-secundario to-primario'
                      }`}
                    >
                      {m.autor === 'operador' ? (
                        <Headset className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-white" />
                      )}
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-lg ${
                      m.autor === 'usuario'
                        ? 'rounded-br-sm bg-linear-to-r from-primario to-secundario text-white shadow-primario/20'
                        : m.autor === 'operador'
                          ? 'rounded-bl-sm border border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
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
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="h-1 w-1 animate-bounce rounded-full bg-slate-300"
                          style={{ animationDelay: `${d * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sugerencias rápidas */}
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {['Tengo sacos de cemento', 'Necesito un operador'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (escribiendo) return
                    setMensajes((m) => [...m, { autor: 'usuario', texto: s }])
                    procesar(s)
                  }}
                  className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Sparkles className="h-3 w-3 text-primario" /> {s}
                </button>
              ))}
            </div>

            {/* Input de texto */}
            <div className="flex items-center gap-2 border-t border-white/10 bg-white/5 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                placeholder="Escribe tu consulta…"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primario"
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || escribiendo}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-r from-primario to-secundario text-white shadow-lg shadow-primario/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
