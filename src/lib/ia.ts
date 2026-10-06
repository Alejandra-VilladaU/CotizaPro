import { doc, getDoc, setDoc } from 'firebase/firestore'
import { dbFirebase, firebaseHabilitado } from './firebase'
import type { Material } from './types'

/**
 * Asesor de proyectos: usa la API de Google Gemini, que tiene una capa gratuita y acepta
 * imágenes (fotos, planos o dibujos a mano). La clave vive en `config/ia` de Firestore para
 * que el administrador la cambie sin volver a compilar, o en `VITE_GEMINI_API_KEY` como
 * respaldo en modo demo.
 */
export type ConfigIA = {
  apiKey: string
  modelo: string
}

export const MODELO_POR_DEFECTO = 'gemini-3.6-flash'

const DOC_IA = 'ia'

const claveDelEntorno = (): string =>
  typeof import.meta.env.VITE_GEMINI_API_KEY === 'string'
    ? import.meta.env.VITE_GEMINI_API_KEY
    : ''

export async function leerConfigIA(): Promise<ConfigIA> {
  const respaldo: ConfigIA = { apiKey: claveDelEntorno(), modelo: MODELO_POR_DEFECTO }
  if (!firebaseHabilitado) return respaldo
  try {
    const snap = await getDoc(doc(dbFirebase(), 'config', DOC_IA))
    if (!snap.exists()) return respaldo
    const datos = snap.data() as Partial<ConfigIA>
    return {
      apiKey: typeof datos.apiKey === 'string' && datos.apiKey !== '' ? datos.apiKey : respaldo.apiKey,
      modelo: typeof datos.modelo === 'string' && datos.modelo !== '' ? datos.modelo : respaldo.modelo,
    }
  } catch {
    return respaldo
  }
}

/** Solo el administrador puede escribir en `config/*` según las reglas de Firestore. */
export async function guardarConfigIA(config: ConfigIA): Promise<void> {
  await setDoc(doc(dbFirebase(), 'config', DOC_IA), { ...config, actualizado: new Date().toISOString() })
}

export type Adjunto = {
  nombre: string
  /** MIME real del archivo, por ejemplo `image/png`. */
  tipo: string
  /** Contenido en base64 sin el prefijo `data:`. */
  datos: string
  /** Data URL para mostrar la miniatura en el chat. */
  vista: string
}

export type Mensaje = {
  id: string
  autor: 'usuario' | 'asesor'
  texto: string
  adjuntos: Adjunto[]
}

export const leerImagen = (archivo: File): Promise<Adjunto> =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(new Error('No fue posible leer la imagen.'))
    lector.onload = () => {
      const vista = String(lector.result)
      resolver({
        nombre: archivo.name,
        tipo: archivo.type,
        datos: vista.slice(vista.indexOf(',') + 1),
        vista,
      })
    }
    lector.readAsDataURL(archivo)
  })

/**
 * El catálogo se envía como contexto para que el asesor recomiende materiales que la
 * ferretería realmente vende y con el precio vigente.
 */
const MAX_MATERIALES = 120

const catalogo = (materiales: Material[]): string =>
  materiales
    .slice(0, MAX_MATERIALES)
    .map((m) => `${m.codigo} | ${m.nombre} | ${m.unidad} | ${m.precio} | stock ${m.stock}`)
    .join('\n')

const instruccion = (materiales: Material[]): string => `
Eres el asesor técnico de CotizaPro, una app de cotización de materiales de construcción y
carpintería en Colombia. Ayudas a vendedores y administradores a diseñar proyectos (muebles de
cocina, mesas, closets, obras menores) y a calcular los materiales necesarios.

Reglas:
- Responde siempre en español, claro y breve, con pasos numerados y medidas concretas en cm.
- Si el usuario adjunta una foto, plano o dibujo, descríbelo primero y basa tu asesoría en él.
- Calcula cantidades explicando el criterio (área, perímetro, número de piezas, desperdicio).
- Recomienda materiales del catálogo de abajo cuando existan; si falta algo, dilo con claridad.
- Los precios son en pesos colombianos y son de referencia.
- Cierra SIEMPRE con una sección exactamente así, una línea por material y sin texto extra:

MATERIALES SUGERIDOS
CODIGO x CANTIDAD | nombre del material
NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

- En esa sección usa el CODIGO tal como aparece en el catálogo; nunca inventes códigos.
- Si el proyecto necesita un material que NO está en el catálogo, inclúyelo igual en la lista con
  el código literal NO-DISPONIBLE, para que el vendedor sepa qué debe conseguir aparte.

Catálogo disponible (código | nombre | unidad | precio COP | stock):
${catalogo(materiales)}
`.trim()

