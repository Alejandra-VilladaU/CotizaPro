import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { dbFirebase, firebaseHabilitado } from './firebase'
import type { Mensaje } from './ia'
import type { Usuario } from './roles'

/**
 * Historial del Asesor de proyectos: cada conversación queda guardada para retomarla si el
 * cliente vuelve o para revisar qué recomendó el asesor. Con Firebase vive en `asesorias`
 * (el vendedor ve las suyas y el administrador todas); en modo demo, en este navegador.
 */
export const DIAS_HISTORIAL = 30

const COLECCION = 'asesorias'
const CLAVE_LOCAL = 'cotizapro.asesorias'
const MAX_TITULO = 90

/** Las imágenes no se guardan (pesan demasiado): solo cuántas se adjuntaron. */
export type MensajeGuardado = { autor: Mensaje['autor']; texto: string; imagenes: number }

export type Conversacion = {
  id: string
  vendedorUid: string | null
  vendedor: string
  titulo: string
  mensajes: MensajeGuardado[]
  creada: string
  actualizada: string
  /** Fecha a partir de la cual se borra automáticamente. */
  vence: string
}

const enLaNube = (usuario: Usuario | null): usuario is Usuario =>
  firebaseHabilitado && usuario !== null

const leerLocal = (): Conversacion[] => {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? '[]')
    return Array.isArray(datos) ? (datos as Conversacion[]) : []
  } catch {
    return []
  }
}

const escribirLocal = (lista: Conversacion[]) =>
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista))

const vigente = (c: Conversacion): boolean => new Date(c.vence).getTime() > Date.now()

export const nuevoIdConversacion = (): string =>
  `A${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

/** Arma el registro a partir del chat en pantalla; conserva la fecha de creación original. */
export function aConversacion(
  id: string,
  mensajes: Mensaje[],
  dueno: Pick<Usuario, 'uid' | 'nombre'> | null,
  creada: string | null,
): Conversacion {
  const ahora = new Date()
  const vence = new Date(ahora)
  vence.setDate(vence.getDate() + DIAS_HISTORIAL)
  const primera = mensajes.find((m) => m.autor === 'usuario')
  const titulo = (primera?.texto.trim() || 'Consulta con imagen').replace(/\s+/g, ' ')
  return {
    id,
    vendedorUid: dueno?.uid ?? null,
    vendedor: dueno?.nombre ?? '',
    titulo: titulo.length > MAX_TITULO ? `${titulo.slice(0, MAX_TITULO - 1)}…` : titulo,
    mensajes: mensajes.map((m) => ({ autor: m.autor, texto: m.texto, imagenes: m.adjuntos.length })),
    creada: creada ?? ahora.toISOString(),
    actualizada: ahora.toISOString(),
    vence: vence.toISOString(),
  }
}

/** Devuelve el chat guardado en el formato de la página (sin las imágenes originales). */
export function aMensajes(conversacion: Conversacion): Mensaje[] {
  return conversacion.mensajes.map((m, i) => ({
    id: `${conversacion.id}-${i}`,
    autor: m.autor,
    texto:
      m.imagenes === 0
        ? m.texto
        : `${m.texto}${m.texto === '' ? '' : '\n'}[${m.imagenes} ${m.imagenes === 1 ? 'imagen adjunta' : 'imágenes adjuntas'}]`,
    adjuntos: [],
  }))
}

export async function guardarConversacion(
  conversacion: Conversacion,
  usuario: Usuario | null,
): Promise<void> {
  if (enLaNube(usuario)) {
    await setDoc(doc(dbFirebase(), COLECCION, conversacion.id), conversacion)
    return
  }
  escribirLocal([conversacion, ...leerLocal().filter((c) => c.id !== conversacion.id)])
}

export async function eliminarConversacion(id: string, usuario: Usuario | null): Promise<void> {
  if (enLaNube(usuario)) {
    await deleteDoc(doc(dbFirebase(), COLECCION, id))
    return
  }
  escribirLocal(leerLocal().filter((c) => c.id !== id))
}

/**
 * Conversaciones vigentes, de la más reciente a la más antigua. De paso borra las vencidas
 * propias: así el historial no crece sin límite en la capa gratuita de Firestore.
 */
export async function listarConversaciones(usuario: Usuario | null): Promise<Conversacion[]> {
  let todas: Conversacion[]
  if (enLaNube(usuario)) {
    const coleccion = collection(dbFirebase(), COLECCION)
    const consulta =
      usuario.rol === 'Administrador'
        ? coleccion
        : query(coleccion, where('vendedorUid', '==', usuario.uid))
    todas = (await getDocs(consulta)).docs.map((d) => d.data() as Conversacion)
  } else {
    todas = leerLocal()
  }

  const vencidas = todas.filter(
    (c) => !vigente(c) && (usuario === null || c.vendedorUid === usuario.uid),
  )
  if (vencidas.length > 0) {
    if (enLaNube(usuario))
      void Promise.all(vencidas.map((c) => eliminarConversacion(c.id, usuario))).catch(() => {})
    else escribirLocal(todas.filter(vigente))
  }

  return todas.filter(vigente).sort((a, b) => b.actualizada.localeCompare(a.actualizada))
}
