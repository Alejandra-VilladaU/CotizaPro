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
  'Solo puedo asesorarte en proyectos de construcción, remodelación y carpintería, y en los materiales de la ferretería.'

const instruccion = (materiales: Material[]): string => `
Eres el asesor técnico de CotizaPro, una app de cotización de materiales de construcción y
carpintería en Colombia. Ayudas a vendedores y administradores a diseñar proyectos (muebles de
cocina, mesas, closets, obras menores) y a calcular los materiales necesarios.

Alcance: solo construcción, remodelación, carpintería, ferretería y el uso de los materiales del
catálogo. Si la consulta es de otro tema (geografía, salud, tareas escolares, política,
programación, recetas, texto general), responde ÚNICAMENTE esta frase, sin añadir nada más ni la
sección de materiales: "${FUERA_DE_ALCANCE}"

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
- Piensa en el espacio terminado, no solo en la obra: además de lo indispensable para construir,
  propón los complementarios que el cliente probablemente también necesite para dejarlo listo,
  aunque no los haya pedido. Por ejemplo: pintura, sellador, estuco, laca o barniz para el
  acabado; brochas, rodillos, bandejas, cinta de enmascarar para perfilar, lijas y plástico
  protector para aplicarlo; luminarias, bombillos o cintas LED, interruptores y cable para
  iluminar; manijas, tiradores, siliconas u otros accesorios. Elige solo los que tengan sentido
  para ese proyecto (entre 3 y 8), calcula sus cantidades con el mismo criterio (área a pintar y
  rendimiento, número de puntos de luz, etc.) y explica en una o dos frases por qué los sugieres.
- Cuando la consulta sí sea del alcance, cierra SIEMPRE con estas dos secciones, en este orden,
  una línea por material y sin texto extra:

MATERIALES SUGERIDOS
CODIGO x CANTIDAD | nombre del material
NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

MATERIALES COMPLEMENTARIOS
CODIGO x CANTIDAD | nombre del material
NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

- MATERIALES SUGERIDOS lleva solo lo indispensable para ejecutar lo consultado; MATERIALES
  COMPLEMENTARIOS, los acabados, herramientas de aplicación, iluminación y accesorios opcionales.
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

const sinTildes = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Vocabulario del negocio: obra, carpintería, ferretería y la operación de CotizaPro. Es
 * deliberadamente amplio, porque rechazar una consulta legítima molesta más que dejar pasar una
 * dudosa: el prompt la rechaza igual del otro lado.
 */
const PALABRAS_DOMINIO = sinTildes(
  `construccion construir obra remodelacion remodelar reforma reparar arreglar instalar instalacion
   montar armar ensamblar cortar fundir pegar sellar pintar lijar soldar excavar
   carpinteria ebanisteria albanil plomeria electricidad ferreteria herramienta taladro sierra
   mueble muebles cocina closet mesa escritorio biblioteca repisa estante cajon puerta porton
   ventana marco baranda escalera reja division fachada piso pisos enchape baldosa ceramica
   porcelanato guardaescoba muro muros pared paredes techo cielo cubierta teja columna viga losa
   cimiento placa bano banos lavamanos sanitario ducha griferia lavaplatos meson
   cemento concreto mortero arena gravilla triturado ladrillo bloque adoquin varilla malla
   hierro acero aluminio lamina madera aglomerado triplex formica melamina tablero liston
   tornillo tornillos clavo clavos puntilla bisagra chapa cerradura riel perfil angulo platina
   tubo tuberia codo union llave cable alambre interruptor toma breaker luminaria bombillo
   pintura esmalte vinilo estuco masilla barniz laca sellante silicona pegante impermeabilizante
   brocha brochas rodillo rodillos bandeja cinta enmascarar perfilar thinner
   iluminacion iluminar luz luces lampara lamparas led bombilla bombillos panel reflector
   decorar decoracion acabados habitacion alcoba sala comedor terraza patio garaje oficina local
   drywall superboard yeso icopor lija disco broca guante casco
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
  /** Acabados, herramientas de aplicación, iluminación y accesorios opcionales. */
  complementarios: GrupoMateriales
}

const NECESARIOS = /MATERIALES SUGERIDOS/i
const COMPLEMENTARIOS = /MATERIALES COMPLEMENTARIOS/i

/** Texto de la respuesta sin las secciones de materiales, que la página muestra aparte. */
export const sinListado = (texto: string): string =>
  texto.split(/MATERIALES (?:SUGERIDOS|COMPLEMENTARIOS)/i)[0].replace(/[*#\s]+$/, '').trim()

/** Lo que hay entre el encabezado `inicio` y el siguiente encabezado (o el final). */
const seccion = (texto: string, inicio: RegExp, siguiente: RegExp): string => {
  const partes = texto.split(inicio)
  return partes.length < 2 ? '' : partes.slice(1).join('\n').split(siguiente)[0]
}

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
