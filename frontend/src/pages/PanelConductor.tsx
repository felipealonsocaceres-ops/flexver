import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Map, {
  Marker,
  Source,
  Layer,
  type ViewStateChangeEvent,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Navigation,
  Power,
  MapPin,
  AlertCircle,
  Map as MapIcon,
  LayoutDashboard,
  BarChart3,
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  CheckCircle2,
  KeyRound,
  X,
  Flag,
} from 'lucide-react'
import DashboardVista from '../components/panel/DashboardVista'
import MetricasVista from '../components/panel/MetricasVista'
import VehiculoVista from '../components/panel/VehiculoVista'
import { toast } from 'sonner'
import { obtenerRutaGeoJSON, calcularDistanciaKm, type RutaFeature } from '../lib/geo'
import { codigoDeFlete } from '../lib/codigoEntrega'
import { celebrar } from '../lib/celebrar'
import OnboardingGuard from '../components/privacy/OnboardingGuard'
import CentroPrivacidad from '../components/privacy/CentroPrivacidad'
import type { EstadoVerificacion } from '../types'

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                       */
/* -------------------------------------------------------------------------- */

interface LngLat {
  longitude: number
  latitude: number
}

interface FleteSolicitud {
  id_flete: string
  origen_direccion: string
  origen_lat: number
  origen_lng: number
  destino_direccion: string
  destino_lat: number
  destino_lng: number
  monto_total: number
  estado: string
}

interface NavItemConfig {
  id: string
  label: string
  icon: typeof Truck
}

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                  */
/* -------------------------------------------------------------------------- */

// Ubicación actual del conductor (demo): coincide con la universidad.
// La ruta del flete (origen/destino + trazado) se agregará más adelante
// a partir de la solicitud que envíe el cliente.
const INITIAL_TRUCK: LngLat = { longitude: -70.6622, latitude: -33.4445 }

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'mapa', label: 'Mapa de Fletes', icon: MapIcon },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'metricas', label: 'Mis Métricas', icon: BarChart3 },
  { id: 'vehiculo', label: 'Mi Vehículo', icon: Truck },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
]

/* -------------------------------------------------------------------------- */
/*  Sub-componente: NavItem reutilizable                                        */
/*  Muestra solo el ícono cuando el sidebar está contraído, e ícono + texto     */
/*  cuando está expandido.                                                       */
/* -------------------------------------------------------------------------- */

