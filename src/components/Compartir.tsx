import { Check, Copy, Download, Mail, MessageCircle, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Etiqueta, Modal } from './ui'

/**
 * Medios de envío hacia los datos registrados del cliente: WhatsApp a su teléfono y
 * correo a su email. Si el cliente no tiene alguno, la opción queda deshabilitada.
 */
export default function Compartir({
  cotizacionId,
  numero,
  mensaje,
  telefono,
  email,
  onCerrar,
}: {
  cotizacionId: string
  numero: number | null
  mensaje: string
  telefono: string
  email: string
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState<'enlace' | 'mensaje' | null>(null)
  const enlace = `${window.location.origin}/pdf/${cotizacionId}`
  const titulo = numero === null ? 'Cotización (borrador)' : `Cotización #${numero}`
  const soloDigitos = telefono.replace(/\D/g, '')
  // Colombia: los números de 10 dígitos necesitan el indicativo 57 para wa.me.
  const internacional = soloDigitos.length === 10 ? `57${soloDigitos}` : soloDigitos
  const wa =
    internacional === ''
      ? null
      : `https://wa.me/${internacional}?text=${encodeURIComponent(`${mensaje} ${enlace}`)}`
  const correo =
    email === ''
      ? null
      : `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          titulo,
        )}&body=${encodeURIComponent(`${mensaje}\n\n${enlace}`)}`

  const copiar = async (valor: string, cual: 'enlace' | 'mensaje') => {
    await navigator.clipboard.writeText(valor)
    setCopiado(cual)
    window.setTimeout(() => setCopiado(null), 2000)
  }

  const caja =
    'grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface'

  return (
    <Modal
      titulo={`Compartir ${titulo.toLowerCase()}`}
      subtitulo="PDF de 1 página · se envía a los datos registrados del cliente"
      onCerrar={onCerrar}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {wa === null ? (
          <span className={`${caja} opacity-50`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ok-soft text-ok">
              <MessageCircle size={18} />
            </span>
            Sin teléfono
          </span>
        ) : (
          <a href={wa} target="_blank" rel="noreferrer" className={caja}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ok-soft text-ok">
              <MessageCircle size={18} />
            </span>
            WhatsApp
          </a>
        )}
        {correo === null ? (
          <span className={`${caja} opacity-50`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-soft text-blue">
              <Mail size={18} />
            </span>
            Sin correo
          </span>
        ) : (
          <a href={correo} className={caja}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-soft text-blue">
              <Mail size={18} />
            </span>
            Correo
          </a>
        )}
        <Link to={`/pdf/${cotizacionId}`} className={caja}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-danger-soft text-danger">
            <Download size={18} />
          </span>
          Descargar PDF
        </Link>
        <button type="button" onClick={() => void copiar(enlace, 'enlace')} className={caja}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-muted">
            {copiado === 'enlace' ? <Check size={18} /> : <Copy size={18} />}
          </span>
          {copiado === 'enlace' ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-surface p-3">
        <Etiqueta className="mb-1">Mensaje que se enviará</Etiqueta>
        <p className="text-sm leading-relaxed text-navy">{mensaje}</p>
        <div className="mt-1 text-xs text-muted">
          {telefono === '' ? 'Cliente sin teléfono registrado' : `WhatsApp a ${telefono}`}
          {' · '}
          {email === '' ? 'Cliente sin correo registrado' : `Correo a ${email}`}
        </div>
        <button
          type="button"
          onClick={() => void copiar(mensaje, 'mensaje')}
          className="mt-2 text-[13px] font-bold text-blue"
        >
          {copiado === 'mensaje' ? 'Mensaje copiado' : 'Copiar mensaje'}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {wa !== null && (
          <a href={wa} target="_blank" rel="noreferrer" className="block">
            <Boton variante="primario" className="w-full">
              Enviar por WhatsApp
            </Boton>
          </a>
        )}
        <Link to={`/pdf/${cotizacionId}?imprimir=1`} className="block">
          <Boton className="w-full">
            <Printer size={16} /> Imprimir / Descargar PDF
          </Boton>
        </Link>
      </div>
    </Modal>
  )
}
