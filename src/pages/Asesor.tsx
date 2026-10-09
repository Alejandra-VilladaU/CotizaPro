import { ImagePlus, SendHorizonal, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Banner, Boton, Card, Etiqueta, Vacio } from '../components/ui'
import { useAuth } from '../lib/auth'
import { cop } from '../lib/format'
import {
  esConsultaDelNegocio,
  FUERA_DE_ALCANCE,
  leerConfigIA,
  leerImagen,
  preguntarIA,
  recomendacion,
  type Adjunto,
  type ConfigIA,
  type Mensaje,
  type Recomendacion,
} from '../lib/ia'
import { useDatos } from '../lib/store'

const EJEMPLOS = [
  '¿Cómo construyo un mueble de cocina de 2,40 m con dos puertas?',
  'Necesito una mesa de comedor de 1,60 × 0,90 m en madera: ¿qué materiales llevo?',
  'Adjunto el dibujo de un closet: dime medidas y materiales.',
]

const nuevoId = (): string => Math.random().toString(36).slice(2)

/** La respuesta cierra con "MATERIALES SUGERIDOS": esa sección se muestra como botones. */
const sinListado = (texto: string): string => texto.split(/MATERIALES SUGERIDOS/i)[0].trim()

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const mia = mensaje.autor === 'usuario'
  return (
    <div className={`flex ${mia ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[14px] px-4 py-3 text-sm leading-relaxed lg:max-w-[75%] ${
          mia ? 'bg-blue text-white' : 'border border-line bg-white text-navy'
        }`}
      >
        {mensaje.adjuntos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {mensaje.adjuntos.map((a) => (
              <img
                key={a.nombre}
                src={a.vista}
                alt={a.nombre}
                className="h-24 w-24 rounded-[10px] object-cover"
              />
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {mia ? mensaje.texto : sinListado(mensaje.texto)}
        </div>
      </div>
    </div>
  )
}

function Sugerencias({ lista }: { lista: Recomendacion }) {
  const { agregarMaterial } = useDatos()
  const { puede } = useAuth()
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [agregados, setAgregados] = useState<string[]>([])
  if (lista.enInventario.length === 0 && lista.noDisponibles.length === 0) return null

  const cantidadDe = ({ material, cantidad }: Recomendacion['enInventario'][number]): number =>
    cantidades[material.id] ?? cantidad
  const total = lista.enInventario.reduce((acc, s) => acc + s.material.precio * cantidadDe(s), 0)

  return (
    <Card className="mt-2 p-3">
      {lista.enInventario.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <Etiqueta>Materiales del inventario para este proyecto</Etiqueta>
            <span className="text-sm font-extrabold text-navy">{cop(total)}</span>
          </div>
          <div className="mt-2 space-y-2">
            {lista.enInventario.map((sugerencia) => {
              const { material } = sugerencia
              const cantidad = cantidadDe(sugerencia)
              const agregado = agregados.includes(material.id)
              return (
                <div key={material.id} className="flex items-center gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-navy">{material.nombre}</div>
                    <div className="text-xs text-muted">
                      {material.codigo} · {cop(material.precio)} / {material.unidad} ·{' '}
                      {cop(material.precio * cantidad)}
                    </div>
                    {cantidad > material.stock && (
                      <div className="text-xs font-semibold text-warn">
                        Solo hay {material.stock} {material.unidad} en inventario
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={cantidad}
                    aria-label={`Cantidad de ${material.nombre}`}
                    disabled={agregado}
                    onChange={(e) =>
                      setCantidades((c) => ({ ...c, [material.id]: Number(e.target.value) }))
                    }
                    className="h-9 w-16 rounded-lg border border-line px-2 text-center text-[15px] font-extrabold text-navy outline-none focus:border-blue disabled:bg-surface disabled:text-muted"
                  />
                  {puede('cotizaciones.crear') && (
                    <Boton
                      tamano="sm"
                      variante={agregado ? 'secundario' : 'primario'}
                      disabled={agregado || cantidad <= 0}
                      onClick={() => {
                        agregarMaterial(material.id, cantidad)
                        setAgregados((a) => [...a, material.id])
                      }}
                    >
                      {agregado ? 'Agregado' : 'Agregar'}
                    </Boton>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {lista.noDisponibles.length > 0 && (
        <div className={lista.enInventario.length > 0 ? 'mt-3 border-t border-line pt-3' : ''}>
          <Etiqueta>No está en el inventario de la ferretería</Etiqueta>
          <ul className="mt-2 space-y-1.5">
            {lista.noDisponibles.map((f) => (
              <li key={f.nombre} className="flex items-center gap-2 text-sm">
                <Badge tono="warn">Falta</Badge>
                <span className="min-w-0 flex-1 truncate font-semibold text-navy">{f.nombre}</span>
                <span className="shrink-0 text-xs text-muted">
                  {f.cantidad} {f.unidad}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Estos materiales no se pueden cotizar: consíguelos aparte o pídele al administrador que
            los cargue al inventario.
          </p>
        </div>
      )}

      {puede('cotizaciones.crear') && lista.enInventario.length > 0 && (
        <Link
          to="/cotizacion"
          className="mt-3 block rounded-[10px] bg-navy px-4 py-2.5 text-center text-sm font-bold text-white"
        >
          Ir a la cotización en curso →
        </Link>
      )}
    </Card>
  )
}

export default function Asesor() {
  const { materialesActivos } = useDatos()
  const { usuario } = useAuth()
  const [config, setConfig] = useState<ConfigIA | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void leerConfigIA().then(setConfig)
  }, [])

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pensando])

  const ultima = mensajes.at(-1)
  const recomendados = useMemo(
    () =>
      ultima === undefined || ultima.autor !== 'asesor'
        ? { enInventario: [], noDisponibles: [] }
        : recomendacion(ultima.texto, materialesActivos),
    [ultima, materialesActivos],
  )

  const listo = config !== null && config.apiKey !== ''

  const enviar = async () => {
    if (config === null) return
    if (texto.trim() === '' && adjuntos.length === 0) return

    const pregunta: Mensaje = { id: nuevoId(), autor: 'usuario', texto, adjuntos }
    const historial = [...mensajes, pregunta]
    setMensajes(historial)
    setTexto('')
    setAdjuntos([])
    setError(null)

    // Lo ajeno al negocio ni se envía: ahorra cuota de Gemini y deja claro el alcance.
    const delNegocio =
      adjuntos.length > 0 ||
      esConsultaDelNegocio(texto, materialesActivos, mensajes.some((m) => m.autor === 'asesor'))
    if (!delNegocio) {
      setMensajes((m) => [
        ...m,
        { id: nuevoId(), autor: 'asesor', texto: FUERA_DE_ALCANCE, adjuntos: [] },
      ])
      return
    }

    setPensando(true)
    try {
      const respuesta = await preguntarIA(config, historial, materialesActivos)
      setMensajes((m) => [...m, { id: nuevoId(), autor: 'asesor', texto: respuesta, adjuntos: [] }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'El asesor no está disponible.')
    } finally {
      setPensando(false)
    }
  }

  const cargar = async (archivos: FileList | null) => {
    if (archivos === null) return
    const imagenes = [...archivos].filter((f) => f.type.startsWith('image/'))
    const leidos = await Promise.all(imagenes.map(leerImagen))
    setAdjuntos((a) => [...a, ...leidos].slice(0, 4))
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-navy">
            <Sparkles size={20} className="text-blue" aria-hidden />
            Asesor de proyectos
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Pregunta cómo construir un mueble u obra, adjunta fotos o dibujos y pasa los
            materiales a la cotización. Solo responde temas de construcción, remodelación,
            carpintería y los materiales de la ferretería.
          </p>
        </div>
        {mensajes.length > 0 && (
          <Boton tamano="sm" onClick={() => setMensajes([])}>
            <Trash2 size={15} aria-hidden />
            Vaciar chat
          </Boton>
        )}
      </div>

      {config !== null && !listo && (
        <Banner tono="warn">
          {usuario?.rol === 'Administrador' ? (
            <>
              Agrega la clave gratuita de Google Gemini en <Link to="/ajustes" className="font-bold underline">Ajustes → Asesor con IA</Link>.
            </>
          ) : (
            'Pídele al administrador que configure la clave del asesor en Ajustes.'
          )}
        </Banner>
      )}

      <div className="mt-2 min-h-[240px] flex-1 space-y-3 overflow-y-auto">
        {mensajes.length === 0 && (
          <Vacio
            titulo="Cuéntale tu proyecto"
            texto="El asesor calcula medidas y materiales usando el inventario de tu ferretería."
            accion={
              <div className="flex flex-wrap justify-center gap-2">
                {EJEMPLOS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setTexto(e)}
                    className="rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] font-semibold text-navy hover:bg-surface"
                  >
                    {e}
                  </button>
                ))}
              </div>
            }
          />
        )}
        {mensajes.map((m) => (
          <Burbuja key={m.id} mensaje={m} />
        ))}
        {!pensando && <Sugerencias key={ultima?.id} lista={recomendados} />}
        {pensando && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Badge tono="blue">Asesor</Badge>
            Analizando tu proyecto…
          </div>
        )}
        <div ref={fin} />
      </div>

      {error !== null && (
        <div className="mt-3">
          <Banner tono="danger">{error}</Banner>
        </div>
      )}

      <Card className="mt-3 p-3">
        {adjuntos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {adjuntos.map((a) => (
              <div key={a.nombre} className="relative">
                <img src={a.vista} alt={a.nombre} className="h-16 w-16 rounded-[10px] object-cover" />
                <button
                  type="button"
                  aria-label={`Quitar ${a.nombre}`}
                  onClick={() => setAdjuntos((lista) => lista.filter((x) => x.nombre !== a.nombre))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-navy p-1 text-white"
                >
                  <X size={12} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={archivo}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void cargar(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            aria-label="Adjuntar imagen o dibujo"
            title="Adjuntar imagen o dibujo"
            onClick={() => archivo.current?.click()}
            className="rounded-[10px] border border-line p-2.5 text-muted hover:bg-surface"
          >
            <ImagePlus size={18} aria-hidden />
          </button>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void enviar()
              }
            }}
            rows={2}
            placeholder="Describe el proyecto o la duda…"
            disabled={!listo}
            className="max-h-40 min-h-[46px] flex-1 resize-y rounded-[10px] border border-line px-3 py-2.5 text-sm text-navy outline-none placeholder:text-muted focus:border-blue focus:ring-3 focus:ring-blue/15 disabled:bg-surface"
          />
          <Boton
            variante="primario"
            disabled={!listo || pensando || (texto.trim() === '' && adjuntos.length === 0)}
            onClick={() => void enviar()}
          >
            <SendHorizonal size={16} aria-hidden />
            Enviar
          </Boton>
        </div>
      </Card>
    </div>
  )
}
