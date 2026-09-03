import {
  BarChart3,
  Boxes,
  FileText,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { cop, iniciales } from '../lib/format'
import { calcularTotales } from '../lib/quote'
import type { Permiso } from '../lib/roles'
import { useDatos } from '../lib/store'
import { Avatar, Badge } from './ui'

type Entrada = {
  to: string
  label: string
  corto: string
  icono: LucideIcon
  permiso?: Permiso
  /** Entradas de gestión: el vendedor nunca las ve. */
  soloAdmin?: boolean
}

const ENTRADAS: Entrada[] = [
  { to: '/', label: 'Buscar materiales', corto: 'Buscar', icono: Search, permiso: 'materiales.buscar' },
  {
    to: '/cotizacion',
    label: 'Cotización en curso',
    corto: 'Cotización',
    icono: ShoppingCart,
    permiso: 'cotizaciones.crear',
  },
  { to: '/cotizaciones', label: 'Cotizaciones', corto: 'Historial', icono: FileText },
  { to: '/clientes', label: 'Clientes', corto: 'Clientes', icono: Users },
  {
    to: '/inventario',
    label: 'Inventario',
    corto: 'Inventario',
    icono: Boxes,
    permiso: 'inventario.gestionar',
  },
  {
    to: '/reportes',
    label: 'Reportes globales',
    corto: 'Reportes',
    icono: BarChart3,
    permiso: 'reportes.globales',
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    corto: 'Usuarios',
    icono: ShieldCheck,
    permiso: 'usuarios.gestionar',
    soloAdmin: true,
  },
]

function useEntradas(): Entrada[] {
  const { puede } = useAuth()
  return ENTRADAS.filter((e) => e.permiso === undefined || puede(e.permiso))
}

export function Logo({ alto = 26 }: { alto?: number }) {
  return (
    <img
      src="/wordmark.png"
      alt="CotizaPro"
      style={{ height: alto }}
      className="w-auto select-none"
    />
  )
}

function Sesion({ compacta = false }: { compacta?: boolean }) {
  const { usuario, cerrarSesion } = useAuth()
  if (usuario === null) return null
  return (
    <div className={`flex items-center gap-2 ${compacta ? '' : 'px-3 py-2'}`}>
      <Avatar texto={iniciales(usuario.nombre)} size={compacta ? 28 : 34} />
      {!compacta && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-navy">{usuario.nombre}</div>
          <Badge tono={usuario.rol === 'Administrador' ? 'blue' : 'gris'}>{usuario.rol}</Badge>
        </div>
      )}
      <button
        type="button"
        onClick={() => void cerrarSesion()}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="rounded-md p-2 text-muted hover:bg-surface"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}

function Sidebar() {
  const { borrador } = useDatos()
  const entradas = useEntradas()
  const items = borrador?.items.length ?? 0
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-white lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 px-2 py-2">
        {entradas.map(({ to, label, icono: Icono }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-soft text-blue'
                  : 'text-navy hover:bg-surface'
              }`
            }
          >
            <Icono size={18} aria-hidden />
            <span className="flex-1">{label}</span>
            {to === '/cotizacion' && items > 0 && (
              <span className="rounded-md bg-blue px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                {items}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-2">
        <Sesion />
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              isActive ? 'bg-blue-soft text-blue' : 'text-muted hover:bg-surface'
            }`
          }
        >
          <Settings size={18} aria-hidden />
          Ajustes
        </NavLink>
      </div>
    </aside>
  )
}

function BarraMovil() {
  const { borrador } = useDatos()
  const entradas = useEntradas()
  const items = borrador?.items.length ?? 0
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white lg:hidden">
      {entradas
        .filter((e) => e.to !== '/inventario' && e.soloAdmin !== true)
        .map(({ to, corto, icono: Icono }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
              isActive ? 'text-blue' : 'text-muted'
            }`
          }
        >
          <Icono size={20} aria-hidden />
          {corto}
          {to === '/cotizacion' && items > 0 && (
            <span className="absolute top-1.5 right-[22%] rounded-md bg-blue px-1 text-[10px] font-extrabold text-white">
              {items}
            </span>
          )}
        </NavLink>
        ))}
      <NavLink
        to="/ajustes"
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
            isActive ? 'text-blue' : 'text-muted'
          }`
        }
      >
        <Settings size={20} aria-hidden />
        Ajustes
      </NavLink>
    </nav>
  )
}

/** Barra flotante con el total del borrador: visible en móvil fuera de la cotización. */
function BarraCarrito() {
  const { borrador } = useDatos()
  const { pathname } = useLocation()
  if (borrador === null || borrador.items.length === 0) return null
  if (pathname.startsWith('/cotizacion')) return null
  const totales = calcularTotales(borrador)
  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 lg:hidden">
      <div className="mx-3 flex items-center gap-3 rounded-[12px] bg-navy px-4 py-3 shadow-[0_-6px_20px_rgba(4,36,76,0.25)]">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-white/70">
            {totales.items} ítems en la cotización
          </div>
          <div className="text-xl font-extrabold text-white">{cop(totales.total)}</div>
        </div>
        <NavLink
          to="/cotizacion"
          className="rounded-[10px] bg-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-hover"
        >
          Cotizar →
        </NavLink>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
          <Logo alto={22} />
          <Sesion compacta />
        </header>
        <main className="min-w-0 flex-1 pb-32 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BarraCarrito />
      <BarraMovil />
    </div>
  )
}
