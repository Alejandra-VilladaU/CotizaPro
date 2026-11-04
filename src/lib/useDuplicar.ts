import { useNavigate } from 'react-router-dom'
import { referencia } from './quote'
import { useDatos } from './store'
import type { Cotizacion } from './types'

export const AYUDA_DUPLICAR_BORRADOR =
  'Termina y genera esta cotización antes de duplicarla.'

/**
 * Duplicar con control: solo cotizaciones ya generadas, con confirmación, y sin crear una
 * segunda copia si ya hay un borrador pendiente copiado de la misma cotización.
 */
export function useDuplicar(): (cotizacion: Cotizacion) => void {
  const { duplicar, copiaPendiente } = useDatos()
  const navigate = useNavigate()

  return (cotizacion) => {
    if (cotizacion.estado === 'Borrador') {
      alert(AYUDA_DUPLICAR_BORRADOR)
      return
    }
    const pendiente = copiaPendiente(cotizacion.id)
    if (pendiente !== undefined) {
      alert(
        `Ya tienes el borrador ${referencia(pendiente)} copiado de la cotización ${referencia(cotizacion)} y aún no lo has generado. Te llevo a ese borrador.`,
      )
      navigate(`/cotizacion/${pendiente.id}`)
      return
    }
    if (!confirm(`¿Crear un borrador nuevo a partir de la cotización ${referencia(cotizacion)}?`))
      return
    const nueva = duplicar(cotizacion.id)
    if (nueva !== null) navigate(`/cotizacion/${nueva}`)
  }
}
