import { Download, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import HojaCotizacion from '../components/HojaCotizacion'
import { Boton, Vacio } from '../components/ui'
import { leerEnlace, type EnlacePublico } from '../lib/enlaces'
import { descargarPdf } from '../lib/pdf'
import { referencia } from '../lib/quote'

/** Vista del cliente: abre sin sesión la copia publicada al compartir la cotización. */
export default function CotizacionPublica() {
  const { id } = useParams()
  const [enlace, setEnlace] = useState<EnlacePublico | null | undefined>(undefined)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (id === undefined) return
    let vigente = true
    leerEnlace(id)
      .then((e) => vigente && setEnlace(e))
      .catch(() => vigente && setEnlace(null))
    return () => {
      vigente = false
    }
  }, [id])

  useEffect(() => {
    if (enlace != null) document.title = `Cotización ${referencia(enlace.cotizacion)} · ${enlace.empresa.nombre}`
  }, [enlace])

  if (enlace === undefined) {
    return <p className="py-16 text-center text-sm text-muted">Cargando cotización…</p>
  }
  if (enlace === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Vacio
          titulo="Cotización no disponible"
          texto="El enlace no es válido o la cotización ya no está publicada. Pídele a tu asesor que te la envíe de nuevo."
        />
      </div>
    )
  }

  const { cotizacion, empresa, materiales } = enlace
  const cliente = enlace.cliente ?? undefined
  const descargar = async () => {
    setDescargando(true)
    try {
      await descargarPdf(cotizacion, cliente, empresa, materiales)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="min-h-full bg-surface py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[816px] flex-wrap items-center justify-between gap-3 px-4">
        <div className="text-sm font-bold text-navy">
          Cotización {referencia(cotizacion)} · {empresa.nombre}
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton disabled={descargando} onClick={() => void descargar()}>
            <Download size={16} /> {descargando ? 'Generando…' : 'Descargar PDF'}
          </Boton>
          <Boton variante="primario" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Boton>
        </div>
      </div>
      <HojaCotizacion cotizacion={cotizacion} cliente={cliente} empresa={empresa} materiales={materiales} />
    </div>
  )
}
