export type Rol = 'Administrador' | 'Vendedor'

export type Permiso =
  | 'materiales.buscar'
  | 'inventario.gestionar'
  | 'clientes.crear'
  | 'clientes.eliminar'
  | 'cotizaciones.crear'
  | 'cotizaciones.exportar'
  | 'usuarios.gestionar'
  | 'empresa.editar'
  | 'reportes.globales'

export const PERMISO_LABEL: Record<Permiso, string> = {
  'materiales.buscar': 'Buscar materiales en el inventario',
  'inventario.gestionar': 'Agregar y modificar productos del inventario',
  'clientes.crear': 'Registrar clientes',
  'clientes.eliminar': 'Eliminar registros de clientes',
  'cotizaciones.crear': 'Generar y editar cotizaciones propias',
  'cotizaciones.exportar': 'Exportar cotizaciones en PDF o Excel',
  'usuarios.gestionar': 'Crear vendedores y configurar sus permisos',
  'empresa.editar': 'Editar información de la empresa',
  'reportes.globales': 'Consultar reportes globales de ventas',
}

/** El administrador gestiona; no vende ni edita cotizaciones de vendedores sin autorización. */
const PERMISOS_ADMIN: Permiso[] = [
  'materiales.buscar',
  'inventario.gestionar',
  'clientes.crear',
  'clientes.eliminar',
  'usuarios.gestionar',
  'empresa.editar',
  'reportes.globales',
]

/** El vendedor opera el día a día: solo ve y toca sus propios registros. */
const PERMISOS_VENDEDOR: Permiso[] = [
  'materiales.buscar',
  'clientes.crear',
  'cotizaciones.crear',
  'cotizaciones.exportar',
]

/** Permisos que el administrador puede activar o desactivar por vendedor. */
export const PERMISOS_CONFIGURABLES: Permiso[] = [
  'materiales.buscar',
  'clientes.crear',
  'cotizaciones.crear',
  'cotizaciones.exportar',
]

export const permisosPorDefecto = (rol: Rol): Permiso[] =>
  rol === 'Administrador' ? [...PERMISOS_ADMIN] : [...PERMISOS_VENDEDOR]

export type Usuario = {
  uid: string
  email: string
  nombre: string
  rol: Rol
  /** Clave inicial asignada por el administrador: obliga a cambiarla en el primer ingreso. */
  debeCambiarPassword: boolean
  activo: boolean
  permisos: Permiso[]
  creado: string
  ultimoIngreso: string | null
}

export function puede(usuario: Usuario | null, permiso: Permiso): boolean {
  if (usuario === null || !usuario.activo) return false
  if (usuario.rol === 'Administrador') return PERMISOS_ADMIN.includes(permiso)
  return usuario.permisos.includes(permiso)
}

/** Un vendedor solo alcanza sus propios registros; el administrador los ve todos. */
export function verTodo(usuario: Usuario | null): boolean {
  return usuario !== null && usuario.rol === 'Administrador'
}
