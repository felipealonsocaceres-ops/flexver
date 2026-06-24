import { useState } from 'react'
import Map, {
  Marker,
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
} from 'lucide-react'
import DashboardVista from '../components/panel/DashboardVista'
import MetricasVista from '../components/panel/MetricasVista'
import VehiculoVista from '../components/panel/VehiculoVista'

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                       */
/* -------------------------------------------------------------------------- */

interface LngLat {
  longitude: number
  latitude: number
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
/*  Componente principal                                                        */
/* -------------------------------------------------------------------------- */

export default function PanelConductor() {
  const [isOnline, setIsOnline] = useState(false)
  const [activeNav, setActiveNav] = useState('mapa')

  // Sidebar (desktop) retráctil y bottom sheet (móvil) abierto/cerrado.
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(true)

  const [viewState, setViewState] = useState({
    longitude: INITIAL_TRUCK.longitude,
    latitude: INITIAL_TRUCK.latitude,
    zoom: 14.5,
    pitch: 45, // Inclinación para efecto 3D
  })

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

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

        {/* TODO: aquí irá la ruta del flete (origen/destino + trazado)
            cuando llegue la solicitud del cliente por WebSocket. */}
      </Map>

      {/* Overlay oscuro cuando está desconectado */}
      {!isOnline && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/40 backdrop-blur-[2px] transition-all duration-500" />
      )}

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
    </div>
  )
}
