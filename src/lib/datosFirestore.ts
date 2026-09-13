import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type CollectionReference,
  type Query,
} from 'firebase/firestore'
import type { BackendDatos } from './datosApi'
import { dbFirebase } from './firebase'
import type { Usuario } from './roles'
import type { Cliente, Cotizacion, Empresa, Material } from './types'

export const COLECCIONES = {
  materiales: 'materiales',
  clientes: 'clientes',
  cotizaciones: 'cotizaciones',
  config: 'config',
  consecutivos: 'consecutivos',
} as const

/** Documento del consecutivo de cotizaciones: consecutivos/cotizaciones. */
export const DOC_CONSECUTIVO = 'cotizaciones'

/** Documento único con los datos de la empresa: config/empresa. */
export const DOC_EMPRESA = 'empresa'

/** Firestore rechaza los campos undefined: los quitamos antes de escribir. */
const limpiar = <T extends object>(valor: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== undefined))

const MAX_LOTE = 400

const traducir = (error: unknown): string => {
  const codigo = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''
  if (codigo.includes('permission-denied'))
    return 'Firestore rechazó la operación: tu perfil no tiene permiso para estos datos.'
  if (codigo.includes('unavailable')) return 'Sin conexión con Firestore. Revisa tu red.'
  if (codigo.includes('unauthenticated')) return 'La sesión expiró. Vuelve a iniciar sesión.'
  return 'No fue posible sincronizar los datos con Firebase.'
}

export function backendFirestore(usuario: Usuario): BackendDatos {
  const db = () => dbFirebase()
  const col = (nombre: string): CollectionReference => collection(db(), nombre)
  const esAdmin = usuario.rol === 'Administrador'

  const escribirLote = async (nombre: string, docs: { id: string }[]): Promise<void> => {
    for (let i = 0; i < docs.length; i += MAX_LOTE) {
      const lote = writeBatch(db())
      docs.slice(i, i + MAX_LOTE).forEach((d) => {
        lote.set(doc(db(), nombre, d.id), limpiar(d), { merge: true })
      })
      await lote.commit()
    }
  }

  const borrarTodo = async (nombre: string): Promise<void> => {
    const docs = await getDocs(col(nombre))
    for (let i = 0; i < docs.docs.length; i += MAX_LOTE) {
      const lote = writeBatch(db())
      docs.docs.slice(i, i + MAX_LOTE).forEach((d) => lote.delete(d.ref))
      await lote.commit()
    }
  }

  return {
    suscribir: (cb, onError) => {
      const fallo = (error: unknown) => onError(traducir(error))

      // Un vendedor solo puede leer sus propias cotizaciones: la consulta se filtra
      // por vendedorUid para no chocar con las reglas de seguridad.
      const consultaCotizaciones: Query = esAdmin
        ? col(COLECCIONES.cotizaciones)
        : query(col(COLECCIONES.cotizaciones), where('vendedorUid', '==', usuario.uid))

      const paran = [
        onSnapshot(
          col(COLECCIONES.materiales),
          (snap) => {
            const materiales = snap.docs.map((d) => ({ ...(d.data() as Material), id: d.id }))
            cb({ materiales })
          },
          fallo,
        ),
        onSnapshot(
          col(COLECCIONES.clientes),
          (snap) => {
            const clientes = snap.docs.map((d) => ({ ...(d.data() as Cliente), id: d.id }))
            cb({ clientes })
          },
          fallo,
        ),
        onSnapshot(
          consultaCotizaciones,
          (snap) => {
            const cotizaciones = snap.docs.map((d) => ({ ...(d.data() as Cotizacion), id: d.id }))
            cb({ cotizaciones })
          },
          fallo,
        ),
        onSnapshot(
          doc(db(), COLECCIONES.config, DOC_EMPRESA),
          (snap) => {
            if (!snap.exists()) return
            cb({ empresa: snap.data() as Empresa })
          },
          fallo,
        ),
      ]
      return () => paran.forEach((parar) => parar())
    },

    guardarMaterial: async (material) => {
      await setDoc(doc(db(), COLECCIONES.materiales, material.id), limpiar(material), {
        merge: true,
      })
    },
    guardarMateriales: (materiales) => escribirLote(COLECCIONES.materiales, materiales),
    eliminarMaterial: async (id) => {
      await deleteDoc(doc(db(), COLECCIONES.materiales, id))
    },

    guardarCliente: async (cliente) => {
      await setDoc(doc(db(), COLECCIONES.clientes, cliente.id), limpiar(cliente), { merge: true })
    },
    eliminarCliente: async (id) => {
      await deleteDoc(doc(db(), COLECCIONES.clientes, id))
    },

    guardarCotizacion: async (cotizacion) => {
      await setDoc(doc(db(), COLECCIONES.cotizaciones, cotizacion.id), limpiar(cotizacion), {
        merge: true,
      })
    },
    guardarCotizaciones: (cotizaciones) => escribirLote(COLECCIONES.cotizaciones, cotizaciones),
    eliminarCotizacion: async (id) => {
      await deleteDoc(doc(db(), COLECCIONES.cotizaciones, id))
    },

    guardarEmpresa: async (empresa) => {
      await setDoc(doc(db(), COLECCIONES.config, DOC_EMPRESA), limpiar(empresa), { merge: true })
    },

    // El número lo reserva una transacción: dos vendedores que emiten a la vez no
    // pueden obtener el mismo consecutivo (cada uno solo ve sus propias cotizaciones).
    siguienteNumero: async (minimo) => {
      const contador = doc(db(), COLECCIONES.consecutivos, DOC_CONSECUTIVO)
      return runTransaction(db(), async (tx) => {
        const snap = await tx.get(contador)
        const ultimo = snap.exists() ? Number(snap.data().ultimo ?? 0) : 0
        const siguiente = Math.max(ultimo, minimo, 1000) + 1
        tx.set(contador, { ultimo: siguiente, actualizado: new Date().toISOString() })
        return siguiente
      })
    },

    sincronizarConsecutivo: async (minimo) => {
      const contador = doc(db(), COLECCIONES.consecutivos, DOC_CONSECUTIVO)
      await runTransaction(db(), async (tx) => {
        const snap = await tx.get(contador)
        const ultimo = snap.exists() ? Number(snap.data().ultimo ?? 0) : 0
        if (ultimo >= minimo) return
        tx.set(contador, { ultimo: minimo, actualizado: new Date().toISOString() })
      })
    },

    vaciar: async () => {
      await borrarTodo(COLECCIONES.cotizaciones)
      await deleteDoc(doc(db(), COLECCIONES.consecutivos, DOC_CONSECUTIVO)).catch(() => undefined)
      await borrarTodo(COLECCIONES.clientes)
      await borrarTodo(COLECCIONES.materiales)
    },
  }
}

export const mensajeFirestore = traducir
