import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import Map, {
  Marker,
  Source,
  Layer,
  type MapRef,
  type MapMouseEvent,
  type ViewStateChangeEvent,
} from 'react-map-gl/mapbox'
import type { LineLayerSpecification } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map as MapIcon,
  Package,
  Settings,
  Truck,
  MapPin,
  Flag,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  AlertCircle,
  GripHorizontal,
  ShieldCheck,
  Bot,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import CentroPrivacidad from '../components/privacy/CentroPrivacidad'
import { useAuth } from '../context/AuthContext'
import {
  RM_CENTER,
  calcularDistanciaKm,
  obtenerRutaGeoJSON,
  reverseGeocode,
  bearingDeg,
  type RutaFeature,
} from '../lib/geo'
import { toast } from 'sonner'
import { tarifasApi, pagosApi, freightsApi, type DesgloseTarifa, type ConductorPublico } from '../lib/api'
import { celebrar } from '../lib/celebrar'
import WizardSolicitud from '../components/cliente/WizardSolicitud'
import EstadoViajeCard from '../components/cliente/EstadoViajeCard'
import MisFletesVista from '../components/cliente/MisFletesVista'
import ChatbotCubicacion from '../components/premium/ChatbotCubicacion'
import WidgetClima from '../components/premium/WidgetClima'
import EtaCard from '../components/premium/EtaCard'
import CentroAyuda from '../components/premium/CentroAyuda'
import BannerDeuda from '../components/premium/BannerDeuda'
import { useDeuda, registrarDeuda, type MetodoPago } from '../lib/deuda'
import { useUbicacionEnVivo } from '../lib/useUbicacionEnVivo'

/* -------------------------------------------------------------------------- */
/*  Navegación del sidebar                                                      */
/* -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'misfletes', label: 'Mis Fletes', icon: Package },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
] as const

type NavId = (typeof NAV_ITEMS)[number]['id']

function NavItem({
  item,
  active,
  expanded,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[number]
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
      } ${active ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
    >
      {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-violet-300" />}
      <Icon className="h-5 w-5 shrink-0" />
      {expanded && <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Categoría de volumen -> backend                                             */
/* -------------------------------------------------------------------------- */
const mapearCategoria = (m3: number): 'chica' | 'mediana' | 'grande' =>
  m3 <= 1.5 ? 'chica' : m3 <= 5 ? 'mediana' : 'grande'

/* -------------------------------------------------------------------------- */
/*  Marcador del camión (ubicación simulada en vivo)                            */
/* -------------------------------------------------------------------------- */
// React.memo: el camión solo se re-renderiza cuando cambian sus props
// primitivas (lng/lat/bearing). Mientras el cliente arrastra el mapa (onMove
// dispara muchos renders del panel) este Marker no se re-monta -> sin re-buffer.
const TruckMarker = memo(function TruckMarker({ lng, lat, bearing }: { lng: number; lat: number; bearing: number }) {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-12 w-12 animate-ping rounded-full bg-cyan-400/30" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-400/70 bg-slate-900 shadow-lg shadow-cyan-500/40">
          {/* El ícono (orientado al este) rota para mirar hacia donde avanza. */}
          <Truck
            className="h-5 w-5 text-cyan-300 transition-transform duration-300 ease-linear"
            style={{ transform: `rotate(${bearing - 90}deg)` }}
          />
        </span>
      </div>
    </Marker>
  )
})

// Punto azul de GPS en tiempo real (estilo Google Maps): la ubicación física
// real del cliente. React.memo + props primitivas (lng/lat): al arrastrar el
// mapa o avanzar el camión simulado este Marker NO se re-monta -> sin re-buffer
// del GPU. El halo "radar" usa animate-ping (composited en GPU vía transform).
const UbicacionClienteMarker = memo(function UbicacionClienteMarker({ lng, lat }: { lng: number; lat: number }) {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex items-center justify-center">
        {/* Halo radar pulsante */}
        <span className="absolute h-10 w-10 animate-ping rounded-full bg-blue-500/30" />
        <span className="absolute h-6 w-6 rounded-full bg-blue-500/20" />
        {/* Punto azul con borde blanco y resplandor */}
        <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg shadow-blue-500/50" />
      </div>
    </Marker>
  )
})

