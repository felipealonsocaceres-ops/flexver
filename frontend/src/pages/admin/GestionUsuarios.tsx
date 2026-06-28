import { Users } from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Gestión de Usuarios — placeholder.                                          */
/*  Reservado para el CRUD/listado de clientes y conductores. De momento solo   */
/*  marca su lugar en la navegación del Centro de Comando.                       */
/* -------------------------------------------------------------------------- */

export default function GestionUsuarios() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-slate-400">
          Administración de clientes y conductores de la plataforma.
        </p>
      </header>

      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-[#0d1222] text-slate-600">
        <Users className="h-8 w-8" />
        <span className="text-sm font-medium">Módulo en construcción</span>
      </div>
    </div>
  )
}
