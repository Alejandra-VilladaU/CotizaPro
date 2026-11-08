import { Check, Copy, Download, Mail, MessageCircle, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { armarEnlace, publicarEnlace, urlEnlace } from '../lib/enlaces'
import { archivoPdf, compartirPdf, descargarPdf } from '../lib/pdf'
import { copiarTexto } from '../lib/portapapeles'
import { referencia } from '../lib/quote'
import { useDatos } from '../lib/store'
import { Boton, Etiqueta, Modal } from './ui'
import type { Cotizacion } from '../lib/types'

/**
 * Medios de envío hacia los datos registrados del cliente: WhatsApp a su teléfono y
 * correo a su email. Al abrirse publica la copia que el cliente ve sin sesión en `/c/{id}`
 * y prepara el PDF, que se adjunta al mensaje junto con el enlace; si el dispositivo no
 * admite compartir archivos, se descarga y se abre WhatsApp para adjuntarlo.
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
  const [sinPortapapeles, setSinPortapapeles] = useState(false)
  const [publicacion, setPublicacion] = useState<'publicando' | 'lista' | 'error'>('publicando')
  const [estado, setEstado] = useState<'listo' | 'generando' | 'descargado' | 'adjuntar'>(
    'listo',
  )

  const enlace = urlEnlace(cotizacion.id)
  const texto = `${mensaje}\n\nVer la cotización: ${enlace}`
  const titulo = `Cotización ${referencia(cotizacion)}${cotizacion.numero === null ? ' (borrador)' : ''}`
  const soloDigitos = telefono.replace(/\D/g, '')
  // Colombia: los números de 10 dígitos necesitan el indicativo 57.
  const internacional = soloDigitos.length === 10 ? `57${soloDigitos}` : soloDigitos
  // En computador se abre WhatsApp Web directamente: no hace falta la app de escritorio.
  // En celular y tablet, wa.me abre la app de WhatsApp.
  const tactil = window.matchMedia('(pointer: coarse)').matches
  const wa =
    internacional === ''
      ? null
      : `${tactil ? 'https://wa.me/' : 'https://web.whatsapp.com/send?phone='}${internacional}${
          tactil ? '?' : '&'
        }text=${encodeURIComponent(texto)}`
  const correo =
    email === ''
      ? null
      : `mailto:${email}?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(texto)}`

  const clienteActual = cliente(cotizacion.clienteId)
  const pdf = () => archivoPdf(cotizacion, clienteActual, datos.empresa, datos.materiales)

  // Publica el enlace y prepara el PDF al abrir: el celular solo deja compartir justo
  // después del toque, sin esperar a que se genere el archivo.
  const archivo = useRef<File | null>(null)
  const preparar = useRef<() => { enlace: ReturnType<typeof armarEnlace>; pdf: () => Promise<File> }>(
    null as never,
  )
  preparar.current = () => ({
    enlace: armarEnlace(cotizacion, clienteActual, datos.empresa, datos.materiales),
    pdf,
  })
  useEffect(() => {
    let vigente = true
    const { enlace: copia, pdf: generar } = preparar.current()
    setPublicacion('publicando')
    publicarEnlace(copia)
      .then(() => vigente && setPublicacion('lista'))
      .catch(() => vigente && setPublicacion('error'))
    generar()
      .then((f) => {
        if (vigente) archivo.current = f
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [cotizacion.id, cotizacion.actualizada])

  const enviarWhatsApp = async () => {
    setEstado('generando')
    const listo = archivo.current ?? (await pdf())
    const compartido = await compartirPdf(listo, titulo, texto)
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
    if (!(await copiarTexto(valor))) {
      setSinPortapapeles(true)
      return
    }
    setSinPortapapeles(false)
    setCopiado(cual)
    window.setTimeout(() => setCopiado(null), 2000)
  }

  const caja =
    'grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface disabled:opacity-50'

  return (
    <Modal
      titulo={`Compartir ${titulo.toLowerCase()}`}
      subtitulo="El mensaje lleva el PDF adjunto y el enlace para ver la cotización en línea"
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
        <p className="mt-1 break-all text-sm text-navy">
          Ver la cotización:{' '}
          <a href={enlace} target="_blank" rel="noopener" className="font-semibold text-blue">
            {enlace}
          </a>
        </p>
        {publicacion === 'publicando' && (
          <p className="mt-1 text-xs text-muted">Publicando el enlace…</p>
        )}
        {publicacion === 'error' && (
          <p className="mt-1 text-xs font-semibold text-danger">
            No se pudo publicar el enlace: el cliente no podrá abrirlo. Revisa la conexión y vuelve a
            abrir Compartir.
          </p>
        )}
        <div className="mt-1 text-xs text-muted">
          {telefono === '' ? 'Cliente sin teléfono registrado' : `WhatsApp a ${telefono}`}
          {' · '}
          {email === '' ? 'Cliente sin correo registrado' : `Correo a ${email}`}
        </div>
        <button
          type="button"
          onClick={() => void copiar(texto, 'mensaje')}
          className="mt-2 text-[13px] font-bold text-blue"
        >
          {copiado === 'mensaje' ? 'Mensaje copiado' : 'Copiar mensaje'}
        </button>
      </div>

      {sinPortapapeles && (
        <div className="mt-3 rounded-[10px] bg-warn-soft p-3 text-[13px] leading-relaxed text-navy">
          Este navegador no dejó copiar. Mantén presionado el texto y cópialo a mano:
          <textarea
            readOnly
            value={texto}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 h-24 w-full rounded-md border border-line bg-white p-2 text-xs"
          />
        </div>
      )}

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
