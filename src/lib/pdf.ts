import type { jsPDF } from 'jspdf'
import { UNIDAD_LABEL, cop, fecha } from './format'
import { calcularTotales, totalLinea, vence } from './quote'
import type { Cliente, Cotizacion, Empresa, Material } from './types'

const NAVY: [number, number, number] = [4, 36, 76]
const AZUL: [number, number, number] = [2, 92, 214]
const GRIS: [number, number, number] = [110, 120, 135]
const LINEA: [number, number, number] = [221, 227, 234]
const VERDE: [number, number, number] = [22, 138, 90]

const MARGEN = 46
const ANCHO = 595 // A4 en puntos
const ALTO = 842

/** Carga el logo como data URL para incrustarlo en el PDF; null si no se puede. */
async function logoDataUrl(url: string): Promise<string | null> {
  try {
    const respuesta = await fetch(url)
    if (!respuesta.ok) return null
    const blob = await respuesta.blob()
    return await new Promise<string | null>((resolver) => {
      const lector = new FileReader()
      lector.onload = () => resolver(typeof lector.result === 'string' ? lector.result : null)
      lector.onerror = () => resolver(null)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function nombreArchivo(cotizacion: Cotizacion): string {
  return `cotizacion-${cotizacion.numero ?? 'borrador'}.pdf`
}

/**
 * Arma el PDF de la cotización con el mismo contenido que la vista imprimible.
 * Devuelve el documento para descargarlo, abrirlo o adjuntarlo a WhatsApp.
 */
export async function construirPdf(
  cotizacion: Cotizacion,
  cliente: Cliente | undefined,
  empresa: Empresa,
  materiales: Material[],
): Promise<jsPDF> {
  // Carga diferida: jsPDF solo pesa en el bundle de quien genera un PDF.
  const { jsPDF: JsPdf } = await import('jspdf')
  const doc = new JsPdf({ unit: 'pt', format: 'a4' })
  const totales = calcularTotales(cotizacion)
  const derecha = ANCHO - MARGEN
  let y = MARGEN

  const texto = (
    valor: string,
    x: number,
    py: number,
    opciones: {
      size?: number
      bold?: boolean
      color?: [number, number, number]
      align?: 'left' | 'center' | 'right'
    } = {},
  ) => {
    doc.setFontSize(opciones.size ?? 9)
    doc.setFont('helvetica', opciones.bold === true ? 'bold' : 'normal')
    const [r, g, b] = opciones.color ?? NAVY
    doc.setTextColor(r, g, b)
    doc.text(valor, x, py, { align: opciones.align ?? 'left' })
  }

  const logo = await logoDataUrl(empresa.logoUrl)
  if (logo !== null) {
    try {
      doc.addImage(logo, 'PNG', MARGEN, y, 118, 30)
    } catch {
      texto(empresa.nombre, MARGEN, y + 20, { size: 15, bold: true })
    }
  } else {
    texto(empresa.nombre, MARGEN, y + 20, { size: 15, bold: true })
  }

  texto(empresa.nombre, MARGEN, y + 48, { size: 10, bold: true })
  texto(`NIT ${empresa.nit} · ${empresa.direccion}`, MARGEN, y + 61, { size: 8, color: GRIS })
  texto(`Tel. ${empresa.telefono} · ${empresa.email}`, MARGEN, y + 72, { size: 8, color: GRIS })

  texto('COTIZACIÓN', derecha, y + 10, { size: 8, bold: true, color: GRIS, align: 'right' })
  texto(
    cotizacion.numero === null ? 'Borrador' : `#${cotizacion.numero}`,
    derecha,
    y + 32,
    { size: 22, bold: true, align: 'right' },
  )
  texto(
    `Emitida: ${fecha(cotizacion.emitida ?? cotizacion.creada)}`,
    derecha,
    y + 48,
    { size: 8, color: GRIS, align: 'right' },
  )
  texto(
    `Válida hasta: ${fecha(vence(cotizacion))} (${cotizacion.vigenciaDias} días)`,
    derecha,
    y + 59,
    { size: 8, color: GRIS, align: 'right' },
  )
  texto(`Asesor: ${cotizacion.vendedor}`, derecha, y + 70, {
    size: 8,
    color: GRIS,
    align: 'right',
  })

  y += 86
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(2)
  doc.line(MARGEN, y, derecha, y)
  y += 20

  texto('CLIENTE', MARGEN, y, { size: 8, bold: true, color: GRIS })
  texto(cliente?.nombre ?? 'Sin cliente', MARGEN, y + 14, { size: 11, bold: true })
  const datosCliente = [
    cliente?.documento ?? '',
    cliente?.telefono ?? '',
    cliente?.email ?? '',
    cliente?.obra === undefined || cliente.obra === '' ? '' : `Obra: ${cliente.obra}`,
  ].filter((v) => v !== '')
  datosCliente.forEach((linea, i) => {
    texto(linea, MARGEN, y + 28 + i * 11, { size: 8, color: GRIS })
  })
  y += 34 + datosCliente.length * 11

  // Tabla de materiales
  doc.setFillColor(...NAVY)
  doc.rect(MARGEN, y, derecha - MARGEN, 20, 'F')
  const colCant = derecha - 205
  const colUnidad = derecha - 165
  const colPrecio = derecha - 90
  texto('MATERIAL', MARGEN + 8, y + 13, { size: 8, bold: true, color: [255, 255, 255] })
  texto('CANT.', colCant, y + 13, { size: 8, bold: true, color: [255, 255, 255], align: 'right' })
  texto('UNIDAD', colUnidad, y + 13, { size: 8, bold: true, color: [255, 255, 255] })
  texto('PRECIO', colPrecio, y + 13, {
    size: 8,
    bold: true,
    color: [255, 255, 255],
    align: 'right',
  })
  texto('TOTAL', derecha - 8, y + 13, {
    size: 8,
    bold: true,
    color: [255, 255, 255],
    align: 'right',
  })
  y += 20

  const saltoDePagina = (alto: number) => {
    if (y + alto <= ALTO - MARGEN - 40) return
    doc.addPage()
    y = MARGEN
  }

  cotizacion.items.forEach((item) => {
    const material = materiales.find((m) => m.id === item.materialId || m.codigo === item.codigo)
    const detalle = material?.descripcion ?? ''
    const lineasDetalle = detalle === '' ? [] : doc.splitTextToSize(detalle, 250)
    const alto = 26 + lineasDetalle.length * 9
    saltoDePagina(alto)

    texto(item.nombre, MARGEN + 8, y + 13, { size: 9, bold: true })
    const pie =
      item.descuento > 0 ? `${item.codigo} · descuento ${item.descuento} %` : item.codigo
    texto(pie, MARGEN + 8, y + 23, { size: 7.5, color: GRIS })
    lineasDetalle.forEach((linea: string, i: number) => {
      texto(linea, MARGEN + 8, y + 32 + i * 9, { size: 7.5, color: GRIS })
    })
    texto(String(item.cantidad), colCant, y + 13, { size: 9, align: 'right' })
    texto(UNIDAD_LABEL[item.unidad], colUnidad, y + 13, { size: 8, color: GRIS })
    texto(cop(item.precioUnitario), colPrecio, y + 13, { size: 9, align: 'right' })
    texto(cop(totalLinea(item)), derecha - 8, y + 13, { size: 9, bold: true, align: 'right' })

    y += alto
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.5)
    doc.line(MARGEN, y, derecha, y)
  })

  // Totales
  saltoDePagina(110)
  y += 16
  const filas: [string, string][] = [
    ['Subtotal', cop(totales.subtotal)],
    [`Descuento (${cotizacion.descuentoGlobal} %)`, `- ${cop(totales.descuentoGlobal)}`],
    ['Base gravable', cop(totales.base)],
    [`IVA ${cotizacion.ivaPct} %`, cop(totales.iva)],
  ]
  filas.forEach(([etiqueta, valor]) => {
    texto(etiqueta, derecha - 190, y, { size: 9, color: GRIS })
    texto(valor, derecha, y, { size: 9, bold: true, align: 'right' })
    y += 14
  })
  y += 4
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(1.5)
  doc.line(derecha - 200, y, derecha, y)
  y += 20
  texto('TOTAL A PAGAR', derecha - 200, y, { size: 8, bold: true, color: GRIS })
  texto(cop(totales.total), derecha, y + 2, { size: 18, bold: true, align: 'right' })
  y += 26

  if (cotizacion.pago !== undefined && cotizacion.pago !== null) {
    saltoDePagina(60)
    y += 14
    texto('PAGO RECIBIDO', MARGEN, y, { size: 8, bold: true, color: VERDE })
    const ref = cotizacion.pago.referencia === '' ? '' : ` · Ref. ${cotizacion.pago.referencia}`
    texto(
      `${cop(cotizacion.pago.monto)} · ${cotizacion.pago.metodo} · ${fecha(cotizacion.pago.fecha)}${ref}`,
      MARGEN,
      y + 13,
      { size: 8.5 },
    )
    texto(`Registrado por ${cotizacion.pago.registradoPor}`, MARGEN, y + 24, {
      size: 8,
      color: GRIS,
    })
    y += 34
  }

  saltoDePagina(80)
  y += 16
  texto('CONDICIONES', MARGEN, y, { size: 8, bold: true, color: AZUL })
  doc.splitTextToSize(empresa.condiciones, derecha - MARGEN).forEach((linea: string, i: number) => {
    texto(linea, MARGEN, y + 13 + i * 10, { size: 8, color: GRIS })
  })
  y += 16 + doc.splitTextToSize(empresa.condiciones, derecha - MARGEN).length * 10

  const notas = `${cotizacion.notas === '' ? '' : `${cotizacion.notas} `}${empresa.notas}`
  saltoDePagina(60)
  y += 10
  texto('NOTAS', MARGEN, y, { size: 8, bold: true, color: GRIS })
  doc.splitTextToSize(notas, derecha - MARGEN).forEach((linea: string, i: number) => {
    texto(linea, MARGEN, y + 13 + i * 10, { size: 8, color: GRIS })
  })

  texto('Cotización generada con CotizaPro', ANCHO / 2, ALTO - 28, {
    size: 7.5,
    color: GRIS,
    align: 'center',
  })

  return doc
}

/** PDF listo para adjuntar (WhatsApp, correo) o guardar. */
export async function archivoPdf(
  cotizacion: Cotizacion,
  cliente: Cliente | undefined,
  empresa: Empresa,
  materiales: Material[],
): Promise<File> {
  const doc = await construirPdf(cotizacion, cliente, empresa, materiales)
  return new File([doc.output('blob')], nombreArchivo(cotizacion), { type: 'application/pdf' })
}

export async function descargarPdf(
  cotizacion: Cotizacion,
  cliente: Cliente | undefined,
  empresa: Empresa,
  materiales: Material[],
): Promise<void> {
  const doc = await construirPdf(cotizacion, cliente, empresa, materiales)
  doc.save(nombreArchivo(cotizacion))
}

/**
 * Comparte el PDF por los medios del dispositivo (WhatsApp, correo, etc.).
 * Devuelve false cuando el navegador no admite compartir archivos: en ese caso
 * la app descarga el PDF y abre WhatsApp para adjuntarlo manualmente.
 */
export async function compartirPdf(archivo: File, titulo: string, mensaje: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (datos: { files?: File[] }) => boolean
    share?: (datos: { files?: File[]; title?: string; text?: string }) => Promise<void>
  }
  if (nav.share === undefined || nav.canShare === undefined || !nav.canShare({ files: [archivo] }))
    return false
  try {
    await nav.share({ files: [archivo], title: titulo, text: mensaje })
    return true
  } catch (error) {
    // El usuario canceló el diálogo: no es un fallo que deba disparar el respaldo.
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return false
  }
}
