import type { Material } from './types'

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
