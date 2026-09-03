const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

export const UNIDAD_LABEL: Record<string, string> = {
  unidad: 'unidad',
  bulto: 'bulto',
  m2: 'm²',
  m3: 'm³',
  kg: 'kg',
  ml: 'ml',
}

/** "$ 1.452.327" — pesos colombianos, sin decimales. */
export function cop(valor: number): string {
  const entero = Math.round(valor)
  return `$ ${entero.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

/** "$ 18,4 M" para tarjetas de métricas. */
export function copCorto(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) {
    return `$ ${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  }
  if (Math.abs(valor) >= 1_000) {
    return `$ ${(valor / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} K`
  }
  return cop(valor)
}

export function fecha(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export function fechaCorta(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
}

export function hora(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + dias)
  return d.toISOString()
}

export function diasRestantes(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

export function iniciales(nombre: string): string {
  return nombre
    .replace(/^(Don|Doña|Sr\.|Sra\.)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}
