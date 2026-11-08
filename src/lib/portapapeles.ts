/**
 * Copia texto al portapapeles. Usa la API moderna cuando el navegador la permite y, si no
 * (http en la red local, Safari, permisos), el método clásico con un textarea temporal.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Seguimos con el método clásico.
  }
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  // Dentro del diálogo abierto, para que el foco no salga de él.
  const destino = document.activeElement?.closest('[role="dialog"]') ?? document.body
  destino.appendChild(area)
  area.focus()
  area.select()
  area.setSelectionRange(0, texto.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  return ok
}