// React.memo: pines de origen/destino. Reciben solo coordenadas primitivas, así
// que no se re-renderizan al mover el mapa ni cuando avanza el camión simulado.
const MarcadoresRuta = memo(function MarcadoresRuta({
  origenLat,
  origenLng,
  destinoLat,
  destinoLng,
}: {
  origenLat: number | null
  origenLng: number | null
  destinoLat: number | null
  destinoLng: number | null
}) {
  return (
    <>
      {origenLat != null && origenLng != null && (
        <Marker longitude={origenLng} latitude={origenLat} anchor="bottom">
          <MapPin className="h-8 w-8 fill-emerald-400/30 text-emerald-400 drop-shadow-lg" />
        </Marker>
      )}
      {destinoLat != null && destinoLng != null && (
        <Marker longitude={destinoLng} latitude={destinoLat} anchor="bottom">
          <Flag className="h-7 w-7 fill-red-400/30 text-red-400 drop-shadow-lg" />
        </Marker>
      )}
    </>
  )
})

/* -------------------------------------------------------------------------- */
/*  Contenido de control del sidebar / bottom sheet                             */
/* -------------------------------------------------------------------------- */
// React.memo: el panel de control no depende del viewState ni de la posición
// del camión, así que no debe re-renderizarse cuando esos estados cambian rápido.
const ControlContent = memo(function ControlContent({
  nombre,
  hayViaje,
  bloqueado,
  onSolicitar,
  onLogout,
}: {
  nombre: string
  hayViaje: boolean
  bloqueado: boolean
  onSolicitar: () => void
  onLogout: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-white">Hola, {nombre}</h1>
        <p className="mt-1 text-sm text-slate-300">
          {bloqueado
            ? 'Tu cuenta está restringida por un pago pendiente.'
            : hayViaje
              ? 'Tienes un viaje en curso.'
              : '¿A dónde enviamos tu carga hoy?'}
        </p>
      </div>

      <button
        onClick={onSolicitar}
        disabled={hayViaje || bloqueado}
        title={bloqueado ? 'Regulariza tu pago pendiente para volver a solicitar' : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primario to-secundario py-4 font-bold text-white shadow-lg shadow-primario/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-5 w-5" />
        Solicitar nuevo flete
      </button>

      <button
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  )
})

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                        */
/* -------------------------------------------------------------------------- */
export default function PanelCliente() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string
  const mapRef = useRef<MapRef | null>(null)

  const [activeNav, setActiveNav] = useState<NavId>('mapa')
  const [privacidadOpen, setPrivacidadOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(true)
  const [nombre, setNombre] = useState('Usuario')

  // Método de pago elegido en el wizard. "Pago Contra Entrega" / "Pagar Después"
  // generan una deuda al entregar el flete (flujo anti-fraude).
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('online')
  const { deuda, regularizar } = useDeuda()

  const [viewState, setViewState] = useState({
    longitude: RM_CENTER[0],
    latitude: RM_CENTER[1],
    zoom: 11.5,
    pitch: 45,
  })

  // useMemo: estilo de la capa de la ruta (referencia estable). El movimiento de
  // las "marching ants" se aplica aparte vía setPaintProperty (fuera del render),
  // así que aquí basta con no recrear layout/paint en cada render del panel.
  const rutaLayout = useMemo<LineLayerSpecification['layout']>(
    () => ({ 'line-cap': 'round', 'line-join': 'round' }),
    [],
  )
  const rutaPaint = useMemo<LineLayerSpecification['paint']>(
    () => ({ 'line-color': '#8B5CF6', 'line-width': 5, 'line-opacity': 0.9 }),
    [],
  )

  // --- Estado del flujo ------------------------------------------------------
  const [wizardAbierto, setWizardAbierto] = useState(false)
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [fleteId, setFleteId] = useState<string | null>(null)
  const [estadoViaje, setEstadoViaje] = useState<'buscando_conductor' | 'asignado' | 'entregado' | null>(null)

  // --- Datos del viaje en construcción --------------------------------------
  const [origenDir, setOrigenDir] = useState('')
  const [origenLat, setOrigenLat] = useState<number | null>(null)
  const [origenLng, setOrigenLng] = useState<number | null>(null)
  const [destinoDir, setDestinoDir] = useState('')
  const [destinoLat, setDestinoLat] = useState<number | null>(null)
  const [destinoLng, setDestinoLng] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [volumen, setVolumen] = useState(0)
  const [distancia, setDistancia] = useState(0)

  const [desglose, setDesglose] = useState<DesgloseTarifa | null>(null)
  const [tarifaTotal, setTarifaTotal] = useState<number | null>(null)
  const [cotizando, setCotizando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagando, setPagando] = useState(false)

  // --- Mapa: ruta y camión ---------------------------------------------------
  const [ruta, setRuta] = useState<RutaFeature | null>(null)
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null)
  const [truckBearing, setTruckBearing] = useState(0)

  // Ubicación física real del cliente (GPS en vivo): "punto azul" en el mapa.
  // Le ayuda a ubicarse antes de confirmar el origen de la ferretería.
  const ubicacionCliente = useUbicacionEnVivo(true)

  // Datos reales del conductor asignado (nombre, calificación, teléfono).
  const [conductorInfo, setConductorInfo] = useState<ConductorPublico | null>(null)

  const tieneAmbosPuntos = origenLat != null && origenLng != null && destinoLat != null && destinoLng != null

  // Nombre del usuario para el saludo.
  useEffect(() => {
    if (!user) return
    supabase
      .from('usuarios')
      .select('nombre_completo')
      .eq('id_usuario', user.id)
      .single()
      .then(({ data }) => {
        if (data?.nombre_completo) setNombre(data.nombre_completo.split(' ')[0])
      })
  }, [user])

  // Realtime: sigue el estado del flete creado (buscando_conductor -> asignado -> entregado).
  useEffect(() => {
    if (!fleteId) return
    const ch = supabase
      .channel(`flete-cliente-${fleteId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fletes', filter: `id_flete=eq.${fleteId}` },
        (payload) => {
          const nuevo = (payload.new as { estado: string }).estado
          if (nuevo === 'buscando_conductor' || nuevo === 'asignado' || nuevo === 'entregado') {
            setEstadoViaje(nuevo)
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [fleteId])

  // Reacciona a los cambios de estado del viaje: notificaciones, confeti y la
  // carga de los datos reales del conductor recién asignado.
  useEffect(() => {
    if (estadoViaje === 'asignado') {
      toast.success('¡Conductor encontrado! 🚚', { description: 'Un conductor aceptó tu viaje.' })
      if (fleteId) {
        freightsApi
          .conductorDeFlete(fleteId)
          .then(setConductorInfo)
          .catch(() => setConductorInfo(null))
      }
    } else if (estadoViaje === 'entregado') {
      celebrar()
      toast.success('¡Viaje completado! 🎉', { description: 'Ya puedes pagar y calificar al conductor.' })
      // Anti-fraude: si el flete se pactó "Contra Entrega"/"Pagar Después", queda
      // una deuda pendiente que restringe la cuenta hasta regularizarla.
      if (metodoPago !== 'online' && tarifaTotal != null) {
        registrarDeuda(Math.round(tarifaTotal))
        toast.error('Pago contra entrega pendiente', {
          description: 'Tu cuenta quedó restringida hasta regularizar el pago.',
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoViaje, fleteId])

  // Dibuja la ruta cuando hay origen + destino (en wizard o en viaje) y encuadra el mapa.
  useEffect(() => {
    let cancelado = false
    const cargarRuta = async () => {
      if (!tieneAmbosPuntos) {
        if (!cancelado) setRuta(null)
        return
      }
      const r = await obtenerRutaGeoJSON([origenLng!, origenLat!], [destinoLng!, destinoLat!])
      if (cancelado) return
      const data: RutaFeature =
        r ?? {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [[origenLng!, origenLat!], [destinoLng!, destinoLat!]] },
        }
      setRuta(data)
      const lngs = [origenLng!, destinoLng!]
      const lats = [origenLat!, destinoLat!]
      mapRef.current?.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 80, bottom: 360, left: 80, right: 80 }, maxZoom: 14, duration: 800 },
      )
    }
    cargarRuta()
    return () => {
      cancelado = true
    }
  }, [tieneAmbosPuntos, origenLat, origenLng, destinoLat, destinoLng])

  // Camión simulado: avanza a lo largo de la ruta mientras el viaje está asignado.
  // El marcador se limpia en el cleanup al salir del estado 'asignado'.
  useEffect(() => {
    if (estadoViaje !== 'asignado' || !ruta) return
    const coords = ruta.geometry.coordinates
    if (coords.length === 0) return
    let i = 0
    const id = setInterval(() => {
      const idx = Math.min(i, coords.length - 1)
      setTruckPos(coords[idx])
      if (idx + 1 < coords.length) setTruckBearing(bearingDeg(coords[idx], coords[idx + 1]))
      if (i >= coords.length - 1) {
        clearInterval(id)
        return
      }
      i += 1
    }, 400)
    return () => {
      clearInterval(id)
      setTruckPos(null)
    }
  }, [estadoViaje, ruta])

  // Trazado "vivo": anima la línea de ruta con un dash en movimiento (marching
  // ants) mientras haya ruta dibujada. Es puramente visual sobre el layer ya creado.
  useEffect(() => {
    if (!ruta) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const LAYER = 'ruta-cliente-linea'
    const secuencia = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
      [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2],
      [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ]
    let paso = 0
    const id = setInterval(() => {
      if (!map.getLayer(LAYER)) return
      paso = (paso + 1) % secuencia.length
      try {
        map.setPaintProperty(LAYER, 'line-dasharray', secuencia[paso])
      } catch {
        /* el estilo aún no termina de cargar; el próximo tick lo intentará */
      }
    }, 70)
    return () => clearInterval(id)
  }, [ruta])

  // Cotiza al entrar al paso 3 o al cambiar el volumen.
  useEffect(() => {
    if (!(wizardAbierto && paso === 3 && tieneAmbosPuntos)) return
    let cancelado = false
    const cotizar = async () => {
      setCotizando(true)
      setError('')
      try {
        const data = await tarifasApi.cotizar({
          categoria: mapearCategoria(volumen),
          latitud_origen: origenLat!,
          longitud_origen: origenLng!,
          latitud_destino: destinoLat!,
          longitud_destino: destinoLng!,
        })
        if (cancelado) return
        setDesglose(data.desglose)
        setTarifaTotal(data.tarifa_total)
      } catch (e) {
        if (cancelado) return
        setDesglose(null)
        setTarifaTotal(null)
        setError(e instanceof Error ? e.message : 'No se pudo cotizar')
      } finally {
        if (!cancelado) setCotizando(false)
      }
    }
    cotizar()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardAbierto, paso, volumen])

  // --- Selección de puntos ---------------------------------------------------
  const fijarOrigen = useCallback(
    (dir: string, lng: number, lat: number) => {
      setOrigenDir(dir)
      setOrigenLng(lng)
      setOrigenLat(lat)
      if (destinoLat != null && destinoLng != null) setDistancia(calcularDistanciaKm(lat, lng, destinoLat, destinoLng))
    },
    [destinoLat, destinoLng],
  )

  const fijarDestino = useCallback(
    (dir: string, lng: number, lat: number) => {
      setDestinoDir(dir)
      setDestinoLng(lng)
      setDestinoLat(lat)
      if (origenLat != null && origenLng != null) setDistancia(calcularDistanciaKm(origenLat, origenLng, lat, lng))
    },
    [origenLat, origenLng],
  )

  // Clic en el mapa: fija origen (paso 1) o destino (paso 2) con reverse geocoding.
  const handleMapClick = (e: MapMouseEvent) => {
    if (!wizardAbierto) return
    const { lng, lat } = e.lngLat
    if (paso === 1) {
      fijarOrigen('', lng, lat)
      reverseGeocode(lng, lat).then((d) => d && setOrigenDir(d))
    } else if (paso === 2) {
      fijarDestino('', lng, lat)
      reverseGeocode(lng, lat).then((d) => d && setDestinoDir(d))
    }
  }

  // --- Acciones del flujo ----------------------------------------------------
  // useCallback: identidad estable -> el ControlContent memoizado no se re-renderiza
  // por este handler cuando el panel re-renderiza (viewState / camión simulado).
  const abrirWizard = useCallback(() => {
    if (deuda.pendiente) {
      toast.error('Tienes un pago pendiente', {
        description: 'Regulariza tu deuda para volver a solicitar fletes.',
      })
      return
    }
    setWizardAbierto(true)
    setActiveNav('mapa')
    setPaso(1)
    setError('')
  }, [deuda.pendiente])

  // Pre-llenado desde el asistente de cubicación (IA Logística): abre el wizard
  // con la descripción y el volumen sugeridos; el cliente solo elige origen/destino.
  const prellenarDesdeIA = (descripcionIA: string, volumenIA: number) => {
    setDescripcion(descripcionIA)
    setVolumen(volumenIA)
    abrirWizard()
    toast.success('Formulario pre-llenado por IA 🤖', {
      description: 'Elige origen y destino para cotizar tu flete.',
    })
  }

  const resetViaje = () => {
    setWizardAbierto(false)
    setFleteId(null)
    setEstadoViaje(null)
    setPaso(1)
    setOrigenDir(''); setOrigenLat(null); setOrigenLng(null)
    setDestinoDir(''); setDestinoLat(null); setDestinoLng(null)
    setDescripcion(''); setVolumen(0); setDistancia(0)
    setDesglose(null); setTarifaTotal(null); setRuta(null); setTruckPos(null); setTruckBearing(0)
    setConductorInfo(null)
    setMetodoPago('online')
    setViewState((v) => ({ ...v, longitude: RM_CENTER[0], latitude: RM_CENTER[1], zoom: 11.5 }))
  }

  const handleConfirmar = async () => {
    if (!user || tarifaTotal === null || origenLat == null || destinoLat == null) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('fletes')
      .insert({
        id_usuario: user.id,
        origen_direccion: origenDir,
        origen_lat: origenLat,
        origen_lng: origenLng,
        destino_direccion: destinoDir,
        destino_lat: destinoLat,
        destino_lng: destinoLng,
        descripcion_carga: descripcion,
        distancia_km: distancia,
        monto_total: tarifaTotal,
        estado: 'buscando_conductor',
      })
      .select()
      .single()
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setFleteId(data.id_flete)
    setEstadoViaje('buscando_conductor')
    setWizardAbierto(false)
  }

  const handleCancelar = async () => {
    if (fleteId) await supabase.from('fletes').update({ estado: 'cancelado' }).eq('id_flete', fleteId)
    resetViaje()
  }

  // Inicia el pago Transbank del viaje ya entregado: crea la fila de pago
  // (FK id_flete), guarda el contexto para retomarlo al volver del redirect y
  // redirige a Webpay. La confirmación + calificación ocurren en /pago/confirmar.
  const handlePagar = async () => {
    if (!fleteId || tarifaTotal == null) return
    setPagando(true)
    setError('')
    try {
      const monto = Math.round(tarifaTotal)
      await supabase.from('pagos').insert({ id_flete: fleteId, monto, estado_pago: 'pendiente' })
      localStorage.setItem('flexver_pago', JSON.stringify({ id_flete: fleteId, monto }))
      const { url, token } = await pagosApi.iniciar(fleteId, monto)
      window.location.href = `${url}?token_ws=${token}`
    } catch (e) {
      setPagando(false)
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago')
    }
  }

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }, [navigate])

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

  const hayViaje = estadoViaje != null
  const cursorMapa = wizardAbierto && (paso === 1 || paso === 2) ? 'crosshair' : 'grab'

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e1a]">
      {/* ============================== MAPA =============================== */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState((v) => ({ ...v, ...evt.viewState }))}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
        cursor={cursorMapa}
        style={{ width: '100%', height: '100%' }}
      >
        {/* El GeoJSON `ruta` vive en estado: su referencia solo cambia al recalcular
            la ruta, por lo que Mapbox no re-llena el buffer del GPU en cada render. */}
        {ruta && (
          <Source id="ruta-cliente" type="geojson" data={ruta}>
            <Layer id="ruta-cliente-linea" type="line" layout={rutaLayout} paint={rutaPaint} />
          </Source>
        )}

        {/* Pines de origen/destino (memoizados, props primitivas) */}
        <MarcadoresRuta
          origenLat={origenLat}
          origenLng={origenLng}
          destinoLat={destinoLat}
          destinoLng={destinoLng}
        />
        {truckPos && <TruckMarker lng={truckPos[0]} lat={truckPos[1]} bearing={truckBearing} />}

        {/* Punto azul GPS: ubicación física real del cliente, en tiempo real. */}
        {ubicacionCliente && (
          <UbicacionClienteMarker lng={ubicacionCliente.lng} lat={ubicacionCliente.lat} />
        )}
      </Map>

      {/* Widget de clima real (Santiago) + estado de tarifa — solo en el mapa. */}
      {activeNav === 'mapa' && !deuda.pendiente && <WidgetClima />}

      {/* ETA dinámico (estilo PedidosYa) — mientras el conductor va en camino. */}
      <AnimatePresence>
        {activeNav === 'mapa' && estadoViaje === 'asignado' && (
          <EtaCard duracionSeg={ruta?.properties.duration ?? null} />
        )}
      </AnimatePresence>

      {/* Banner anti-fraude: cuenta restringida por pago pendiente. */}
      <AnimatePresence>
        {deuda.pendiente && (
          <BannerDeuda
            monto={deuda.monto}
            onRegularizar={() => {
              regularizar()
              toast.success('¡Pago regularizado! ✅', { description: 'Tu cuenta vuelve a estar activa.' })
            }}
          />
        )}
      </AnimatePresence>

      {/* Vista interna "Mis Fletes" (se superpone al mapa) */}
      {activeNav === 'misfletes' && (
        <div className="absolute inset-0 z-10 overflow-y-auto px-4 py-6 pb-28 md:py-8 md:pr-8 md:pb-8 md:pl-83">
          <MisFletesVista />
        </div>
      )}
      {activeNav === 'ajustes' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 md:pl-80">
          <div className="w-full max-w-md transform-gpu rounded-3xl border border-white/15 bg-gray-900/80 p-6 text-slate-300 backdrop-blur-md">
            <div className="mb-5 flex items-center gap-3">
              <Settings className="h-6 w-6 text-slate-400" />
              <p className="text-lg font-semibold text-white">Ajustes</p>
            </div>

            {/* Privacidad: gestión de consentimientos (Ley 21.719) */}
            <button
              onClick={() => setPrivacidadOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primario to-secundario">
                <ShieldCheck className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Centro de Privacidad</span>
                <span className="block text-xs text-slate-400">Gestiona tus consentimientos y revisa la política.</span>
              </span>
            </button>

            {/* Centro de Ayuda: chatbot interactivo + soporte humano. */}
            <button
              onClick={() => setAyudaOpen(true)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-secundario to-primario">
                <Bot className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Centro de Ayuda</span>
                <span className="block text-xs text-slate-400">Asistente inteligente y soporte humano 24/7.</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tarjetas del flujo (wizard / estado del viaje) — solo en la vista Mapa */}
      {activeNav === 'mapa' && (
        <AnimatePresence>
          {wizardAbierto && (
            <WizardSolicitud
              key="wizard"
              paso={paso}
              setPaso={setPaso}
              origenDir={origenDir}
              origenSel={origenLat != null}
              destinoDir={destinoDir}
              destinoSel={destinoLat != null}
              descripcion={descripcion}
              setDescripcion={setDescripcion}
              volumen={volumen}
              setVolumen={setVolumen}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              distancia={distancia}
              cotizando={cotizando}
              desglose={desglose}
              tarifaTotal={tarifaTotal}
              error={error}
              loading={loading}
              onSeleccionarOrigen={fijarOrigen}
              onSeleccionarDestino={fijarDestino}
              onConfirmar={handleConfirmar}
              onCerrar={resetViaje}
            />
          )}
          {!wizardAbierto && hayViaje && estadoViaje && fleteId && (
            <EstadoViajeCard
              key="estado"
              estado={estadoViaje}
              idFlete={fleteId}
              origenDir={origenDir}
              destinoDir={destinoDir}
              distancia={distancia}
              tarifaTotal={tarifaTotal}
              pagando={pagando}
              conductor={conductorInfo}
              onCancelar={handleCancelar}
              onPagar={handlePagar}
              onCerrar={resetViaje}
            />
          )}
        </AnimatePresence>
      )}

      {/* ===================== DESKTOP — Sidebar glass ===================== */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarExpanded ? 300 : 84 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="absolute bottom-4 left-4 top-4 z-20 hidden transform-gpu flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150 md:flex"
      >
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

        <AnimatePresence initial={false}>
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto border-t border-white/10 p-5"
            >
              <ControlContent nombre={nombre} hayViaje={hayViaje} bloqueado={deuda.pendiente} onSolicitar={abrirWizard} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ===================== MÓVIL — Bottom sheet ======================= */}
      <div className="md:hidden">
        <nav className="absolute inset-x-0 bottom-0 z-30 flex transform-gpu items-center justify-around border-t border-white/20 bg-white/10 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl backdrop-saturate-150">
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

        {/* Bottom sheet de control: solo cuando no hay tarjeta de flujo activa */}
        {!wizardAbierto && !hayViaje && (
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
            className="absolute inset-x-0 bottom-17 z-20 max-h-[75vh] transform-gpu overflow-y-auto rounded-t-3xl border-t border-white/20 bg-white/10 p-5 pb-8 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150"
          >
            <button onClick={() => setSheetOpen((v) => !v)} className="mx-auto mb-4 flex w-full flex-col items-center">
              <GripHorizontal className="h-5 w-5 text-slate-300" />
            </button>
            <ControlContent nombre={nombre} hayViaje={hayViaje} bloqueado={deuda.pendiente} onSolicitar={abrirWizard} onLogout={handleLogout} />
          </motion.div>
        )}
      </div>

      {/* Asistente de Cubicación (IA Logística) — solo en la vista Mapa, sin flujo activo. */}
      {activeNav === 'mapa' && !wizardAbierto && !hayViaje && (
        <ChatbotCubicacion onPrellenar={prellenarDesdeIA} />
      )}

      {/* Centro de Privacidad: gestión de consentimientos del cliente. */}
      <CentroPrivacidad open={privacidadOpen} onClose={() => setPrivacidadOpen(false)} />

      {/* Centro de Ayuda: chatbot interactivo con motor de reglas + soporte humano. */}
      <CentroAyuda open={ayudaOpen} onClose={() => setAyudaOpen(false)} />
    </div>
  )
}
