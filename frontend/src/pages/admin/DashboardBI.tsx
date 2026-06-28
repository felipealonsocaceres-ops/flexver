import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getDashboardBI, type AnalyticsDashboard } from '../../lib/analytics'
import GrafoLogistico from './GrafoLogistico'

/* -------------------------------------------------------------------------- */
/*  Dashboard BI — Motor Analítico de Toma de Decisiones                        */
/*  Estética: cristal oscuro (glassmorphism), gradientes violeta→azul, tooltips */
/*  personalizados. Los datos vienen del backend (/api/v1/analytics/dashboard). */
/* -------------------------------------------------------------------------- */

// SLA objetivo de validación KYC: si superamos 72 h, nos estamos retrasando.
const SLA_KYC_HORAS = 72

const FMT_CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

/* --------------------------- Tooltips a medida ---------------------------- */

interface TooltipPayloadItem {
  value: number
  payload: Record<string, number>
}

/** Tooltip de cristal reutilizable: título + filas formateadas. */
function GlassTooltip({
  active,
  title,
  rows,
}: {
  active?: boolean
  title?: string
  rows: { label: string; value: string; color?: string }[]
}) {
  if (!active) return null
  return (
    <div className="rounded-xl border border-white/15 bg-[#0d1222]/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md">
      {title && <p className="mb-1 text-xs font-semibold text-white">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-xs text-slate-300">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          <span className="text-slate-400">{r.label}:</span>
          <span className="font-medium text-white">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ------------------------------ KPI Cards --------------------------------- */

interface Kpi {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  acento: string
  delta?: number
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  const positivo = (kpi.delta ?? 0) >= 0
  const Trend = positivo ? TrendingUp : TrendingDown
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1222]/80 p-5 backdrop-blur-xl transition-colors hover:border-primario/40">
      {/* halo de gradiente sutil al fondo */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-primario/20 to-secundario/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Icon className={`h-5 w-5 ${kpi.acento}`} />
        </div>
        {kpi.delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              positivo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            <Trend className="h-3 w-3" />
            {Math.abs(kpi.delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="relative mt-4 text-2xl font-bold tracking-tight text-white">{kpi.value}</p>
      <p className="relative mt-0.5 text-sm font-medium text-slate-300">{kpi.label}</p>
      <p className="relative mt-1 text-xs text-slate-500">{kpi.hint}</p>
    </div>
  )
}

/* ------------------------- Contenedor de gráfico -------------------------- */

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0d1222]/80 p-5 backdrop-blur-xl ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      {children}
    </div>
  )
}

/** Estado vacío dentro de un gráfico (plataforma sin datos aún). */
function SinDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-600">
      <BarChart3 className="h-7 w-7" />
      <span className="text-xs">{mensaje}</span>
    </div>
  )
}

/* ------------------------------- Página ----------------------------------- */

