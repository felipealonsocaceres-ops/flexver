import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Loader2,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Edge Case #1 — Widget de Clima Real (Santiago) + Estado de Tarifa           */
/*  Consume Open-Meteo (gratuita, sin API key) para mostrar la temperatura y el  */
/*  ícono del clima actual de Santiago, junto a un badge parpadeante con el      */
/*  estado de la tarifa dinámica (alta demanda vs. normal).                      */
/* -------------------------------------------------------------------------- */

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-33.4569&longitude=-70.6483&current_weather=true'

interface ClimaActual {
  temperatura: number
  codigo: number
}

// Traduce el weathercode WMO de Open-Meteo a un ícono + etiqueta legible.
function interpretarClima(codigo: number): { Icon: LucideIcon; label: string; color: string } {
  if (codigo === 0) return { Icon: Sun, label: 'Despejado', color: 'text-amber-300' }
  if (codigo <= 3) return { Icon: CloudSun, label: 'Parcial', color: 'text-amber-200' }
  if (codigo <= 48) return { Icon: CloudFog, label: 'Niebla', color: 'text-slate-300' }
  if (codigo <= 57) return { Icon: CloudDrizzle, label: 'Llovizna', color: 'text-sky-300' }
  if (codigo <= 67) return { Icon: CloudRain, label: 'Lluvia', color: 'text-sky-300' }
  if (codigo <= 77) return { Icon: CloudSnow, label: 'Nieve', color: 'text-sky-100' }
  if (codigo <= 82) return { Icon: CloudRain, label: 'Chubascos', color: 'text-sky-300' }
  if (codigo <= 86) return { Icon: CloudSnow, label: 'Nieve', color: 'text-sky-100' }
  if (codigo >= 95) return { Icon: CloudLightning, label: 'Tormenta', color: 'text-violet-300' }
  return { Icon: Cloud, label: 'Nublado', color: 'text-slate-300' }
}

// Decide el estado de tarifa: alta demanda en horas punta (mañana/tarde) o,
// fuera de ellas, con una probabilidad para dar dinamismo a la demo.
function calcularTarifaAlta(): boolean {
  const h = new Date().getHours()
  const horaPunta = (h >= 7 && h <= 10) || (h >= 18 && h <= 21)
  return horaPunta || Math.random() > 0.6
}

export default function WidgetClima() {
  const [clima, setClima] = useState<ClimaActual | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tarifaAlta] = useState(calcularTarifaAlta)

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      try {
        const res = await fetch(OPEN_METEO_URL)
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
        const data = await res.json()
        if (cancelado) return
        setClima({
          temperatura: Math.round(data.current_weather.temperature),
          codigo: data.current_weather.weathercode,
        })
      } catch (e) {
        console.error('No se pudo obtener el clima:', e)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    // Refresca cada 10 minutos para mantenerlo "en vivo".
    const id = setInterval(cargar, 600_000)
    return () => {
      cancelado = true
      clearInterval(id)
    }
  }, [])

  const info = clima ? interpretarClima(clima.codigo) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.3 }}
      className="pointer-events-none absolute right-4 top-4 z-30 flex items-stretch gap-2 md:right-6"
    >
      {/* Tarjeta de clima */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150">
        {cargando || !info || !clima ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            <span className="text-xs font-medium text-slate-300">Santiago</span>
          </>
        ) : (
          <>
            <info.Icon className={`h-6 w-6 ${info.color}`} />
            <div className="leading-tight">
              <p className="text-base font-bold text-white">{clima.temperatura}°C</p>
              <p className="text-[10px] font-medium text-slate-300">Santiago · {info.label}</p>
            </div>
          </>
        )}
      </div>

      {/* Badge parpadeante de estado de tarifa */}
      <div
        className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150 ${
          tarifaAlta
            ? 'border-red-400/40 bg-red-500/15'
            : 'border-emerald-400/40 bg-emerald-500/15'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              tarifaAlta ? 'bg-red-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              tarifaAlta ? 'bg-red-400' : 'bg-emerald-400'
            }`}
          />
        </span>
        <span className={`text-[11px] font-bold ${tarifaAlta ? 'text-red-200' : 'text-emerald-200'}`}>
          {tarifaAlta ? 'Tarifa: Alta Demanda (+15%)' : 'Tarifa: Normal'}
        </span>
      </div>
    </motion.div>
  )
}
