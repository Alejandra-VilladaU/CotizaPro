import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Boton, Vacio } from '../components/ui'
import { descargarPdf } from '../lib/pdf'
import HojaCotizacion from '../components/HojaCotizacion'
import { useDatos } from '../lib/store'

export default function Pdf() {
  const { id } = useParams()
  const { cotizacion, cliente, datos } = useDatos()
  const [params] = useSearchParams()
  const actual = id === undefined ? undefined : cotizacion(id)
  const listo = actual !== undefined
  const autoImprimir = params.get('imprimir') === '1'

  // Con ?imprimir=1 se abre directamente el diálogo de imprimir / guardar como PDF.
  useEffect(() => {
    if (!listo || !autoImprimir) return
    const t = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(t)
  }, [listo, autoImprimir])

  if (actual === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Vacio
          titulo="Cotización no encontrada"
          texto="El enlace puede estar vencido o la cotización fue eliminada."
          accion={
            <Link to="/cotizaciones">
              <Boton variante="primario">Ver cotizaciones</Boton>
            </Link>
          }
        />
      </div>
    )
  }

  const empresa = datos.empresa
  const cli = cliente(actual.clienteId)

  return (
    <div className="min-h-full bg-surface py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[816px] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/cotizacion/${actual.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue">
          <ArrowLeft size={16} /> Volver a la cotización
        </Link>
        <div className="flex flex-wrap gap-2">
          <Boton
            onClick={() =>
              void descargarPdf(actual, cli, empresa, datos.materiales)
            }
          >
            <Download size={16} /> Descargar PDF
          </Boton>
          <Boton variante="primario" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Boton>
        </div>
      </div>

      <HojaCotizacion
        cotizacion={actual}
        cliente={cli}
        empresa={empresa}
        materiales={datos.materiales}
      />
    </div>
  )
}