export default function DashboardBI() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    getDashboardBI()
      .then((d) => {
        if (!cancelado) {
          setData(d)
          setEstado('ok')
        }
      })
      .catch(() => {
        if (!cancelado) setEstado('error')
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Formatea la semana ISO (YYYY-MM-DD) a algo legible para el eje X.
  const slaData = useMemo(
    () =>
      (data?.sla_kyc_semanal ?? []).map((p) => ({
        ...p,
        etiqueta: new Date(p.semana).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
        }),
      })),
    [data],
  )

  const asignacionData = useMemo(
    () =>
      (data?.asignacion_por_hora ?? []).map((p) => ({
        ...p,
        etiqueta: `${String(p.hora).padStart(2, '0')}:00`,
      })),
    [data],
  )

  const resumen = data?.resumen

  const kpis: Kpi[] = [
    {
      label: 'Tasa de conversión',
      value: resumen ? `${resumen.tasa_conversion.toFixed(1)}%` : '—',
      hint: 'Fletes entregados vs. cancelados',
      icon: Percent,
      acento: 'text-primario',
    },
    {
      label: 'Comisión proyectada',
      value: resumen ? FMT_CLP.format(resumen.comision_proyectada) : '—',
      hint: '10% del monto de fletes completados',
      icon: Coins,
      acento: 'text-amber-400',
    },
    {
      label: 'Fletes completados',
      value: resumen ? resumen.fletes_completados.toLocaleString('es-CL') : '—',
      hint: 'Entregados con éxito',
      icon: CheckCircle2,
      acento: 'text-emerald-400',
    },
    {
      label: 'Fletes cancelados',
      value: resumen ? resumen.fletes_cancelados.toLocaleString('es-CL') : '—',
      hint: 'Cancelados por cliente o sistema',
      icon: XCircle,
      acento: 'text-terciario',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Encabezado */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Inteligencia</h1>
        <p className="mt-1 text-sm text-slate-400">
          Motor analítico de toma de decisiones — eficiencia, demanda y márgenes.
        </p>
      </header>

      {estado === 'error' && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          No se pudieron cargar las métricas. Verifica tu sesión de administrador o reintenta.
        </div>
      )}

      {estado === 'cargando' && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="text-sm">Procesando métricas…</span>
        </div>
      )}

      {estado === 'ok' && (
        <>
          {/* Fila de KPIs inteligentes */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} kpi={kpi} />
            ))}
          </section>

          {/* Gráfico 1 — Eficiencia de Onboarding (SLA) */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Eficiencia de Onboarding (SLA)"
              subtitle="Horas promedio de validación KYC por semana"
              icon={ShieldCheck}
              className="lg:col-span-2"
            >
              {slaData.length === 0 ? (
                <SinDatos mensaje="Aún no hay conductores verificados para medir el SLA." />
              ) : (
                <ResponsiveContainer width="100%" height={264}>
                  <AreaChart data={slaData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sla-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#1A73E8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#ffffff10' }}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      unit="h"
                    />
                    {/* Línea de alerta: objetivo de 72 h */}
                    <ReferenceLine
                      y={SLA_KYC_HORAS}
                      stroke="#F44336"
                      strokeDasharray="5 4"
                      label={{
                        value: `SLA ${SLA_KYC_HORAS}h`,
                        position: 'right',
                        fill: '#F44336',
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#8B5CF6', strokeOpacity: 0.3 }}
                      content={({ active, payload }) => {
                        const p = (payload as readonly TooltipPayloadItem[] | undefined)?.[0]
                        if (!p) return null
                        const fila = p.payload
                        return (
                          <GlassTooltip
                            active={active}
                            title={String(fila.etiqueta)}
                            rows={[
                              {
                                label: 'Validación',
                                value: `${p.value.toFixed(1)} h`,
                                color: '#8B5CF6',
                              },
                              { label: 'Muestras', value: `${fila.muestras}` },
                            ]}
                          />
                        )
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="horas_promedio"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fill="url(#sla-grad)"
                      activeDot={{ r: 4, fill: '#8B5CF6', stroke: '#0d1222', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Tarjeta lateral de contexto del SLA */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 p-5 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white">Lectura del SLA</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                La línea roja marca el objetivo de <strong className="text-red-300">72 h</strong>{' '}
                para validar la documentación de un conductor. Si el área violeta cruza por encima,
                el onboarding se está retrasando y conviene reforzar el equipo de revisión KYC.
              </p>
              <div className="mt-4 rounded-xl border border-white/5 bg-white/2 p-3">
                <p className="text-xs text-slate-500">Última semana medida</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {slaData.length ? `${slaData[slaData.length - 1].horas_promedio} h` : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Gráfico 2 — Tiempo de Asignación vs Hora del Día */}
          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Tiempo de Asignación vs Hora del Día"
              subtitle="Minutos promedio que espera el cliente hasta tener conductor"
              icon={Clock}
              className="lg:col-span-3"
            >
              {asignacionData.length === 0 ? (
                <SinDatos mensaje="Aún no hay fletes asignados para medir tiempos de espera." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={asignacionData}
                    margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="asig-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#1A73E8" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#ffffff10' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      unit="m"
                    />
                    <Tooltip
                      cursor={{ stroke: '#1A73E8', strokeOpacity: 0.3 }}
                      content={({ active, payload }) => {
                        const p = (payload as readonly TooltipPayloadItem[] | undefined)?.[0]
                        if (!p) return null
                        const fila = p.payload
                        return (
                          <GlassTooltip
                            active={active}
                            title={`${fila.etiqueta} hrs`}
                            rows={[
                              {
                                label: 'Espera',
                                value: `${p.value.toFixed(1)} min`,
                                color: '#1A73E8',
                              },
                              { label: 'Fletes', value: `${fila.muestras}` },
                            ]}
                          />
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="minutos_promedio"
                      stroke="url(#asig-grad)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#1A73E8', stroke: '#0d1222', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* Gráfico 3 — Grafo logístico conceptual */}
          <section className="mt-4">
            <GrafoLogistico />
          </section>
        </>
      )}
    </div>
  )
}
