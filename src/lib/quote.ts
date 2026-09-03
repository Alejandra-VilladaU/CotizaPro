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
  }
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
  const numero = cotizacion.numero === null ? 'borrador' : `#${cotizacion.numero}`
  const fechaVence = new Date(vence(cotizacion)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  })
  const totalTexto = `$ ${Math.round(total).toLocaleString('es-CO')}`
  return `Hola ${nombreCliente}, le comparto la cotización ${numero} por ${totalTexto} (${cotizacion.items.length} materiales), válida hasta el ${fechaVence}. Cualquier ajuste me avisa. — ${vendedor}, ${empresa}.`
}
