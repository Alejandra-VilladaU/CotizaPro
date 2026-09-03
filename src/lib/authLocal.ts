import { ErrorAuth, claveTemporal, type AltaVendedor, type BackendAuth } from './authApi'
import { permisosPorDefecto, type Usuario } from './roles'

const CLAVE = 'cotizapro.auth.v1'

type Registro = Usuario & { hash: string }

type Guardado = {
  usuarios: Registro[]
  sesion: string | null
}

const hashear = async (password: string): Promise<string> => {
  const datos = new TextEncoder().encode(`cotizapro:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const SEMILLA: { usuario: Usuario; password: string }[] = [
  {
    usuario: {
      uid: 'demo-admin',
      email: 'admin@cotizapro.co',
      nombre: 'Administrador Demo',
      rol: 'Administrador',
      debeCambiarPassword: false,
      activo: true,
      permisos: permisosPorDefecto('Administrador'),
      creado: new Date().toISOString(),
      ultimoIngreso: null,
    },
    password: 'Admin1234',
  },
  {
    usuario: {
      uid: 'demo-vendedor',
      email: 'vendedor@cotizapro.co',
      nombre: 'Camilo Muñoz',
      rol: 'Vendedor',
      debeCambiarPassword: false,
      activo: true,
      permisos: permisosPorDefecto('Vendedor'),
      creado: new Date().toISOString(),
      ultimoIngreso: null,
    },
    password: 'Vendedor1234',
  },
  {
    usuario: {
      uid: 'demo-nuevo',
      email: 'nuevo@cotizapro.co',
      nombre: 'Vendedor Recién Creado',
      rol: 'Vendedor',
      debeCambiarPassword: true,
      activo: true,
      permisos: permisosPorDefecto('Vendedor'),
      creado: new Date().toISOString(),
      ultimoIngreso: null,
    },
    password: 'Inicial1234',
  },
]

const leer = (): Guardado => {
  const crudo = localStorage.getItem(CLAVE)
  if (crudo === null) return { usuarios: [], sesion: null }
  try {
    const guardado = JSON.parse(crudo) as Partial<Guardado>
    return { usuarios: guardado.usuarios ?? [], sesion: guardado.sesion ?? null }
  } catch {
    return { usuarios: [], sesion: null }
  }
}

const escribir = (datos: Guardado): void => {
  localStorage.setItem(CLAVE, JSON.stringify(datos))
}

/** Crea los usuarios demo la primera vez que se abre la app sin Firebase. */
const sembrar = async (): Promise<Guardado> => {
  const datos = leer()
  if (datos.usuarios.length > 0) return datos
  const usuarios: Registro[] = []
  for (const { usuario, password } of SEMILLA) {
    usuarios.push({ ...usuario, hash: await hashear(password) })
  }
  const nuevo: Guardado = { usuarios, sesion: null }
  escribir(nuevo)
  return nuevo
}

const sinHash = ({ hash: _hash, ...usuario }: Registro): Usuario => usuario

/**
 * Modo demo sin Firebase: usuarios y sesión en `localStorage`. No sustituye a Firebase en
 * producción (no hay verificación de correo real ni credenciales en servidor).
 */
export function backendLocal(): BackendAuth {
  const oyentes = new Set<(usuario: Usuario | null) => void>()

  const emitir = (usuario: Usuario | null) => {
    oyentes.forEach((fn) => fn(usuario))
  }

  const usuarioDeSesion = async (): Promise<Usuario | null> => {
    const datos = await sembrar()
    if (datos.sesion === null) return null
    const registro = datos.usuarios.find((u) => u.uid === datos.sesion)
    return registro === undefined ? null : sinHash(registro)
  }

  return {
    observar: (fn) => {
      oyentes.add(fn)
      void usuarioDeSesion().then(fn)
      return () => oyentes.delete(fn)
    },

    iniciarSesion: async (email, password) => {
      const datos = await sembrar()
      const registro = datos.usuarios.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      )
      if (registro === undefined) throw new ErrorAuth('No existe una cuenta con ese correo.')
      if (registro.hash !== (await hashear(password))) {
        throw new ErrorAuth('Correo o contraseña incorrectos.')
      }
      if (!registro.activo) throw new ErrorAuth('Tu usuario está inactivo. Contacta al administrador.')
      const actualizado: Registro = { ...registro, ultimoIngreso: new Date().toISOString() }
      escribir({
        usuarios: datos.usuarios.map((u) => (u.uid === registro.uid ? actualizado : u)),
        sesion: registro.uid,
      })
      const usuario = sinHash(actualizado)
      emitir(usuario)
      return usuario
    },

    cerrarSesion: async () => {
      const datos = await sembrar()
      escribir({ ...datos, sesion: null })
      emitir(null)
    },

    // Sin Firebase no hay correo saliente: se genera una clave temporal visible en pantalla.
    recuperarPassword: async (email) => {
      const datos = await sembrar()
      const registro = datos.usuarios.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      )
      if (registro === undefined) throw new ErrorAuth('No existe una cuenta con ese correo.')
      const temporal = claveTemporal()
      const hash = await hashear(temporal)
      escribir({
        ...datos,
        usuarios: datos.usuarios.map((u) =>
          u.uid === registro.uid ? { ...u, hash, debeCambiarPassword: true } : u,
        ),
      })
      return temporal
    },

    cambiarPassword: async (nueva) => {
      const datos = await sembrar()
      if (datos.sesion === null) throw new ErrorAuth('No hay una sesión activa.')
      const hash = await hashear(nueva)
      const usuarios = datos.usuarios.map((u) =>
        u.uid === datos.sesion ? { ...u, hash, debeCambiarPassword: false } : u,
      )
      escribir({ ...datos, usuarios })
      const actual = usuarios.find((u) => u.uid === datos.sesion)
      emitir(actual === undefined ? null : sinHash(actual))
    },

    listarUsuarios: async () => {
      const datos = await sembrar()
      return datos.usuarios
        .map(sinHash)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    },

    crearVendedor: async ({
      nombre,
      email,
      password,
      rol,
      permisos,
      debeCambiarPassword,
    }: AltaVendedor) => {
      const datos = await sembrar()
      if (datos.usuarios.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new ErrorAuth('Ya existe un usuario con ese correo.')
      }
      const nuevo: Registro = {
        uid: `U${Date.now().toString(36).toUpperCase()}`,
        email: email.trim(),
        nombre,
        rol,
        debeCambiarPassword,
        activo: true,
        permisos,
        creado: new Date().toISOString(),
        ultimoIngreso: null,
        hash: await hashear(password),
      }
      escribir({ ...datos, usuarios: [...datos.usuarios, nuevo] })
      return sinHash(nuevo)
    },

    actualizarUsuario: async (uid, cambios) => {
      const datos = await sembrar()
      const usuarios = datos.usuarios.map((u) => (u.uid === uid ? { ...u, ...cambios } : u))
      escribir({ ...datos, usuarios })
      if (datos.sesion === uid) {
        const actual = usuarios.find((u) => u.uid === uid)
        emitir(actual === undefined ? null : sinHash(actual))
      }
    },

    eliminarUsuario: async (uid) => {
      const datos = await sembrar()
      escribir({
        usuarios: datos.usuarios.filter((u) => u.uid !== uid),
        sesion: datos.sesion === uid ? null : datos.sesion,
      })
      if (datos.sesion === uid) emitir(null)
    },
  }
}
