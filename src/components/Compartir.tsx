import { Check, Copy, Download, Mail, MessageCircle, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { archivoPdf, compartirPdf, descargarPdf } from '../lib/pdf'
import { useDatos } from '../lib/store'
import { Boton, Etiqueta, Modal } from './ui'
import type { Cotizacion } from '../lib/types'

/**
 * Medios de envío hacia los datos registrados del cliente: WhatsApp a su teléfono y
 * correo a su email. El PDF se genera en el navegador y se adjunta al mensaje; si el
 * dispositivo no admite compartir archivos, se descarga y se abre WhatsApp para adjuntarlo.
 */
export default function Compartir({
  cotizacion,
  mensaje,
  telefono,
  email,
  onCerrar,
}: {
  cotizacion: Cotizacion
  mensaje: string
  telefono: string
  email: string
  onCerrar: () => void
}) {
  const { cliente, datos } = useDatos()
  const [copiado, setCopiado] = useState<'enlace' | 'mensaje' | null>(null)
  const [estado, setEstado] = useState<'listo' | 'generando' | 'descargado' | 'adjuntar'>(
    'listo',
  )

  const numero = cotizacion.numero
  const enlace = `${window.location.origin}/pdf/${cotizacion.id}`
  const titulo = numero === null ? 'Cotización (borrador)' : `Cotización #${numero}`
  const soloDigitos = telefono.replace(/\D/g, '')
  // Colombia: los números de 10 dígitos necesitan el indicativo 57.
  const internacional = soloDigitos.length === 10 ? `57${soloDigitos}` : soloDigitos
  // En computador se abre WhatsApp Web directamente: no hace falta la app de escritorio.
  const wa =
    internacional === ''
      ? null
      : `https://web.whatsapp.com/send?phone=${internacional}&text=${encodeURIComponent(mensaje)}`
  const correo =
    email === ''
      ? null
      : `mailto:${email}?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(
          `${mensaje}\n\n${enlace}`,
        )}`

  const clienteActual = cliente(cotizacion.clienteId)
  const pdf = () => archivoPdf(cotizacion, clienteActual, datos.empresa, datos.materiales)

  const enviarWhatsApp = async () => {
    setEstado('generando')
    const archivo = await pdf()
    const compartido = await compartirPdf(archivo, titulo, mensaje)
    if (compartido) {
      setEstado('listo')
      return
    }
    // Respaldo de escritorio: WhatsApp Web no recibe adjuntos por URL, así que
    // bajamos el PDF y abrimos el chat para arrastrarlo.
    await descargarPdf(cotizacion, clienteActual, datos.empresa, datos.materiales)
    setEstado('adjuntar')
    if (wa !== null) window.open(wa, '_blank', 'noopener')
  }

  const guardar = async (siguiente: 'descargado' | 'adjuntar' = 'descargado') => {
    setEstado('generando')
    await descargarPdf(cotizacion, clienteActual, datos.empresa, datos.materiales)
    setEstado(siguiente)
  }

  const copiar = async (valor: string, cual: 'enlace' | 'mensaje') => {
    await navigator.clipboard.writeText(valor)
    setCopiado(cual)
    window.setTimeout(() => setCopiado(null), 2000)
  }

  const caja =
    'grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface disabled:opacity-50'

  return (
    <Modal
      titulo={`Compartir ${titulo.toLowerCase()}`}
      subtitulo="El PDF se adjunta al mensaje, no se envía un enlace"
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
          <button
            type="button"
            className={caja}
            disabled={estado === 'generando'}
            onClick={() => void enviarWhatsApp()}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ok-soft text-ok">
              <MessageCircle size={18} />
            </span>
            WhatsApp
          </button>
        )}
        {correo === null ? (
          <span className={`${caja} opacity-50`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-soft text-blue">
              <Mail size={18} />
            </span>
            Sin correo
          </span>
        ) : (
          <a href={correo} className={caja} onClick={() => void guardar('adjuntar')}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-soft text-blue">
              <Mail size={18} />
            </span>
            Correo
          </a>
        )}
        <button
          type="button"
          className={caja}
          disabled={estado === 'generando'}
          onClick={() => void guardar()}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-danger-soft text-danger">
            <Download size={18} />
          </span>
          Descargar PDF
        </button>
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

      {estado === 'descargado' && (
        <p className="mt-3 rounded-[10px] bg-blue-soft p-3 text-[13px] leading-relaxed text-navy">
          El PDF de la cotización quedó en tus descargas.
        </p>
      )}

      {estado === 'adjuntar' && (
        <p className="mt-3 rounded-[10px] bg-blue-soft p-3 text-[13px] leading-relaxed text-navy">
          Este navegador no adjunta archivos por sí solo: el PDF quedó en tus descargas. Adjúntalo
          con el clip de adjuntar en la conversación de WhatsApp Web que acaba de abrirse (no necesitas la
          app de escritorio). Desde el celular el PDF se adjunta solo.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {wa !== null && (
          <Boton
            variante="primario"
            className="w-full"
            disabled={estado === 'generando'}
            onClick={() => void enviarWhatsApp()}
          >
            {estado === 'generando' ? 'Generando PDF…' : 'Enviar PDF por WhatsApp'}
          </Boton>
        )}
        <Link to={`/pdf/${cotizacion.id}?imprimir=1`} className="block">
          <Boton className="w-full">
            <Printer size={16} /> Imprimir / Vista previa
          </Boton>
        </Link>
      </div>
    </Modal>
  )
}
