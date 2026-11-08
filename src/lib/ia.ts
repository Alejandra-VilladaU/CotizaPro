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
const MAX_MATERIALES = 200

const catalogo = (materiales: Material[]): string =>
  materiales
    .slice(0, MAX_MATERIALES)
    .map((m) => `${m.codigo} | ${m.nombre} | ${m.unidad} | ${m.precio} | stock ${m.stock}`)
    .join('\n')

/** Respuesta fija para lo que queda fuera del alcance; la app usa el mismo texto al bloquear. */
export const FUERA_DE_ALCANCE =
  'Solo puedo asesorarte en obras de construcción y remodelación, y en los materiales que vende la comercializadora.'

const instruccion = (materiales: Material[]): string => `
Eres el asesor técnico de CotizaPro en una comercializadora de materiales de construcción en
Colombia. Ayudas a vendedores y administradores a planear obras y remodelaciones y a calcular los
materiales que el cliente debe comprar: obra gris (cimientos, placas, columnas, muros, pañetes),
mampostería, cubiertas, instalaciones hidráulicas, sanitarias y eléctricas de la obra, y
acabados (pisos, enchapes, drywall, estuco, pintura e impermeabilización).

Alcance: solo obras de construcción y remodelación, y el uso de los materiales que vende la
comercializadora. No diseñas muebles ni carpintería (cocinas integrales, closets, mesas), ni
decoración, ni electrodomésticos. Si la consulta es de esos temas o de cualquier otro (geografía,
salud, tareas escolares, política, programación, recetas, texto general), responde ÚNICAMENTE
esta frase, sin añadir nada más ni la sección de materiales: "${FUERA_DE_ALCANCE}"

No das precios de proveedores externos, descuentos ni condiciones comerciales, y no conoces los
clientes, usuarios ni cotizaciones del sistema: solo ves el catálogo de abajo. Si el proyecto
implica cálculo estructural (vigas, columnas, cimentaciones) o instalaciones de gas, advierte que
debe validarlo un profesional.

Reglas:
- Responde siempre en español, claro y breve, con pasos numerados y medidas concretas en cm.
- Si el usuario adjunta una foto, plano o dibujo, descríbelo primero y basa tu asesoría en él.
- Calcula cantidades explicando el criterio (área, perímetro, número de piezas, desperdicio).
- Recomienda materiales del catálogo de abajo cuando existan; si falta algo, dilo con claridad.
- Los precios son en pesos colombianos y son de referencia.
- Además de lo indispensable, propón los complementarios que el cliente probablemente también
  compre para terminar esa misma obra, aunque no los haya pedido, siempre dentro de lo que vende
  una comercializadora de materiales de construcción. Por ejemplo: impermeabilizante, sellador,
  estuco o pintura para proteger y terminar; pegante, boquilla, crucetas y esquineros para un
  enchape; soldadura, limpiador y teflón para una instalación hidráulica; cinta aislante, cajas y
  curvas para una eléctrica; herramientas de obra (palustre, llana, nivel, balde, brochas,
  rodillos) y elementos de protección (guantes, gafas, tapabocas). No sugieras muebles, herrajes
  de carpintería, decoración ni iluminación decorativa. Elige solo los que tengan sentido para
  ese proyecto (entre 3 y 6), prefiere los del catálogo, calcula sus cantidades con el mismo
  criterio (área y rendimiento, número de puntos, etc.) y explica en una o dos frases por qué.
- Cuando la consulta sí sea del alcance, cierra SIEMPRE con estas tres secciones, en este orden y
  sin texto extra:

RESUMEN DEL PROYECTO
Una o dos frases, en tercera persona y sin saludos, que describan la obra que se cotiza: qué se
hace, dónde, medidas principales y alcance. Por ejemplo: "Construcción de un muro en bloque n.º 5
de 4 × 2,40 m, pañetado por ambas caras, para el cerramiento de un patio." Resume toda la
conversación, no solo el último mensaje, y no copies la pregunta del usuario.

MATERIALES SUGERIDOS
CODIGO x CANTIDAD | nombre del material
NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

MATERIALES COMPLEMENTARIOS
CODIGO x CANTIDAD | nombre del material
NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

- En las dos secciones de materiales va una línea por material.
- MATERIALES SUGERIDOS lleva solo lo indispensable para ejecutar lo consultado; MATERIALES
  COMPLEMENTARIOS, la protección, los acabados, las herramientas de obra y los consumibles opcionales.
  No repitas un material en las dos secciones.
- En ambas secciones usa el CODIGO tal como aparece en el catálogo; nunca inventes códigos.
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
    return 'Gemini está saturado en este momento: se reintentó varias veces y con otros modelos sin éxito. Vuelve a intentarlo en unos minutos.'
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

const API = 'https://generativelanguage.googleapis.com/v1beta'

/** Errores pasajeros del lado de Google (modelo saturado o caído): vale la pena reintentar. */
const PASAJERO = new Set([500, 502, 503, 504])

/** Esperas entre intentos con el mismo modelo, en milisegundos. */
const ESPERAS = [1500, 4000]

/** Cuántos modelos alternos probar si el configurado sigue saturado. */
const MAX_ALTERNOS = 2

const esperar = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

class ErrorGemini extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.estado = estado
  }
}

type ModeloApi = { name?: string; supportedGenerationMethods?: string[] }

/**
 * Modelos "flash" de texto que la clave puede usar, distintos del configurado. Se consultan a la
 * API en vez de fijarlos en el código porque Google los renombra y retira con frecuencia.
 */
async function modelosAlternos(config: ConfigIA): Promise<string[]> {
  try {
    const respuesta = await fetch(`${API}/models?pageSize=200`, {
      headers: { 'x-goog-api-key': config.apiKey },
    })
    if (!respuesta.ok) return []
    const datos = (await respuesta.json()) as { models?: ModeloApi[] }
    return (datos.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent') === true)
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter(
        (n) =>
          n.includes('flash') &&
          n !== config.modelo &&
          !/image|tts|audio|live|embed|native|thinking/.test(n),
      )
      .sort((a, b) => Number(/preview|exp/.test(a)) - Number(/preview|exp/.test(b)))
      .slice(0, MAX_ALTERNOS)
  } catch {
    return []
  }
}

async function generar(
  config: ConfigIA,
  modelo: string,
  historial: Mensaje[],
  materiales: Material[],
): Promise<string> {
  const respuesta = await fetch(`${API}/models/${modelo}:generateContent`, {
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
    throw new ErrorGemini(
      respuesta.status,
      traducir(respuesta.status, mensajeDelError(await respuesta.text())),
    )

  const datos: unknown = await respuesta.json()
  const texto = (datos as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.map((p) => p.text ?? '')
    .join('')
  if (texto === undefined || texto.trim() === '')
    throw new Error('El asesor respondió vacío. Reformula la pregunta.')
  return texto
}

/** Reintenta con espera mientras Google responda que el modelo está saturado. */
async function conReintentos(
  intento: () => Promise<string>,
  avisar: (aviso: string) => void,
): Promise<string> {
  for (const [i, espera] of ESPERAS.entries()) {
    try {
      return await intento()
    } catch (e) {
      if (!(e instanceof ErrorGemini) || !PASAJERO.has(e.estado)) throw e
      avisar(`Gemini está con mucha demanda; reintentando (${i + 2} de ${ESPERAS.length + 1})…`)
      await esperar(espera)
    }
  }
  return intento()
}

/**
 * Pregunta al modelo configurado y, si sigue saturado tras los reintentos, a otros modelos
 * "flash" disponibles para la clave. Los errores de clave, cuota o permisos no se reintentan.
 * `avisar` informa a la página qué está pasando mientras tanto.
 */
export async function preguntarIA(
  config: ConfigIA,
  historial: Mensaje[],
  materiales: Material[],
  avisar: (aviso: string) => void = () => {},
): Promise<string> {
  try {
    return await conReintentos(
      () => generar(config, config.modelo, historial, materiales),
      avisar,
    )
  } catch (e) {
    if (!(e instanceof ErrorGemini) || !PASAJERO.has(e.estado)) throw e
    for (const modelo of await modelosAlternos(config)) {
      avisar(`El modelo principal sigue saturado; probando con ${modelo}…`)
      try {
        return await generar(config, modelo, historial, materiales)
      } catch (otro) {
        if (!(otro instanceof ErrorGemini) || !PASAJERO.has(otro.estado)) throw otro
      }
    }
    throw e
  }
}

const sinTildes = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Vocabulario del negocio: obra, remodelación, materiales de construcción y la operación de CotizaPro. Es
 * deliberadamente amplio, porque rechazar una consulta legítima molesta más que dejar pasar una
 * dudosa: el prompt la rechaza igual del otro lado.
 */
const PALABRAS_DOMINIO = sinTildes(
  `construccion construir obra remodelacion remodelar reforma reparar arreglar instalar instalacion
   montar armar ensamblar cortar fundir pegar sellar pintar lijar soldar excavar
   albanil albanileria plomeria electricidad ferreteria herramienta taladro pulidora
   cocina puerta porton
   ventana marco baranda escalera reja division fachada piso pisos enchape baldosa ceramica
   porcelanato guardaescoba muro muros pared paredes techo cielo cubierta teja columna viga losa
   cimiento placa bano banos lavamanos sanitario ducha griferia lavaplatos meson
   cemento concreto mortero arena gravilla triturado ladrillo bloque adoquin varilla malla
   hierro acero aluminio lamina fibrocemento estribo pañete panete contrapiso andén anden
   tornillo tornillos clavo clavos puntilla chazo chapa cerradura perfil angulo platina
   tubo tuberia codo union llave cable alambre interruptor toma breaker luminaria bombillo
   pintura esmalte vinilo estuco masilla barniz laca sellante silicona pegante impermeabilizante
   brocha brochas rodillo rodillos bandeja cinta enmascarar perfilar thinner
   iluminacion luz bombilla bombillos roseta tablero circuito
   acabados habitacion alcoba sala comedor terraza patio garaje oficina local
   drywall superboard yeso icopor lija disco broca guante guantes casco gafas tapabocas palustre llana nivel
   humedad gotera goteras filtracion acabado medida medidas metro metros area perimetro
   cantidad cantidades rendimiento desperdicio
   material materiales insumo insumos inventario stock catalogo precio precios costo presupuesto
   cotizar cotizacion cotizaciones proyecto cliente`,
)
  .split(/\s+/)
  .filter((p) => p.length > 2)

/**
 * Filtro local: evita gastar cuota de Gemini y responder cosas ajenas al negocio. Deja pasar lo
 * que menciona el dominio o algún material del catálogo, los mensajes con imagen (una foto o un
 * plano es por definición del proyecto) y los seguimientos cortos de una conversación ya abierta
 * ("¿y si la hago de 3 m?").
 */
export function esConsultaDelNegocio(
  texto: string,
  materiales: Material[],
  seguimiento: boolean,
): boolean {
  const palabras = sinTildes(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p !== '')
  if (palabras.length === 0) return true

  const delCatalogo = new Set(
    materiales.flatMap((m) =>
      sinTildes(`${m.nombre} ${m.categoria}`)
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length > 3),
    ),
  )
  if (palabras.some((p) => PALABRAS_DOMINIO.includes(p) || delCatalogo.has(p))) return true
  return seguimiento && palabras.length <= 8
}

export type Sugerencia = { material: Material; cantidad: number }

/** Material que el proyecto necesita y la ferretería no tiene en su inventario. */
export type NoDisponible = { nombre: string; cantidad: number; unidad: string }

export type GrupoMateriales = {
  /** Materiales del inventario, listos para pasar a la cotización. */
  enInventario: Sugerencia[]
  noDisponibles: NoDisponible[]
}

export type Recomendacion = {
  /** Lo indispensable para ejecutar lo consultado. */
  necesarios: GrupoMateriales
  /** Protección, acabados, herramientas de obra y consumibles opcionales para la misma obra. */
  complementarios: GrupoMateriales
}

const RESUMEN = /RESUMEN DEL PROYECTO/i
const NECESARIOS = /MATERIALES SUGERIDOS/i
const COMPLEMENTARIOS = /MATERIALES COMPLEMENTARIOS/i

/** Texto de la respuesta sin el resumen ni las secciones de materiales, que van aparte. */
export const sinListado = (texto: string): string =>
  texto
    .split(/RESUMEN DEL PROYECTO|MATERIALES (?:SUGERIDOS|COMPLEMENTARIOS)/i)[0]
    .replace(/[*#\s]+$/, '')
    .trim()

/** Lo que hay entre el encabezado `inicio` y el siguiente encabezado (o el final). */
const seccion = (texto: string, inicio: RegExp, siguiente: RegExp): string => {
  const partes = texto.split(inicio)
  return partes.length < 2 ? '' : partes.slice(1).join('\n').split(siguiente)[0]
}

/** Resumen de la obra con el que cierra el asesor; describe el proyecto en la cotización. */
export const resumenDe = (texto: string): string =>
  seccion(texto, RESUMEN, NECESARIOS)
    .replace(/[*#"]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[:\s-]+/, '')
    .trim()

const numero = (texto: string): number => Number(texto.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))

/**
 * Lee las líneas `CODIGO x CANTIDAD | nombre` de una sección: las que traen un código del
 * catálogo se pueden pasar a la cotización con un clic, y las demás quedan como material que hay
 * que conseguir fuera del inventario.
 */
function grupo(listado: string, porCodigo: Map<string, Material>): GrupoMateriales {
  const enInventario = new Map<string, Sugerencia>()
  const noDisponibles = new Map<string, NoDisponible>()

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

/**
 * Cruza el cierre de la respuesta con el inventario: `MATERIALES SUGERIDOS` trae lo
 * indispensable y `MATERIALES COMPLEMENTARIOS` lo que ayuda a terminar el espacio. Si el modelo
 * repite un material en ambas, queda solo como necesario.
 */
export function recomendacion(texto: string, materiales: Material[]): Recomendacion {
  const porCodigo = new Map(materiales.map((m) => [m.codigo.toUpperCase(), m]))
  const necesarios = grupo(seccion(texto, NECESARIOS, COMPLEMENTARIOS), porCodigo)
  const extra = grupo(seccion(texto, COMPLEMENTARIOS, NECESARIOS), porCodigo)

  const ids = new Set(necesarios.enInventario.map((s) => s.material.id))
  const nombres = new Set(necesarios.noDisponibles.map((f) => f.nombre.toLowerCase()))
  return {
    necesarios,
    complementarios: {
      enInventario: extra.enInventario.filter((s) => !ids.has(s.material.id)),
      noDisponibles: extra.noDisponibles.filter((f) => !nombres.has(f.nombre.toLowerCase())),
    },
  }
}
