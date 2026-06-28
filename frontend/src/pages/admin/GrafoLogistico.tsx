import { useState } from 'react'
import { Share2, Workflow, Info } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  GrafoLogístico — Marcador de posición interactivo (Visión: Teoría de Grafos)*/
/*                                                                              */
/*  PROPÓSITO CONCEPTUAL                                                         */
/*  Este componente modelará la red de fletes de Santiago como un GRAFO         */
/*  DIRIGIDO Y PONDERADO, donde:                                                */
/*                                                                              */
/*    · NODOS  (vértices)  = comunas (Las Condes, Maipú, Santiago Centro…).     */
/*                           El tamaño/peso del nodo ∝ volumen de fletes que    */
/*                           ORIGINA o RECIBE (centralidad de demanda).         */
/*                                                                              */
/*    · ARISTAS (edges)    = flujos origen→destino entre dos comunas. El grosor */
/*                           y color de la arista ∝ frecuencia de esa ruta; la  */
/*                           dirección de la flecha indica el sentido del flete.*/
/*                                                                              */
/*  POR QUÉ UN GRAFO (valor para la operación)                                  */
/*    1. Desbalance de flota: si Las Condes→Maipú tiene arista gruesa pero      */
/*       Maipú→Las Condes es delgada, los conductores quedan "varados" lejos    */
/*       de la demanda. El grafo revela ese flujo neto para reposicionar flota. */
/*    2. Detección de hubs: nodos con alto grado (in/out) son centros          */
/*       logísticos donde conviene mantener conductores en espera.             */
/*    3. Rutas de retorno (backhaul): emparejar aristas inversas para no viajar */
/*       en vacío y subir el margen por conductor.                              */
/*                                                                              */
/*  IMPLEMENTACIÓN FUTURA (no incluida aquí, solo el contrato)                  */
/*    · Datos: una función SQL `fn_flujos_origen_destino()` que agregue         */
/*      fletes por (comuna_origen, comuna_destino) → [{ from, to, peso }].      */
/*      (Requiere derivar la comuna desde lat/lng con reverse-geocoding o un    */
/*      join contra un polígono de comunas — PostGIS `ST_Contains`.)            */
/*    · Render: react-force-graph / d3-force para el layout dirigido por        */
/*      fuerzas, o Cytoscape.js para grafos más densos con métricas integradas. */
/*    · Interacción: hover sobre nodo resalta sus aristas; click filtra el      */
/*      sub-grafo de esa comuna; slider temporal para animar la demanda por     */
/*      hora (combina con `fn_tiempo_asignacion_por_hora`).                     */
/*                                                                              */
/*  Mientras tanto, abajo dibujamos un SVG estático ilustrativo (3 comunas)     */
/*  para comunicar la intención visual a stakeholders.                          */
/* -------------------------------------------------------------------------- */

/** Nodo ilustrativo: comuna + posición en el lienzo + peso (demanda relativa). */
interface NodoComuna {
  id: string
  label: string
  x: number
  y: number
  peso: number // 0..1 — escala el radio del nodo
}

/** Arista ilustrativa: flujo dirigido origen→destino con intensidad. */
interface AristaFlujo {
  from: string
  to: string
  intensidad: number // 0..1 — escala el grosor/opacidad
}

// Muestra conceptual (datos ficticios) — el grafo real vendrá del backend.
const NODOS: NodoComuna[] = [
  { id: 'lascondes', label: 'Las Condes', x: 320, y: 70, peso: 1 },
  { id: 'santiago', label: 'Santiago Centro', x: 160, y: 180, peso: 0.8 },
  { id: 'maipu', label: 'Maipú', x: 90, y: 70, peso: 0.55 },
  { id: 'puentealto', label: 'Puente Alto', x: 300, y: 230, peso: 0.65 },
]

const ARISTAS: AristaFlujo[] = [
  { from: 'lascondes', to: 'maipu', intensidad: 0.9 },
  { from: 'maipu', to: 'lascondes', intensidad: 0.3 }, // retorno débil → flota varada
  { from: 'santiago', to: 'lascondes', intensidad: 0.7 },
  { from: 'puentealto', to: 'santiago', intensidad: 0.5 },
  { from: 'lascondes', to: 'puentealto', intensidad: 0.6 },
]

function nodoById(id: string): NodoComuna {
  return NODOS.find((n) => n.id === id) as NodoComuna
}

export default function GrafoLogistico() {
  const [activo, setActivo] = useState<string | null>(null)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primario" />
          <div>
            <h3 className="text-sm font-semibold text-white">Grafo logístico origen–destino</h3>
            <p className="text-xs text-slate-500">
              Flujos entre comunas para optimizar la distribución de la flota
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primario/30 bg-primario/10 px-2.5 py-1 text-xs font-medium text-primario">
          <Share2 className="h-3 w-3" />
          Beta conceptual
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/2">
        <svg viewBox="0 0 420 300" className="h-72 w-full" role="img" aria-label="Grafo de flujos">
          <defs>
            {/* Gradiente violeta→azul para las aristas, coherente con la estética. */}
            <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#1A73E8" />
            </linearGradient>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1A73E8" />
            </marker>
          </defs>

          {/* Aristas dirigidas (debajo de los nodos) */}
          {ARISTAS.map((a) => {
            const o = nodoById(a.from)
            const d = nodoById(a.to)
            const resaltada = activo === null || activo === a.from || activo === a.to
            return (
              <line
                key={`${a.from}-${a.to}`}
                x1={o.x}
                y1={o.y}
                x2={d.x}
                y2={d.y}
                stroke="url(#edge-grad)"
                strokeWidth={1 + a.intensidad * 4}
                strokeOpacity={resaltada ? 0.25 + a.intensidad * 0.6 : 0.08}
                markerEnd="url(#arrow)"
                className="transition-opacity duration-300"
              />
            )
          })}

          {/* Nodos (comunas) */}
          {NODOS.map((n) => {
            const r = 10 + n.peso * 16
            const resaltado = activo === null || activo === n.id
            return (
              <g
                key={n.id}
                onMouseEnter={() => setActivo(n.id)}
                onMouseLeave={() => setActivo(null)}
                className="cursor-pointer"
                opacity={resaltado ? 1 : 0.35}
              >
                <circle cx={n.x} cy={n.y} r={r} fill="#8B5CF6" fillOpacity={0.18} />
                <circle cx={n.x} cy={n.y} r={r * 0.5} fill="#8B5CF6" />
                <text
                  x={n.x}
                  y={n.y + r + 14}
                  textAnchor="middle"
                  className="fill-slate-300 text-[10px] font-medium"
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </svg>

        <p className="absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-600">
          <Info className="h-3 w-3" />
          Datos ilustrativos — el grafo real se nutrirá de fn_flujos_origen_destino()
        </p>
      </div>
    </div>
  )
}
