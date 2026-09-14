import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AltaVendedor, BackendAuth, CambiosUsuario } from './authApi'
import { backendFirebase } from './authFirebase'
import { backendLocal } from './authLocal'
import { firebaseHabilitado } from './firebase'
import { puede as puedeRol, verTodo as verTodoRol, type Permiso, type Usuario } from './roles'

type Contexto = {
  usuario: Usuario | null
  cargando: boolean
  /** true cuando no hay credenciales de Firebase y la app corre con usuarios locales. */
  modoDemo: boolean
  puede: (permiso: Permiso) => boolean
  verTodo: boolean
  iniciarSesion: (email: string, password: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  recuperarPassword: (email: string) => Promise<string | null>
  cambiarPassword: (nueva: string) => Promise<void>
  listarUsuarios: () => Promise<Usuario[]>
  crearVendedor: (alta: AltaVendedor) => Promise<Usuario>
  actualizarUsuario: (uid: string, cambios: CambiosUsuario) => Promise<void>
  eliminarUsuario: (uid: string) => Promise<void>
}

const Ctx = createContext<Contexto | null>(null)

const backend: BackendAuth = firebaseHabilitado ? backendFirebase() : backendLocal()

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const dejar = backend.observar((siguiente) => {
      setUsuario(siguiente)
      setCargando(false)
    })
    return dejar
  }, [])

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const siguiente = await backend.iniciarSesion(email, password)
    setUsuario(siguiente)
  }, [])

  const cerrarSesion = useCallback(async () => {
    await backend.cerrarSesion()
    setUsuario(null)
  }, [])

  const cambiarPassword = useCallback(async (nueva: string) => {
    await backend.cambiarPassword(nueva)
    setUsuario((actual) => (actual === null ? null : { ...actual, debeCambiarPassword: false }))
  }, [])

  const valor = useMemo<Contexto>(
    () => ({
      usuario,
      cargando,
      modoDemo: !firebaseHabilitado,
      puede: (permiso) => puedeRol(usuario, permiso),
      verTodo: verTodoRol(usuario),
      iniciarSesion,
      cerrarSesion,
      recuperarPassword: backend.recuperarPassword,
      cambiarPassword,
      listarUsuarios: backend.listarUsuarios,
      crearVendedor: backend.crearVendedor,
      actualizarUsuario: backend.actualizarUsuario,
      eliminarUsuario: backend.eliminarUsuario,
    }),
    [usuario, cargando, iniciarSesion, cerrarSesion, cambiarPassword],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth(): Contexto {
  const ctx = useContext(Ctx)
  if (ctx === null) throw new Error('useAuth debe usarse dentro de <ProveedorAuth>')
  return ctx
}
