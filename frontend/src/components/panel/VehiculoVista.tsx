import { motion } from 'framer-motion'
import {
  Truck,
  Gauge,
  Box,
  Weight,
  FileText,
  ShieldCheck,
  CalendarClock,
  Hash,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Mock — simula una fila de la tabla `vehiculos`                              */
/* -------------------------------------------------------------------------- */

const VEHICULO = {
  patente: 'JKLM-42',
  marca: 'Chevrolet',
  modelo: 'N400 Max',
  anio: 2022,
  capacidad_m3: 3.2, // vehiculos.capacidad_m3
  capacidad_kg: 750, // vehiculos.capacidad_kg
  color: 'Blanco',
}

// Documentos asociados (licencia, padrón) — estado simulado.
const DOCUMENTOS = [
  { nombre: 'Licencia de conducir', estado: 'Vigente', vence: '08/2027', ok: true },
  { nombre: 'Padrón del vehículo', estado: 'Vigente', vence: '03/2026', ok: true },
  { nombre: 'Permiso de circulación', estado: 'Por vencer', vence: '07/2026', ok: false },
]

/* -------------------------------------------------------------------------- */
/*  Sub-componente: especificación con ícono                                    */
/* -------------------------------------------------------------------------- */

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primario/15 text-violet-300">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vista principal                                                             */
/* -------------------------------------------------------------------------- */

export default function VehiculoVista() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-gray-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-md md:p-8"
    >
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white">Mi Vehículo</h2>
        <p className="mt-1 text-sm text-slate-400">Perfil y documentación de tu vehículo de trabajo</p>
      </header>

      {/* ----------------------- Tarjeta de perfil ----------------------- */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-secundario/15 to-primario/10 backdrop-blur-md">
        <div className="flex items-center gap-4 border-b border-white/10 p-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/25">
            <Truck className="h-8 w-8 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-white">
              {VEHICULO.marca} {VEHICULO.modelo}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {VEHICULO.patente}
              </span>
              <span>· {VEHICULO.anio}</span>
              <span>· {VEHICULO.color}</span>
            </div>
          </div>
        </div>

        {/* Especificaciones técnicas (capacidades) */}
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <Spec icon={Box} label="Capacidad volumen" value={`${VEHICULO.capacidad_m3} m³`} />
          <Spec icon={Weight} label="Capacidad carga" value={`${VEHICULO.capacidad_kg} kg`} />
          <Spec icon={Gauge} label="Año / Modelo" value={`${VEHICULO.modelo} ${VEHICULO.anio}`} />
          <Spec icon={Hash} label="Patente" value={VEHICULO.patente} />
        </div>
      </div>

      {/* ------------------------- Documentos ------------------------- */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FileText className="h-4 w-4 text-slate-400" />
          Documentación
        </h3>

        <ul className="flex flex-col gap-2">
          {DOCUMENTOS.map((doc) => (
            <li
              key={doc.nombre}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  doc.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{doc.nombre}</p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <CalendarClock className="h-3 w-3" /> Vence {doc.vence}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                  doc.ok
                    ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300'
                    : 'border-amber-400/20 bg-amber-500/15 text-amber-300'
                }`}
              >
                {doc.estado}
              </span>
            </li>
          ))}
        </ul>

        {/* Botón inactivo (visual, sin acción para la demo) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primario to-secundario py-3.5 font-semibold text-white opacity-60 shadow-lg shadow-primario/20 transition hover:opacity-70"
        >
          <FileText className="h-5 w-5" />
          Actualizar documentos
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Disponible próximamente · sube tu licencia y padrón
        </p>
      </div>
    </motion.section>
  )
}
