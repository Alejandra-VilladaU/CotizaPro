import type { Material, Unidad } from './types'

/** Material cuyo stock no alcanzaba para cubrir una cotización aceptada. */
export type Faltante = { nombre: string; faltaron: number; unidad: Unidad }

const PATRON = /^COD-(\d+)$/i
const INICIO = 1000

/**
 * Siguiente código consecutivo del inventario (`COD-1234`). Toma el mayor
 * consecutivo existente; los códigos con otro formato no cuentan.
 */
export function siguienteCodigo(materiales: Material[]): string {
  const maximo = materiales.reduce((acc, m) => {
    const coincide = PATRON.exec(m.codigo.trim())
    if (coincide === null) return acc
    return Math.max(acc, Number(coincide[1]))
  }, INICIO)
  return `COD-${maximo + 1}`
}

/** Aviso para el vendedor cuando el inventario no alcanzaba y quedó en negativo. */
export function mensajeFaltantes(faltantes: Faltante[]): string | null {
  if (faltantes.length === 0) return null
  const detalle = faltantes
    .map((f) => `${f.nombre} (faltan ${f.faltaron} ${f.unidad})`)
    .join(', ')
  return `Se descontó el inventario, pero no alcanzaba: ${detalle}. Avisa al administrador para reponer el stock.`
}
