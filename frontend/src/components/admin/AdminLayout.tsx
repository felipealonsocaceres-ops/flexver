import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Truck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/* -------------------------------------------------------------------------- */
/*  Centro de Comando — Layout del Panel de Administración                      */
/*  Estética sobria y analítica (Vercel / Power BI): fondo casi negro, sidebar  */
/*  con vidrio sutil, acentos violeta→azul de la marca y tipografía contenida.  */
/* -------------------------------------------------------------------------- */

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  hint: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, hint: 'Inteligencia de negocio' },
  { to: '/admin/kyc', label: 'Validación KYC', icon: ShieldCheck, hint: 'Verificación de conductores' },
  { to: '/admin/usuarios', label: 'Gestión de Usuarios', icon: Users, hint: 'Clientes y conductores' },
]

export default function AdminLayout() {
  const [expanded, setExpanded] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0e1a] text-slate-200">
      {/* ============================== SIDEBAR ============================== */}
      <motion.aside
        initial={false}
        animate={{ width: expanded ? 264 : 80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="z-20 flex shrink-0 flex-col border-r border-white/10 bg-[#0d1222]"
      >
        {/* Marca + colapsar */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primario to-secundario shadow-lg shadow-primario/30">
            <Truck className="h-5 w-5 text-white" />
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-tight text-white">FlexVer</p>
              <p className="truncate text-[11px] text-slate-400">Centro de Comando</p>
            </div>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Contraer' : 'Expandir'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white ${
              expanded ? '' : 'mx-auto'
            }`}
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {expanded && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Operación
            </p>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                // `end` solo en el índice para que /admin no quede activo en subrutas.
                end={item.to === '/admin'}
                title={item.label}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl transition-colors ${
                    expanded ? 'gap-3 px-3 py-2.5' : 'h-11 w-11 justify-center'
                  } ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 h-5 w-1 rounded-r-full bg-linear-to-b from-primario to-secundario" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {expanded && (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        <span className="block truncate text-[11px] text-slate-500">{item.hint}</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Identidad del admin + salir */}
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${expanded ? '' : 'justify-center'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
              {(user?.email ?? 'A').charAt(0).toUpperCase()}
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">Administrador</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email ?? '—'}</p>
              </div>
            )}
          </div>
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            className={`mt-1 flex items-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
              expanded ? 'w-full gap-3 px-3 py-2.5' : 'mx-auto h-11 w-11 justify-center'
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {expanded && <span className="text-sm font-medium">Cerrar sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* ============================== CONTENIDO ============================ */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
