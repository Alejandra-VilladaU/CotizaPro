import { sumarDias } from './format'
import type { Cotizacion, ItemCotizacion, Material } from './types'

export type Totales = {
  items: number
  unidades: number
  subtotal: number
  descuentoGlobal: number
  base: number
  iva: number
  total: number
}

export function totalLinea(item: ItemCotizacion): number {
  return item.cantidad * item.precioUnitario * (1 - item.descuento / 100)
}

/** Único punto donde se calcula la cotización: redondeo solo al final. */
export function calcularTotales(cotizacion: Cotizacion): Totales {
  const subtotal = cotizacion.items.reduce((acc, item) => acc + totalLinea(item), 0)
  const descuentoGlobal = subtotal * (cotizacion.descuentoGlobal / 100)
  const base = subtotal - descuentoGlobal
  const iva = base * (cotizacion.ivaPct / 100)
  return {
    items: cotizacion.items.length,
    unidades: cotizacion.items.reduce((acc, item) => acc + item.cantidad, 0),
    subtotal: Math.round(subtotal),
    descuentoGlobal: Math.round(descuentoGlobal),
    base: Math.round(base),
    iva: Math.round(iva),
    total: Math.round(base + iva),
  }
}

export function itemDesdeMaterial(material: Material, cantidad: number): ItemCotizacion {
  return {
    materialId: material.id,
    codigo: material.codigo,
    nombre: material.nombre,
    unidad: material.unidad,
    precioUnitario: material.precio,
    precioLista: material.precio,
    cantidad,
    descuento: 0,
    categoria: material.categoria,
  }
}

/**
 * Número de la cotización (#1043) o, mientras es borrador, su consecutivo de borrador (BOR-001).
 * Los borradores creados antes del consecutivo usan el final de su id.
 */
export function referencia(cotizacion: Cotizacion): string {
  if (cotizacion.numero !== null) return `#${cotizacion.numero}`
  if (cotizacion.consecutivoBorrador != null)
    return `BOR-${String(cotizacion.consecutivoBorrador).padStart(3, '0')}`
  return `BOR-${cotizacion.id.slice(-5)}`
}

const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Capítulos del presupuesto, en el orden en que se presentan. Cada categoría del inventario cae
 * en el primero cuyas claves contenga (por eso Herramientas va antes que Acabados: "Herramientas
 * de pintura" es herramienta, no acabado). Las categorías que no encajan conservan su nombre.
 */
const CAPITULOS: { nombre: string; claves: string[] }[] = [
  { nombre: 'Herramientas', claves: ['herramienta', 'seguridad', 'proteccion'] },
  {
    nombre: 'Obra gris',
    claves: ['cemento', 'concreto', 'mortero', 'acero', 'arido', 'agregado', 'ladrillo', 'bloque', 'mamposteria', 'cubierta', 'teja', 'estructura', 'obra gris', 'fijacion'],
  },
  {
    nombre: 'Instalaciones hidráulicas',
    claves: ['hidraul', 'sanitari', 'plomer', 'tuberia', 'griferia', 'agua'],
  },
  {
    nombre: 'Instalaciones eléctricas e iluminación',
    claves: ['electric', 'iluminacion', 'luminaria', 'cable'],
  },
  {
    nombre: 'Acabados y pintura',
    claves: ['acabado', 'pintura', 'enchape', 'ceramica', 'piso', 'drywall', 'estuco', 'impermeab'],
  },
  {
    nombre: 'Carpintería y herrajes',
    claves: ['madera', 'carpinter', 'herraje', 'tablero', 'aglomerado', 'melamina'],
  },
]

const ORDEN = [
  'Obra gris',
  'Instalaciones hidráulicas',
  'Instalaciones eléctricas e iluminación',
  'Acabados y pintura',
  'Carpintería y herrajes',
  'Herramientas',
]

export function capitulo(categoria: string): string {
  const clave = normalizar(categoria)
  const encontrado = CAPITULOS.find((c) => c.claves.some((k) => clave.includes(k)))
  if (encontrado !== undefined) return encontrado.nombre
  return categoria.trim() === '' ? 'Otros' : categoria.trim()
}

export type Capitulo = { nombre: string; items: ItemCotizacion[]; subtotal: number }

/**
 * Agrupa las líneas por capítulo. La categoría sale del snapshot de la línea y, en cotizaciones
 * anteriores a esa columna, del material actual del inventario.
 */
export function porCapitulo(cotizacion: Cotizacion, materiales: Material[]): Capitulo[] {
  const grupos = new Map<string, ItemCotizacion[]>()
  cotizacion.items.forEach((item) => {
    const categoria =
      item.categoria ??
      materiales.find((m) => m.id === item.materialId || m.codigo === item.codigo)?.categoria ??
      ''
    const nombre = capitulo(categoria)
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), item])
  })
  const posicion = (nombre: string): number => {
    const i = ORDEN.indexOf(nombre)
    if (i >= 0) return i
    return nombre === 'Otros' ? ORDEN.length + 1 : ORDEN.length
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => posicion(a) - posicion(b) || a.localeCompare(b))
    .map(([nombre, items]) => ({
      nombre,
      items,
      subtotal: Math.round(items.reduce((acc, i) => acc + totalLinea(i), 0)),
    }))
}

/** Texto plano de la respuesta del asesor para el PDF: sin marcas de Markdown. */
export function textoPlano(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function vence(cotizacion: Cotizacion): string {
  return sumarDias(cotizacion.emitida ?? cotizacion.creada, cotizacion.vigenciaDias)
}

export function estaVencida(cotizacion: Cotizacion): boolean {
  if (cotizacion.estado !== 'Enviada') return false
  return new Date(vence(cotizacion)).getTime() < Date.now()
}

export type EstadoStock = 'Disponible' | 'Stock bajo' | 'Sin stock'

export function estadoStock(material: Material): EstadoStock {
  if (material.stock <= 0) return 'Sin stock'
  if (material.stock <= material.stockMinimo) return 'Stock bajo'
  return 'Disponible'
}

/** Materiales cuyo precio de lista cambió después de haber sido agregados al borrador. */
export function preciosDesactualizados(
  cotizacion: Cotizacion,
  materiales: Material[],
): ItemCotizacion[] {
  return cotizacion.items.filter((item) => {
    const material = materiales.find((m) => m.id === item.materialId)
    return material !== undefined && material.precio !== item.precioLista
  })
}

export function mensajeWhatsApp(
  cotizacion: Cotizacion,
  nombreCliente: string,
  total: number,
  vendedor: string,
  empresa: string,
): string {
  const numero = referencia(cotizacion)
  const fechaVence = new Date(vence(cotizacion)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  })
  const totalTexto = `$ ${Math.round(total).toLocaleString('es-CO')}`
  const proyecto =
    cotizacion.proyecto == null || cotizacion.proyecto.descripcion.trim() === ''
      ? ''
      : ` para ${cotizacion.proyecto.descripcion.trim().replace(/[.\s]+$/, '')}`
  return `Hola ${nombreCliente}, le comparto la cotización ${numero}${proyecto} por ${totalTexto} (${cotizacion.items.length} materiales), válida hasta el ${fechaVence}. Cualquier ajuste me avisa. — ${vendedor}, ${empresa}.`
}
