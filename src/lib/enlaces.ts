import { doc, getDoc, setDoc } from 'firebase/firestore'
import { dbFirebase, firebaseHabilitado } from './firebase'
import type { Cliente, Cotizacion, Empresa, Material } from './types'

/**
 * Copia de solo lectura de una cotización compartida con el cliente. Vive en
 * `enlaces/{cotizacionId}` y se abre sin sesión en `/c/{cotizacionId}`: lleva todo lo que
 * necesita la hoja de la cotización para no exponer las colecciones internas.
 */
export type EnlacePublico = {
  cotizacion: Cotizacion
  cliente: Cliente | null
  empresa: Empresa
  /** Solo los materiales de la cotización: dan el capítulo y el detalle de cada línea. */
  materiales: Material[]
  publicado: string
}

const COLECCION = 'enlaces'
const CLAVE_LOCAL = 'cotizapro.enlaces'

export const urlEnlace = (cotizacionId: string): string =>
  `${window.location.origin}/c/${cotizacionId}`

/** Firestore rechaza los undefined, también dentro de objetos y listas. */
const sinIndefinidos = <T>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T

const leerLocales = (): Record<string, EnlacePublico> => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? '{}') as Record<string, EnlacePublico>
  } catch {
    return {}
  }
}

export function armarEnlace(
  cotizacion: Cotizacion,
  cliente: Cliente | undefined,
  empresa: Empresa,
  materiales: Material[],
): EnlacePublico {
  const usados = new Set(cotizacion.items.map((i) => i.materialId))
  return sinIndefinidos({
    cotizacion,
    cliente: cliente ?? null,
    empresa,
    materiales: materiales.filter((m) => usados.has(m.id)),
    publicado: new Date().toISOString(),
  })
}

/** Publica (o refresca) la copia que ve el cliente. En modo demo queda en este navegador. */
export async function publicarEnlace(enlace: EnlacePublico): Promise<void> {
  const id = enlace.cotizacion.id
  if (!firebaseHabilitado) {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify({ ...leerLocales(), [id]: enlace }))
    return
  }
  await setDoc(doc(dbFirebase(), COLECCION, id), enlace)
}

export async function leerEnlace(cotizacionId: string): Promise<EnlacePublico | null> {
  if (!firebaseHabilitado) return leerLocales()[cotizacionId] ?? null
  const snap = await getDoc(doc(dbFirebase(), COLECCION, cotizacionId))
  return snap.exists() ? (snap.data() as EnlacePublico) : null
}