function NavItem({
  item,
  active,
  expanded,
  onClick,
}: {
  item: NavItemConfig
  active: boolean
  expanded: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      title={item.label}
      className={`group relative flex items-center rounded-xl transition-colors ${
        expanded ? 'w-full gap-3 px-3 py-2.5' : 'h-11 w-11 justify-center'
      } ${
        active
          ? 'bg-white/15 text-white'
          : 'text-slate-200 hover:bg-white/10 hover:text-white'
      }`}
    >
      {/* Indicador del item activo */}
      {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-300" />}
      <Icon className="h-5 w-5 shrink-0" />
      {/* El texto solo se renderiza cuando el sidebar está abierto */}
      {expanded && <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-componente: contenido de control (compartido sidebar / bottom sheet)    */
/* -------------------------------------------------------------------------- */

function ControlContent({
  isOnline,
  onToggleOnline,
  truckLocation,
}: {
  isOnline: boolean
  onToggleOnline: () => void
  truckLocation: LngLat
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <Navigation className="h-5 w-5 text-secundario" />
            Panel de Viajes
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {isOnline ? 'Buscando solicitudes cercanas...' : 'Estás desconectado'}
          </p>
        </div>

        {isOnline && (
          <span className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secundario opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-secundario" />
          </span>
        )}
      </div>

      {/* Botón conectar / desconectar */}
      <button
        onClick={onToggleOnline}
        className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 font-bold transition-all ${
          isOnline
            ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            : 'bg-linear-to-r from-primario to-secundario text-white shadow-lg shadow-primario/25 hover:opacity-90'
        }`}
      >
        <Power className="h-5 w-5" />
        {isOnline ? 'Desconectarse' : 'Conectarse para recibir viajes'}
      </button>

      {/* Tarjeta de estado / ubicación en vivo */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-slate-400" />
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-200">Ubicación Actual</h3>
            <p className="mt-1 text-xs text-slate-400">
              {isOnline
                ? `${truckLocation.latitude.toFixed(4)}, ${truckLocation.longitude.toFixed(4)}`
                : 'Esperando señal GPS...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-componente: marcador del vehículo (ubicación en tiempo real)            */
/*  Es el panel del conductor: mostramos un camioncito con halo pulsante para   */
/*  dar la sensación de posición en vivo.                                        */
/* -------------------------------------------------------------------------- */

function VehicleMarker({ location }: { location: LngLat }) {
  return (
    <Marker longitude={location.longitude} latitude={location.latitude} anchor="center">
      <div className="relative flex items-center justify-center">
        {/* Halo pulsante: sensación de ubicación en vivo */}
        <span className="absolute h-14 w-14 animate-ping rounded-full bg-cyan-400/30" />
        <span className="absolute h-10 w-10 rounded-full bg-cyan-400/20" />
        {/* Badge con el ícono del vehículo */}
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-400/70 bg-slate-900 shadow-lg shadow-cyan-500/40">
          <Truck className="h-5 w-5 text-cyan-300" />
        </span>
      </div>
    </Marker>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

// Formatea un monto a pesos chilenos: 5000 -> "$5.000"
function formatearCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto)
}


/* -------------------------------------------------------------------------- */
/*  Sub-componente: tarjeta flotante de nueva solicitud de flete                */
/* -------------------------------------------------------------------------- */

function TarjetaNuevaSolicitud({
  flete,
  onAceptar,
  onRechazar,
}: {
  flete: FleteSolicitud
  onAceptar: () => void
  onRechazar: () => void
}) {
  const distanciaKm = calcularDistanciaKm(
    flete.origen_lat,
    flete.origen_lng,
    flete.destino_lat,
    flete.destino_lng,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="absolute bottom-6 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-900/70 p-5 shadow-2xl shadow-black/50 backdrop-blur-md backdrop-saturate-150"
    >
      {/* Encabezado */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secundario opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-secundario" />
          </span>
          <h2 className="text-base font-bold text-white">¡Nueva solicitud de viaje!</h2>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
          {distanciaKm.toFixed(1)} km
        </span>
      </div>

      {/* Origen y destino */}
      <div className="mb-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Origen</p>
            <p className="truncate text-sm text-white">{flete.origen_direccion}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-400 ring-4 ring-red-400/20" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Destino</p>
            <p className="truncate text-sm text-white">{flete.destino_direccion}</p>
          </div>
        </div>
      </div>

      {/* Monto a ganar */}
      <div className="mb-5 flex items-baseline justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-sm text-slate-300">Ganancia estimada</span>
        <span className="text-2xl font-bold text-emerald-400">{formatearCLP(flete.monto_total)}</span>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={onRechazar}
          className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-bold text-red-400 transition-colors hover:bg-red-500/20"
        >
          Rechazar
        </button>
        <button
          onClick={onAceptar}
          className="flex-2 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-500/25 transition-opacity hover:opacity-90"
        >
          Aceptar Viaje
        </button>
      </div>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-componente: tarjeta del viaje YA aceptado (persiste hasta finalizar)    */
/* -------------------------------------------------------------------------- */

function TarjetaViajeActivo({
  flete,
  onFinalizar,
}: {
  flete: FleteSolicitud
  onFinalizar: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="absolute bottom-6 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-900/70 p-5 shadow-2xl shadow-black/50 backdrop-blur-md backdrop-saturate-150"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-cyan-300" />
          <h2 className="text-base font-bold text-white">Viaje en curso</h2>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
          En camino
        </span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Origen</p>
            <p className="truncate text-sm text-white">{flete.origen_direccion}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Destino</p>
            <p className="truncate text-sm text-white">{flete.destino_direccion}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-baseline justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-sm text-slate-300">Ganancia del viaje</span>
        <span className="text-2xl font-bold text-emerald-400">{formatearCLP(flete.monto_total)}</span>
      </div>

      <button
        onClick={onFinalizar}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primario to-secundario py-3 font-bold text-white shadow-lg shadow-primario/25 transition-opacity hover:opacity-90"
      >
        <CheckCircle2 className="h-5 w-5" />
        Llegué — Finalizar viaje
      </button>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-componente: modal para ingresar el código de entrega del cliente        */
/* -------------------------------------------------------------------------- */

function ModalCodigo({
  valor,
  error,
  onChange,
  onConfirmar,
  onCerrar,
}: {
  valor: string
  error: string
  onChange: (v: string) => void
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primario/20">
              <KeyRound className="h-5 w-5 text-primario" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Código de entrega</h3>
              <p className="text-xs text-slate-400">Pídeselo al cliente</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          autoFocus
          inputMode="numeric"
          maxLength={4}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && onConfirmar()}
          placeholder="0000"
          className="w-full rounded-xl border border-white/15 bg-white/5 py-4 text-center font-mono text-3xl font-bold tracking-[0.5em] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primario"
        />

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={onConfirmar}
          disabled={valor.length < 4}
          className="mt-4 w-full rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirmar entrega
        </button>
      </motion.div>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                        */
/* -------------------------------------------------------------------------- */

export default function PanelConductor() {
  const { user } = useAuth()
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

  // ---------------------------------------------------------------------------
  // Guardián de Onboarding: hasta que el conductor esté 'aprobado', NO montamos
  // el mapa de fletes ni la telemetría. Resolvemos su estado antes de todo.
  // ---------------------------------------------------------------------------
  const [estadoVerificacion, setEstadoVerificacion] = useState<EstadoVerificacion | null>(null)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    let cancelado = false
    const cargarEstado = async () => {
      if (!user) return
      const { data } = await supabase
        .from('conductores')
        .select('estado_verificacion')
        .eq('id_usuario', user.id)
        .single()
      if (!cancelado) {
        setEstadoVerificacion((data?.estado_verificacion as EstadoVerificacion) ?? 'faltan_documentos')
        setVerificando(false)
      }
    }
    cargarEstado()
    return () => { cancelado = true }
  }, [user])

  const [isOnline, setIsOnline] = useState(false)
  const [activeNav, setActiveNav] = useState('mapa')
  const [nuevoFlete, setNuevoFlete] = useState<FleteSolicitud | null>(null)
  // El viaje que el conductor ya aceptó. No se borra al cerrar la oferta.
  const [viajeActivo, setViajeActivo] = useState<FleteSolicitud | null>(null)
  // Geometría de la ruta (origen -> destino) que se dibuja en el mapa.
  const [ruta, setRuta] = useState<RutaFeature | null>(null)

  // Modal de finalización: ingreso del código de entrega del cliente.
  const [finalizando, setFinalizando] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoError, setCodigoError] = useState('')

  // Sidebar (desktop) retráctil y bottom sheet (móvil) abierto/cerrado.
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(true)

  const [viewState, setViewState] = useState({
    longitude: INITIAL_TRUCK.longitude,
    latitude: INITIAL_TRUCK.latitude,
    zoom: 14.5,
    pitch: 45, // Inclinación para efecto 3D
  })

  // ---------------------------------------------------------------------------
  // Realtime: escucha de solicitudes de flete pagadas (Supabase)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Solo escuchamos si el conductor está conectado/activo.
    if (!isOnline) return

    // Suscripción al canal de Postgres Changes sobre la tabla "fletes".
    const channel = supabase
      .channel('fletes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT y UPDATE
          schema: 'public',
          table: 'fletes',
        },
        (payload) => {
          const flete = payload.new as FleteSolicitud

          // Solo nos interesa cuando el flete ya fue pagado
          // y pasó a estado 'buscando_conductor'.
          if (flete?.estado === 'buscando_conductor') {
            console.log('🚛💰 ¡NUEVO FLETE PAGADO Y DISPONIBLE!', flete)
            setNuevoFlete(flete)
            toast('🚚 Nueva solicitud de viaje', {
              description: `${flete.origen_direccion} → ${flete.destino_direccion}`,
            })
          }
        },
      )
      .subscribe()

    // 🧹 Cleanup: al desmontar o si isOnline cambia, removemos el canal.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOnline])

  // ---------------------------------------------------------------------------
  // Dibuja la ruta del flete activo (o de la oferta vigente) en el mapa.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const flete = viajeActivo ?? nuevoFlete
    let cancelado = false

    const cargarRuta = async () => {
      if (!flete || !mapboxToken) {
        if (!cancelado) setRuta(null)
        return
      }
      const r = await obtenerRutaGeoJSON(
        [flete.origen_lng, flete.origen_lat],
        [flete.destino_lng, flete.destino_lat],
      )
      if (!cancelado) setRuta(r)
    }

    cargarRuta()
    return () => {
      cancelado = true
    }
  }, [viajeActivo, nuevoFlete, mapboxToken])

  // Acepta el viaje: hace el UPDATE en Supabase y lo deja como viaje activo.
  const handleAceptarViaje = async (flete: FleteSolicitud) => {
    if (!user) {
      console.error('❌ No hay conductor autenticado')
      return
    }

    // fletes.id_conductor referencia a conductores.id_conductor (PK propio),
    // NO al uid de Auth. Resolvemos el id_conductor real vía id_usuario.
    const { data: conductor, error: errConductor } = await supabase
      .from('conductores')
      .select('id_conductor')
      .eq('id_usuario', user.id)
      .single()

    if (errConductor || !conductor) {
      console.error('❌ No se encontró el perfil de conductor:', errConductor?.message)
      return
    }

    const { error } = await supabase
      .from('fletes')
      .update({ estado: 'asignado', id_conductor: conductor.id_conductor })
      .eq('id_flete', flete.id_flete)
      // Evita carreras: solo acepta si sigue disponible (otro conductor pudo tomarlo).
      .eq('estado', 'buscando_conductor')

    if (error) {
      console.error('❌ Error al aceptar el viaje:', error.message)
      return
    }

    console.log('✅ Viaje ASIGNADO en BD:', flete.id_flete)
    setViajeActivo(flete) // 🔒 queda en pantalla (no se pierde)
    setNuevoFlete(null) // 👋 cierra la tarjeta de oferta
    toast.success('¡Viaje aceptado!', { description: 'Dirígete al punto de origen.' })
  }

  // Abre el modal de finalización (al llegar al destino).
  const handleAbrirFinalizar = () => {
    setCodigoInput('')
    setCodigoError('')
    setFinalizando(true)
  }

  // Finaliza el viaje: valida el código de entrega contra el del flete y, si
  // coincide, lo marca como 'entregado' en la BD (el cliente lo ve en vivo).
  const handleConfirmarEntrega = async () => {
    if (!viajeActivo) return
    if (codigoInput.trim() !== codigoDeFlete(viajeActivo.id_flete)) {
      setCodigoError('Código incorrecto. Pídeselo al cliente.')
      toast.error('Código incorrecto')
      return
    }
    const { error } = await supabase
      .from('fletes')
      .update({ estado: 'entregado' })
      .eq('id_flete', viajeActivo.id_flete)
    if (error) {
      setCodigoError(error.message)
      return
    }
    setFinalizando(false)
    setViajeActivo(null)
    setRuta(null)
    setCodigoInput('')
    setCodigoError('')
    celebrar()
    toast.success('¡Viaje finalizado! 🎉', { description: 'El cobro se procesará al cliente.' })
  }

  // 🔒 GUARDIÁN DE ONBOARDING — bloqueo total hasta la aprobación.
  // Mientras resolvemos el estado, mostramos un loader (no filtramos el mapa).
  if (verificando) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0e1a] text-slate-300">
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-ping rounded-full bg-primario" /> Verificando tu estado de cuenta…
        </span>
      </div>
    )
  }
  // Cualquier estado distinto de 'aprobado' bloquea el mapa de fletes y la
  // telemetría: el componente del mapa ni siquiera se monta.
  if (estadoVerificacion && estadoVerificacion !== 'aprobado') {
    return <OnboardingGuard estado={estadoVerificacion} />
  }

  if (!mapboxToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] p-4 text-white">
        <div className="flex items-center gap-4 rounded-xl border border-red-900/50 bg-red-950/30 p-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <h2 className="text-lg font-bold">Falta el Token de Mapbox</h2>
            <p className="text-sm text-slate-400">Agrega VITE_MAPBOX_TOKEN a tu archivo .env</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e1a]">
      {/* ============================== MAPA =============================== */}
      {/* Mapa a pantalla completa, estilo oscuro, centrado en Santiago.      */}
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Ubicación en tiempo real del conductor (camioncito) */}
        <VehicleMarker location={INITIAL_TRUCK} />

        {/* Trazado de la ruta (origen -> destino) */}
        {ruta && (
          <Source id="ruta" type="geojson" data={ruta}>
            <Layer
              id="ruta-linea"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#22d3ee', 'line-width': 5, 'line-opacity': 0.85 }}
            />
          </Source>
        )}

        {/* Origen y destino del flete activo o de la oferta vigente */}
        {(() => {
          const flete = viajeActivo ?? nuevoFlete
          if (!flete) return null
          return (
            <>
              <Marker longitude={flete.origen_lng} latitude={flete.origen_lat} anchor="bottom">
                <MapPin className="h-8 w-8 fill-emerald-400/30 text-emerald-400 drop-shadow-lg" />
              </Marker>
              <Marker longitude={flete.destino_lng} latitude={flete.destino_lat} anchor="bottom">
                <MapPin className="h-8 w-8 fill-red-400/30 text-red-400 drop-shadow-lg" />
              </Marker>
            </>
          )
        })()}
      </Map>

      {/* Overlay oscuro cuando está desconectado */}
      {!isOnline && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/40 backdrop-blur-[2px] transition-all duration-500" />
      )}

      {/* Tarjeta flotante de nueva solicitud (Realtime) — solo si no hay viaje activo */}
      <AnimatePresence>
        {nuevoFlete && !viajeActivo && (
          <TarjetaNuevaSolicitud
            flete={nuevoFlete}
            onAceptar={() => handleAceptarViaje(nuevoFlete)}
            onRechazar={() => {
              console.log('❌ Viaje RECHAZADO:', nuevoFlete.id_flete)
              setNuevoFlete(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Tarjeta del viaje aceptado: persiste hasta finalizar con el código */}
      <AnimatePresence>
        {viajeActivo && <TarjetaViajeActivo flete={viajeActivo} onFinalizar={handleAbrirFinalizar} />}
      </AnimatePresence>

      {/* Modal de ingreso del código de entrega */}
      <AnimatePresence>
        {finalizando && viajeActivo && (
          <ModalCodigo
            valor={codigoInput}
            error={codigoError}
            onChange={(v) => {
              setCodigoInput(v)
              setCodigoError('')
            }}
            onConfirmar={handleConfirmarEntrega}
            onCerrar={() => setFinalizando(false)}
          />
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/*  Vistas internas del menú (se superponen al mapa)                      */}
      {/*  'mapa' y 'ajustes' no tienen panel: se ve el mapa de fondo.           */}
      {/* ===================================================================== */}
      {(activeNav === 'dashboard' || activeNav === 'metricas' || activeNav === 'vehiculo') && (
        <div className="absolute inset-0 z-10 overflow-y-auto px-4 py-6 pb-28 md:py-8 md:pr-8 md:pb-8 md:pl-83">
          {activeNav === 'dashboard' && <DashboardVista />}
          {activeNav === 'metricas' && <MetricasVista />}
          {activeNav === 'vehiculo' && <VehiculoVista />}
        </div>
      )}

      {/* ===================================================================== */}
      {/*  DESKTOP — Sidebar retráctil flotante con Glassmorphism                */}
      {/*  Glass: backdrop-blur-2xl backdrop-saturate-150 + bg-white/10 + border-white/20            */}
      {/* ===================================================================== */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarExpanded ? 300 : 84 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="absolute bottom-4 left-4 top-4 z-20 hidden flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150 md:flex"
      >
        {/* Encabezado: marca + botón expandir / contraer */}
        <div className="flex items-center gap-3 border-b border-white/10 p-3">
          {sidebarExpanded && (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primario to-secundario">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="flex-1 truncate text-lg font-bold text-white">FlexVer</span>
            </>
          )}
          <button
            onClick={() => setSidebarExpanded((v) => !v)}
            title={sidebarExpanded ? 'Contraer' : 'Expandir'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white ${
              sidebarExpanded ? '' : 'mx-auto'
            }`}
          >
            {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navegación: NavItem reutilizable */}
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeNav === item.id}
              expanded={sidebarExpanded}
              onClick={() => setActiveNav(item.id)}
            />
          ))}
        </nav>

        {/* Panel de control (estado en línea / ubicación) — solo expandido */}
        <AnimatePresence initial={false}>
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto border-t border-white/10 p-5"
            >
              <ControlContent
                isOnline={isOnline}
                onToggleOnline={() => setIsOnline((v) => !v)}
                truckLocation={INITIAL_TRUCK}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ===================================================================== */}
      {/*  MÓVIL — Bottom Sheet deslizable (oculto en desktop)                  */}
      {/* ===================================================================== */}
      <div className="md:hidden">
        {/* Barra de navegación inferior fija (mismo glass azulado) */}
        <nav className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/20 bg-white/10 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl backdrop-saturate-150">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] transition-colors ${
                  active ? 'text-white' : 'text-slate-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-14 truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Panel deslizable (Bottom Sheet) con Glassmorphism */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80) setSheetOpen(false)
            else if (info.offset.y < -80) setSheetOpen(true)
          }}
          initial={false}
          animate={{ y: sheetOpen ? 0 : 'calc(100% - 92px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="absolute inset-x-0 bottom-17 z-20 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-white/20 bg-white/10 p-5 pb-8 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150"
        >
          {/* Asa de arrastre */}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className="mx-auto mb-4 flex w-full flex-col items-center"
          >
            <GripHorizontal className="h-5 w-5 text-slate-300" />
          </button>

          <ControlContent
            isOnline={isOnline}
            onToggleOnline={() => setIsOnline((v) => !v)}
            truckLocation={INITIAL_TRUCK}
          />
        </motion.div>
      </div>

      {/* Centro de Privacidad: se abre desde el item "Ajustes" del menú. */}
      <CentroPrivacidad open={activeNav === 'ajustes'} onClose={() => setActiveNav('mapa')} />
    </div>
  )
}
