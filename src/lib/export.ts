import { calcularTotales } from './quote'
import type { Cliente, Cotizacion } from './types'

const celda = (valor: string | number): string => {
  const texto = String(valor)
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

const fila = (celdas: (string | number)[]): string => celdas.map(celda).join(';')

/** CSV con BOM y separador `;`: Excel en español lo abre en columnas sin importar nada. */
export function descargarCsv(nombre: string, filas: (string | number)[][]): void {
  const contenido = `\uFEFF${filas.map(fila).join('\r\n')}`
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

const ENCABEZADO_COTIZACIONES = [
  'Numero',
  'Estado',
  'Cliente',
  'Vendedor',
  'Creada',
  'Emitida',
  'Items',
  'Subtotal',
  'Descuento',
  'Base gravable',
  'IVA',
  'Total',
]

export function exportarCotizaciones(
  nombre: string,
  cotizaciones: Cotizacion[],
  clientes: Cliente[],
): void {
  const nombreCliente = (id: string | null): string =>
    clientes.find((c) => c.id === id)?.nombre ?? 'Sin cliente'
  const filas: (string | number)[][] = [ENCABEZADO_COTIZACIONES]
  cotizaciones.forEach((c) => {
    const t = calcularTotales(c)
    filas.push([
      c.numero ?? 'Borrador',
      c.estado,
      nombreCliente(c.clienteId),
      c.vendedor,
      c.creada.slice(0, 10),
      c.emitida?.slice(0, 10) ?? '',
      t.items,
      t.subtotal,
      t.descuentoGlobal,
      t.base,
      t.iva,
      t.total,
    ])
  })
  descargarCsv(nombre, filas)
}

/** Detalle línea a línea: una fila por material cotizado. */
export function exportarDetalle(
  nombre: string,
  cotizacion: Cotizacion,
  cliente: Cliente | undefined,
): void {
  const filas: (string | number)[][] = [
    ['Cotizacion', cotizacion.numero ?? 'Borrador'],
    ['Cliente', cliente?.nombre ?? 'Sin cliente'],
    ['Vendedor', cotizacion.vendedor],
    ['Estado', cotizacion.estado],
    [],
    ['Codigo', 'Material', 'Unidad', 'Cantidad', 'Precio unitario', 'Descuento %', 'Total linea'],
  ]
  cotizacion.items.forEach((i) => {
    filas.push([
      i.codigo,
      i.nombre,
      i.unidad,
      i.cantidad,
      i.precioUnitario,
      i.descuento,
      Math.round(i.cantidad * i.precioUnitario * (1 - i.descuento / 100)),
    ])
  })
  const t = calcularTotales(cotizacion)
  filas.push(
    [],
    ['Subtotal', t.subtotal],
    ['Descuento global', t.descuentoGlobal],
    ['Base gravable', t.base],
    [`IVA ${cotizacion.ivaPct}%`, t.iva],
    ['Total', t.total],
  )
  descargarCsv(nombre, filas)
}
