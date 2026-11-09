import { Fragment } from 'react'
import { UNIDAD_LABEL, cop, fecha } from '../lib/format'
import {
  calcularTotales,
  porCapitulo,
  referencia,
  resumenDeAsesoria,
  textoPlano,
  totalLinea,
  vence,
} from '../lib/quote'
import type { Cliente, Cotizacion, Empresa, Material } from '../lib/types'

// En pantallas angostas la cantidad, la unidad y el precio unitario se muestran bajo la
// descripción; al imprimir siempre se usa la tabla completa.
const SOLO_ANCHO = 'hidden sm:table-cell print:table-cell'

/** Hoja imprimible de la cotización: la usan la vista interna y el enlace público del cliente. */
export default function HojaCotizacion({
  cotizacion: actual,
  cliente: cli,
  empresa,
  materiales,
}: {
  cotizacion: Cotizacion
  cliente: Cliente | undefined
  empresa: Empresa
  materiales: Material[]
}) {
  const totales = calcularTotales(actual)
  const capitulos = porCapitulo(actual, materiales)
  const proyecto = actual.proyecto ?? null
  const conProyecto =
    proyecto !== null && (proyecto.descripcion.trim() !== '' || proyecto.responsable.trim() !== '')
  let numeroItem = 0

  return (
    <article className="print-sheet mx-auto w-[816px] max-w-full bg-white p-4 shadow-[0_10px_30px_rgba(4,36,76,0.12)] sm:p-[46px] print:p-[46px]">
      <header className="flex flex-col items-start justify-between gap-4 border-b-[3px] sm:flex-row sm:gap-8 print:flex-row print:gap-8 border-navy pb-4">
        <div>
          <img src={empresa.logoUrl} alt="CotizaPro" className="h-11 w-auto" />
          <div className="mt-3 text-[11px] leading-relaxed text-muted">
            <div className="text-[13px] font-bold text-navy">{empresa.nombre}</div>
            NIT {empresa.nit} · {empresa.direccion}
            <br />
            Tel. {empresa.telefono} · {empresa.email}
          </div>
        </div>
        <div className="sm:text-right print:text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            Cotización
          </div>
          <div className="text-[30px] font-extrabold leading-none text-navy">
            {referencia(actual)}
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

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
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

      {conProyecto && (
        <section className="mt-4 rounded-[8px] border border-line p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            Proyecto
          </div>
          {proyecto.descripcion.trim() !== '' && (
            <p className="mt-1 whitespace-pre-wrap text-[12px] font-semibold leading-relaxed text-navy">
              {proyecto.descripcion}
            </p>
          )}
          <div className="mt-1 text-[11px] text-muted">
            Cliente: {cli?.nombre ?? 'Sin cliente'}
            {proyecto.responsable.trim() !== '' && ` · Responsable: ${proyecto.responsable}`}
            {` · Asesor: ${actual.vendedor}`}
          </div>
        </section>
      )}

      <table className="mt-5 w-full table-fixed sm:table-auto print:table-auto">
        <thead>
          <tr className="bg-navy text-left text-[10px] font-bold uppercase tracking-[0.06em] text-white">
            <th className="w-8 px-2 py-2.5 sm:w-auto sm:px-3 print:w-auto print:px-3">Ítem</th>
            <th className="px-2 py-2.5 sm:px-3 print:px-3">Descripción</th>
            <th className={`${SOLO_ANCHO} px-3 py-2.5 text-right`}>Cant.</th>
            <th className={`${SOLO_ANCHO} px-3 py-2.5`}>Unidad</th>
            <th className={`${SOLO_ANCHO} px-3 py-2.5 text-right`}>Precio unit.</th>
            <th className="w-[104px] px-2 py-2.5 text-right sm:w-auto sm:px-3 print:w-auto print:px-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {capitulos.map((cap) => (
            <Fragment key={cap.nombre}>
              <tr className="border-b border-line bg-surface">
                {[2, 5].map((columnas) => (
                  <td
                    key={columnas}
                    colSpan={columnas}
                    className={`${columnas === 2 ? 'sm:hidden print:hidden' : SOLO_ANCHO} px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.05em] text-navy sm:px-3 print:px-3`}
                  >
                    {cap.nombre}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-2 text-right text-[11px] font-extrabold sm:px-3 print:px-3 tabular-nums text-navy">
                  {cop(cap.subtotal)}
                </td>
              </tr>
          {cap.items.map((item) => (
            <tr key={item.materialId} className="border-b border-line">
              <td className="px-2 py-2.5 align-top text-[11px] text-muted sm:px-3 print:px-3">{(numeroItem += 1)}</td>
              <td className="break-words px-2 py-2.5 sm:px-3 print:px-3">
                <div className="text-[12px] font-semibold text-navy">{item.nombre}</div>
                <div className="text-[11px] tabular-nums text-navy sm:hidden print:hidden">
                  {item.cantidad} {UNIDAD_LABEL[item.unidad]} × {cop(item.precioUnitario)}
                </div>
                <div className="text-[10px] text-muted">
                  {item.codigo}
                  {item.descuento > 0 ? ` · descuento ${item.descuento} %` : ''}
                </div>
                {(() => {
                  const detalle = materiales.find((m) => m.id === item.materialId)?.descripcion ?? ''
                  return detalle === '' ? null : (
                    <div className="text-[10px] leading-snug text-muted">{detalle}</div>
                  )
                })()}
              </td>
              <td className={`${SOLO_ANCHO} px-3 py-2.5 text-right text-[12px] tabular-nums`}>{item.cantidad}</td>
              <td className={`${SOLO_ANCHO} px-3 py-2.5 text-[11px] text-muted`}>{UNIDAD_LABEL[item.unidad]}</td>
              <td className={`${SOLO_ANCHO} px-3 py-2.5 text-right text-[12px] tabular-nums`}>
                {cop(item.precioUnitario)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right align-top text-[12px] font-bold tabular-nums sm:px-3 print:px-3">
                {cop(totalLinea(item))}
              </td>
            </tr>
          ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <section className="mt-5 flex justify-end">
        <dl className="w-full text-[12px] sm:w-[300px] print:w-[300px]">
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
            <dd className="text-[22px] font-extrabold sm:text-[26px] print:text-[26px] leading-none tabular-nums text-navy">
              {cop(totales.total)}
            </dd>
          </div>
        </dl>
      </section>

      {actual.pago != null && (
        <section className="mt-5 rounded-[8px] bg-ok-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ok">
            Pago recibido
          </div>
          <div className="mt-1 text-[11px] leading-relaxed text-navy">
            {cop(actual.pago.monto)} · {actual.pago.metodo} · {fecha(actual.pago.fecha)}
            {actual.pago.referencia === '' ? '' : ` · Ref. ${actual.pago.referencia}`}
            <br />
            Registrado por {actual.pago.registradoPor}
            {actual.pago.notas === '' ? '' : ` · ${actual.pago.notas}`}
          </div>
        </section>
      )}

      {actual.asesoria != null && actual.asesoria.respuesta.trim() !== '' && (
        <section className="mt-6 rounded-[8px] bg-blue-soft p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-blue">
            Asesoría del proyecto
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[11px] font-semibold leading-relaxed text-navy">
            {resumenDeAsesoria(actual.asesoria)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-navy">
            {textoPlano(actual.asesoria.respuesta)}
          </p>
          <p className="mt-2 text-[10px] text-muted">
            Recomendación de referencia elaborada con el Asesor de proyectos de CotizaPro. Medidas
            y cantidades deben verificarse en obra.
          </p>
        </section>
      )}

      <section className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Notas</div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {actual.notas !== '' ? `${actual.notas} ` : ''}
          {empresa.notas}
        </p>
      </section>

      <footer className="mt-8 flex items-end justify-between gap-4 sm:gap-8 border-t border-line pt-6">
        <div className="w-40 sm:w-64 print:w-64">
          <div className="border-t border-navy pt-1.5 text-[10px] text-muted">
            Firma de aceptación del cliente
          </div>
        </div>
        <div className="text-right">
          <img src={empresa.logoUrl} alt="CotizaPro" className="ml-auto h-8 w-auto" />
          <div className="mt-1 text-[10px] text-muted">
            Cotización generada con CotizaPro
          </div>
        </div>
      </footer>
    </article>
  )
}
