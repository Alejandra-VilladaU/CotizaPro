import type { Permiso, Rol, Usuario } from './roles'

export type AltaVendedor = {
  nombre: string
  email: string
  password: string
  rol: Rol
  permisos: Permiso[]
}

export type CambiosUsuario = Partial<
  Pick<Usuario, 'nombre' | 'activo' | 'permisos' | 'rol' | 'debeCambiarPassword'>
>

/** Contrato común de Firebase y del modo demo local. */
export type BackendAuth = {
  /** Notifica la sesión actual; devuelve la función para dejar de escuchar. */
  observar: (fn: (usuario: Usuario | null) => void) => () => void
  iniciarSesion: (email: string, password: string) => Promise<Usuario>
  cerrarSesion: () => Promise<void>
  recuperarPassword: (email: string) => Promise<string | null>
  cambiarPassword: (nueva: string) => Promise<void>
  listarUsuarios: () => Promise<Usuario[]>
  crearVendedor: (alta: AltaVendedor) => Promise<Usuario>
  actualizarUsuario: (uid: string, cambios: CambiosUsuario) => Promise<void>
  eliminarUsuario: (uid: string) => Promise<void>
}

export class ErrorAuth extends Error {}

export const claveTemporal = (): string => {
  const base = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `Cotiza${base}*`
}

export const validarPassword = (password: string): string | null => {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Za-z]/.test(password)) return 'La contraseña debe incluir al menos una letra.'
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.'
  return null
}