type ParteApi = { text: string } | { inline_data: { mime_type: string; data: string } }

const partes = (mensaje: Mensaje): ParteApi[] => [
  ...(mensaje.texto.trim() === '' ? [] : [{ text: mensaje.texto }]),
  ...mensaje.adjuntos.map((a) => ({ inline_data: { mime_type: a.tipo, data: a.datos } })),
]

const traducir = (estado: number, detalle: string): string => {
  if (estado === 400) return 'La clave de Gemini no es válida o la imagen no es compatible.'
  if (estado === 403) return 'Gemini rechazó la clave: revisa que esté activa y sin restricciones.'
  if (estado === 404)
    return `El modelo configurado no existe o ya no está disponible. Usa ${MODELO_POR_DEFECTO} en Ajustes → Asesor con IA.`
  if (estado === 429)
    return 'Se agotó la cuota gratuita de Gemini por ahora. Espera unos minutos e intenta de nuevo.'
  if (estado === 503)
    return 'El modelo está saturado en este momento. Vuelve a intentarlo en unos minutos.'
  return `El asesor no está disponible en este momento (error ${estado}).${detalle === '' ? '' : ` ${detalle}`}`
}

const mensajeDelError = (cuerpo: string): string => {
  try {
    const datos: unknown = JSON.parse(cuerpo)
    const mensaje = (datos as { error?: { message?: string } }).error?.message
    return typeof mensaje === 'string' ? mensaje : ''
  } catch {
    return ''
  }
}

export async function preguntarIA(
  config: ConfigIA,
  historial: Mensaje[],
  materiales: Material[],
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent`
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruccion(materiales) }] },
      contents: historial.map((m) => ({
        role: m.autor === 'usuario' ? 'user' : 'model',
        parts: partes(m),
      })),
    }),
  })

  if (!respuesta.ok)
    throw new Error(traducir(respuesta.status, mensajeDelError(await respuesta.text())))

  const datos: unknown = await respuesta.json()
  const texto = (datos as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.map((p) => p.text ?? '')
    .join('')
  if (texto === undefined || texto.trim() === '')
    throw new Error('El asesor respondió vacío. Reformula la pregunta.')
  return texto
}

export type Sugerencia = { material: Material; cantidad: number }

/** Material que el proyecto necesita y la ferretería no tiene en su inventario. */
export type NoDisponible = { nombre: string; cantidad: number; unidad: string }

export type Recomendacion = {
  /** Materiales del inventario, listos para pasar a la cotización. */
  enInventario: Sugerencia[]
  noDisponibles: NoDisponible[]
}

const numero = (texto: string): number => Number(texto.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))

/**
 * Lee las líneas `CODIGO x CANTIDAD | nombre` del cierre de la respuesta: las que traen un código
 * del catálogo se pueden pasar a la cotización con un clic, y las demás quedan como material que
 * hay que conseguir fuera del inventario.
 */
export function recomendacion(texto: string, materiales: Material[]): Recomendacion {
  const porCodigo = new Map(materiales.map((m) => [m.codigo.toUpperCase(), m]))
  const enInventario = new Map<string, Sugerencia>()
  const noDisponibles = new Map<string, NoDisponible>()
  const listado = texto.split(/MATERIALES SUGERIDOS/i)[1]
  if (listado === undefined) return { enInventario: [], noDisponibles: [] }

  listado.split('\n').forEach((linea) => {
    const limpia = linea.replace(/^[-*\s]+/, '').replace(/\*\*/g, '').trim()
    const partido = /^([A-Za-z0-9._-]+)\s*[xX*]\s*([\d.,]+)\s*([^|]*)\|?\s*(.*)$/.exec(limpia)
    if (partido === null) return

    const cantidad = numero(partido[2])
    if (!Number.isFinite(cantidad) || cantidad <= 0) return

    const material = porCodigo.get(partido[1].toUpperCase())
    if (material !== undefined) {
      enInventario.set(material.id, { material, cantidad })
      return
    }

    const unidad = partido[3].trim()
    const nombre = partido[4].trim() === '' ? unidad : partido[4].trim()
    if (nombre === '') return
    noDisponibles.set(nombre.toLowerCase(), {
      nombre,
      cantidad,
      unidad: nombre === unidad ? '' : unidad,
    })
  })

  return { enInventario: [...enInventario.values()], noDisponibles: [...noDisponibles.values()] }
}
