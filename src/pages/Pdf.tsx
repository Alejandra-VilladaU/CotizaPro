import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Boton, Vacio } from '../components/ui'
import { UNIDAD_LABEL, cop, fecha } from '../lib/format'
import { calcularTotales, totalLinea, vence } from '../lib/quote'
import { useDatos } from '../lib/store'

export default function Pdf() {
  const { id } = useParams()
  const { cotizacion, cliente, datos } = useDatos()
  const actual = id === undefined ? undefined : cotizacion(id)

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
  const totales = calcularTotales(actual)

  return (
    <div className="min-h-full bg-surface py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[816px] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/cotizacion/${actual.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue">
          <ArrowLeft size={16} /> Volver a la cotización
        </Link>
        <Boton variante="primario" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir o guardar PDF
        </Boton>
      </div>

      <article className="print-sheet mx-auto w-[816px] max-w-full bg-white p-[46px] shadow-[0_10px_30px_rgba(4,36,76,0.12)]">
        <header className="flex items-start justify-between gap-8 border-b-[3px] border-navy pb-4">
          <div>
            <img src={datos.empresa.logoUrl} alt="CotizaPro" className="h-11 w-auto" />
            <div className="mt-3 text-[11px] leading-relaxed text-muted">
              <div className="text-[13px] font-bold text-navy">{empresa.nombre}</div>
              NIT {empresa.nit} · {empresa.direccion}
              <br />
              Tel. {empresa.telefono} · {empresa.email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Cotización
            </div>
            <div className="text-[30px] font-extrabold leading-none text-navy">
              {actual.numero === null ? 'Borrador' : `#${actual.numero}`}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-muted">
              Fecha de emisión: {fecha(actual.emitida ?? actual.creada)}
              <br />
              Válida hasta: {fecha(vence(actual))} ({actual.vigenciaDias} días)
              <br />
              Asesor: {actual.vendedor}
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-[8px] bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Cliente</div>
            <div className="mt-1 text-sm font-bold text-navy">{cli?.nombre ?? 'Sin cliente'}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted">
              {cli?.documento !== undefined && cli.documento !== '' && (
                <>
                  {cli.documento}
                  <br />
                </>
              )}
              {cli?.telefono ?? ''}
              {cli?.email !== undefined && cli.email !== '' && (
                <>
                  <br />
                  {cli.email}
                </>
              )}
              {cli?.obra !== undefined && cli.obra !== '' && (
                <>
                  <br />
                  Obra: {cli.obra}
                </>
              )}
            </div>
          </div>
          <div className="rounded-[8px] bg-blue-soft p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-blue">
              Condiciones
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-navy">{empresa.condiciones}</div>
          </div>
        </section>

        <table className="mt-5 w-full">
          <thead>
            <tr className="bg-navy text-left text-[10px] font-bold uppercase tracking-[0.06em] text-white">
              <th className="px-3 py-2.5">Ítem</th>
              <th className="px-3 py-2.5">Descripción</th>
              <th className="px-3 py-2.5 text-right">Cant.</th>
              <th className="px-3 py-2.5">Unidad</th>
              <th className="px-3 py-2.5 text-right">Precio unit.</th>
              <th className="px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {actual.items.map((item, i) => (
              <tr key={item.materialId} className="border-b border-line">
                <td className="px-3 py-2.5 text-[11px] text-muted">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="text-[12px] font-semibold text-navy">{item.nombre}</div>
                  <div className="text-[10px] text-muted">
                    {item.codigo}
                    {item.descuento > 0 ? ` · descuento ${item.descuento} %` : ''}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">{item.cantidad}</td>
                <td className="px-3 py-2.5 text-[11px] text-muted">{UNIDAD_LABEL[item.unidad]}</td>
                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums">
                  {cop(item.precioUnitario)}
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] font-bold tabular-nums">
                  {cop(totalLinea(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-5 flex justify-end">
          <dl className="w-[300px] text-[12px]">
            <div className="flex justify-between py-1">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{cop(totales.subtotal)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted">Descuento ({actual.descuentoGlobal} %)</dt>
              <dd className="font-semibold tabular-nums">− {cop(totales.descuentoGlobal)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted">Base gravable</dt>
              <dd className="font-semibold tabular-nums">{cop(totales.base)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted">IVA {actual.ivaPct} %</dt>
              <dd className="font-semibold tabular-nums">{cop(totales.iva)}</dd>
            </div>
            <div className="mt-2 flex items-end justify-between border-t-2 border-navy pt-2">
              <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                Total a pagar
              </dt>
              <dd className="text-[26px] font-extrabold leading-none tabular-nums text-navy">
                {cop(totales.total)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Notas</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {actual.notas !== '' ? `${actual.notas} ` : ''}
            {empresa.notas}
          </p>
        </section>

        <footer className="mt-8 flex items-end justify-between gap-8 border-t border-line pt-6">
          <div className="w-64">
            <div className="border-t border-navy pt-1.5 text-[10px] text-muted">
              Firma de aceptación del cliente
            </div>
          </div>
          <div className="text-right">
            <img src={datos.empresa.logoUrl} alt="CotizaPro" className="ml-auto h-8 w-auto" />
            <div className="mt-1 text-[10px] text-muted">
              Cotización generada con CotizaPro · Página 1 de 1
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
