import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { authAltaUsuarios, authFirebase, dbFirebase } from './firebase'
import { ErrorAuth, type AltaVendedor, type BackendAuth, type CambiosUsuario } from './authApi'
import { permisosPorDefecto, type Permiso, type Rol, type Usuario } from './roles'

const COLECCION = 'usuarios'

type PerfilGuardado = {
  email?: string
  nombre?: string
  rol?: Rol
  debeCambiarPassword?: boolean
  activo?: boolean
  permisos?: Permiso[]
  creado?: string
  ultimoIngreso?: string | null
}

const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Este usuario está deshabilitado.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/email-already-in-use': 'Ya existe un usuario con ese correo.',
  'auth/weak-password': 'La contraseña es demasiado débil (mínimo 6 caracteres).',
  'auth/requires-recent-login': 'Vuelve a iniciar sesión para cambiar la contraseña.',
  'auth/network-request-failed': 'Sin conexión con Firebase. Revisa tu red.',
  'auth/operation-not-allowed':
    'Habilita el proveedor Email/Password en Firebase Console → Authentication.',
  'auth/configuration-not-found':
    'El proyecto de Firebase aún no tiene Authentication activado: entra a Firebase Console → Authentication → Comenzar y habilita Email/Password.',
}

const traducir = (error: unknown): ErrorAuth => {
  if (error instanceof FirebaseError) {
    return new ErrorAuth(MENSAJES[error.code] ?? `Firebase: ${error.code}`)
  }
  if (error instanceof Error) return new ErrorAuth(error.message)
  return new ErrorAuth('Error inesperado de autenticación.')
}

const perfilDesde = (uid: string, email: string | null, datos: PerfilGuardado): Usuario => ({
  uid,
  email: datos.email ?? email ?? '',
  nombre: datos.nombre ?? datos.email ?? email ?? 'Usuario',
  rol: datos.rol ?? 'Vendedor',
  debeCambiarPassword: datos.debeCambiarPassword ?? false,
  activo: datos.activo ?? true,
  permisos: datos.permisos ?? permisosPorDefecto(datos.rol ?? 'Vendedor'),
  creado: datos.creado ?? new Date().toISOString(),
  ultimoIngreso: datos.ultimoIngreso ?? null,
})

/**
 * El perfil (rol, permisos, cambio de clave obligatorio) vive en Firestore; Firebase Auth
 * solo guarda las credenciales. Sin perfil, el usuario no puede entrar.
 */
async function leerPerfil(user: User): Promise<Usuario> {
  const referencia = doc(dbFirebase(), COLECCION, user.uid)
  const instantanea = await getDoc(referencia)
  if (!instantanea.exists()) {
    throw new ErrorAuth(
      'Tu usuario no tiene perfil asignado en CotizaPro. Pídele al administrador que lo cree.',
    )
  }
  const perfil = perfilDesde(user.uid, user.email, instantanea.data() as PerfilGuardado)
  if (!perfil.activo) throw new ErrorAuth('Tu usuario está inactivo. Contacta al administrador.')
  return perfil
}

export function backendFirebase(): BackendAuth {
  return {
    observar: (fn) =>
      onAuthStateChanged(authFirebase(), (user) => {
        if (user === null) {
          fn(null)
          return
        }
        leerPerfil(user)
          .then(fn)
          .catch(() => {
            void signOut(authFirebase())
            fn(null)
          })
      }),

    iniciarSesion: async (email, password) => {
      try {
        const credencial = await signInWithEmailAndPassword(authFirebase(), email.trim(), password)
        const perfil = await leerPerfil(credencial.user)
        await updateDoc(doc(dbFirebase(), COLECCION, perfil.uid), {
          ultimoIngreso: new Date().toISOString(),
          visto: serverTimestamp(),
        })
        return perfil
      } catch (error) {
        if (error instanceof ErrorAuth) {
          await signOut(authFirebase())
          throw error
        }
        throw traducir(error)
      }
    },

    cerrarSesion: async () => {
      await signOut(authFirebase())
    },

    recuperarPassword: async (email) => {
      try {
        await sendPasswordResetEmail(authFirebase(), email.trim())
        return null
      } catch (error) {
        throw traducir(error)
      }
    },

    cambiarPassword: async (nueva) => {
      const user = authFirebase().currentUser
      if (user === null) throw new ErrorAuth('No hay una sesión activa.')
      try {
        await updatePassword(user, nueva)
        await updateDoc(doc(dbFirebase(), COLECCION, user.uid), { debeCambiarPassword: false })
      } catch (error) {
        throw traducir(error)
      }
    },

    listarUsuarios: async () => {
      const consulta = query(collection(dbFirebase(), COLECCION), orderBy('nombre'))
      const instantanea = await getDocs(consulta)
      return instantanea.docs.map((d) => perfilDesde(d.id, null, d.data() as PerfilGuardado))
    },

    crearVendedor: async ({ nombre, email, password, rol, permisos }: AltaVendedor) => {
      try {
        // Instancia secundaria: crear el usuario no debe cerrar la sesión del administrador.
        const credencial = await createUserWithEmailAndPassword(
          authAltaUsuarios(),
          email.trim(),
          password,
        )
        const nuevo: Usuario = {
          uid: credencial.user.uid,
          email: email.trim(),
          nombre,
          rol,
          debeCambiarPassword: true,
          activo: true,
          permisos,
          creado: new Date().toISOString(),
          ultimoIngreso: null,
        }
        await setDoc(doc(dbFirebase(), COLECCION, nuevo.uid), nuevo)
        await signOut(authAltaUsuarios())
        return nuevo
      } catch (error) {
        throw traducir(error)
      }
    },

    actualizarUsuario: async (uid, cambios: CambiosUsuario) => {
      try {
        await updateDoc(doc(dbFirebase(), COLECCION, uid), cambios)
      } catch (error) {
        throw traducir(error)
      }
    },

    eliminarUsuario: async (uid) => {
      try {
        await deleteDoc(doc(dbFirebase(), COLECCION, uid))
      } catch (error) {
        throw traducir(error)
      }
    },
  }
}
