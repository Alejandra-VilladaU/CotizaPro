import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Sin credenciales la app arranca en modo demo local (usuarios en el navegador). */
export const firebaseHabilitado: boolean =
  typeof config.apiKey === 'string' &&
  config.apiKey.length > 0 &&
  typeof config.projectId === 'string' &&
  config.projectId.length > 0

let app: FirebaseApp | null = null
let secundaria: FirebaseApp | null = null

const appPrincipal = (): FirebaseApp => {
  app ??= initializeApp(config)
  return app
}

/**
 * `createUserWithEmailAndPassword` deja la sesión del usuario recién creado, así que el
 * administrador crea vendedores desde una instancia secundaria y no pierde su sesión.
 */
const appSecundaria = (): FirebaseApp => {
  secundaria ??= initializeApp(config, 'cotizapro-alta-usuarios')
  return secundaria
}

export const authFirebase = (): Auth => getAuth(appPrincipal())
export const authAltaUsuarios = (): Auth => getAuth(appSecundaria())
export const dbFirebase = (): Firestore => getFirestore(appPrincipal())
