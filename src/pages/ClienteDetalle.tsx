import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Boton, Card, Chip, Etiqueta, Vacio } from '../components/ui'
import { useAuth } from '../lib/auth'
import { exportarDetalle } from '../lib/export'
import { cop, copCorto, fecha, iniciales } from '../lib/format'
import { calcularTotales } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { EstadoCotizacion } from '../lib/types'

const TONO = {
  Borrador: 'gris',
  Enviada: 'blue',
  Aceptada: 'ok',
  Rechazada: 'danger',
  Vencida: 'warn',
} as const

const FILTROS: (EstadoCotizacion | 'Todas')[] = ['Todas', 'Enviada', 'Aceptada', 'Vencida']

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cliente, cotizacionesDeCliente, crearBorrador, duplicar } = useDatos()
  const { puede } = useAuth()
  const [filtro, setFiltro] = useState<EstadoCotizacion | 'Todas'>('Todas')

  const actual = cliente(id ?? null)
  if (actual === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Vacio
          titulo="Cliente no encontrado"
          texto="Puede que lo hayas eliminado."
          accion={
            <Link to="/clientes">
              <Boton variante="primario">Ver clientes</Boton>
            </Link>
          }
        />
      </div>
    )
  }

  const cotizaciones = cotizacionesDeCliente(actual.id)
  const visibles = cotizaciones.filter((c) => filtro === 'Todas' || c.estado === filtro)
  const total = cotizaciones.reduce((acc, c) => acc + calcularTotales(c).total, 0)
  const aceptadas = cotizaciones.filter((c) => c.estado === 'Aceptada').length

  return (
    <div>
      <div className="bg-navy px-4 py-5 text-white lg:px-8">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-white/80 hover:text-white"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <div className="flex items-center gap-3">
            <Avatar texto={iniciales(actual.nombre)} size={46} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold">{actual.nombre}</h1>
              <p className="text-sm text-white/75">
                {actual.tipo} · {actual.telefono}
                {actual.documento !== undefined && actual.documento !== ''
                  ? ` · ${actual.documento}`
                  : ''}
              </p>
            </div>
          </div>
          {actual.obra !== undefined && actual.obra !== '' && (
            <p className="mt-2 text-sm text-white/75">Obra: {actual.obra}</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['Cotizaciones', String(cotizaciones.length)],
              ['Total cotizado', copCorto(total)],
              ['Aceptadas', String(aceptadas)],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-[10px] bg-white/10 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-white/70">
                  {etiqueta}
                </div>
                <div className="text-lg font-extrabold">{valor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Chip key={f} activo={f === filtro} onClick={() => setFiltro(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <Etiqueta className="mb-2">Historial de cotizaciones</Etiqueta>

        {visibles.length === 0 ? (
          <Vacio
            titulo="Sin cotizaciones en este filtro"
            texto="Crea una cotización nueva para este cliente."
          />
        ) : (
          <div className="space-y-3">
            {visibles.map((c) => {
              const totales = calcularTotales(c)
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-navy">
                          {c.numero === null ? 'Borrador' : `#${c.numero}`}
                        </span>
                        <Badge tono={TONO[c.estado]}>{c.estado}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {fecha(c.creada)} · {c.items.length} materiales
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold tabular-nums text-navy">
                        {cop(totales.total)}
                      </div>
                      <div className="text-[11px] text-muted">IVA {c.ivaPct} % incluido</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <Link to={`/pdf/${c.id}`}>
                      <Boton tamano="sm">Ver PDF</Boton>
                    </Link>
                    {puede('cotizaciones.exportar') && (
                      <Boton
                        tamano="sm"
                        onClick={() =>
                          exportarDetalle(
                            `cotizacion-${c.numero ?? 'borrador'}`,
                            c,
                            actual,
                          )
                        }
                      >
                        Excel
                      </Boton>
                    )}
                    {puede('cotizaciones.crear') && (
                      <Boton
                        tamano="sm"
                        onClick={() => {
                          duplicar(c.id)
                          navigate('/cotizacion')
                        }}
                      >
                        Duplicar
                      </Boton>
                    )}
                    <Link to={`/cotizacion/${c.id}`}>
                      <Boton tamano="sm" variante="primario">
                        Abrir
                      </Boton>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {puede('cotizaciones.crear') && (
          <Boton
            variante="primario"
            className="mt-5 w-full"
            onClick={() => {
              crearBorrador(actual.id)
              navigate('/')
            }}
          >
            + Nueva cotización para {actual.nombre.split(' ').slice(0, 2).join(' ')}
          </Boton>
        )}
      </div>
    </div>
  )
}
