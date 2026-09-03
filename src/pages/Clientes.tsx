import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Boton, Buscador, Campo, Card, Etiqueta, Modal, Vacio } from '../components/ui'
import { copCorto, iniciales } from '../lib/format'
import { calcularTotales } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { TipoCliente } from '../lib/types'

export default function Clientes() {
  const { datos, cotizacionesDeCliente, crearCliente } = useDatos()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [abrir, setAbrir] = useState(false)
  const [nuevo, setNuevo] = useState({
    nombre: '',
    telefono: '',
    tipo: 'Particular' as TipoCliente,
    documento: '',
    email: '',
    obra: '',
  })

  const q = texto.trim().toLowerCase()
  const lista = datos.clientes.filter((c) =>
    `${c.nombre} ${c.telefono} ${c.tipo} ${c.obra ?? ''}`.toLowerCase().includes(q),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Clientes</h1>
          <p className="mt-0.5 text-sm text-muted">
            {datos.clientes.length} clientes con historial de cotizaciones
          </p>
        </div>
        <Boton variante="primario" onClick={() => setAbrir(true)}>
          + Nuevo cliente
        </Boton>
      </div>

      <Buscador valor={texto} onCambio={setTexto} placeholder="Buscar cliente por nombre, teléfono u obra…" />

      {lista.length === 0 ? (
        <div className="mt-4">
          <Vacio titulo="Sin clientes" texto="Crea el primer cliente para empezar a guardar su historial." />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => {
            const cotizaciones = cotizacionesDeCliente(c.id)
            const total = cotizaciones.reduce((acc, x) => acc + calcularTotales(x).total, 0)
            const aceptadas = cotizaciones.filter((x) => x.estado === 'Aceptada').length
            return (
              <Link key={c.id} to={`/clientes/${c.id}`} className="block">
                <Card className="h-full p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar texto={iniciales(c.nombre)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-navy">{c.nombre}</div>
                      <div className="text-xs text-muted">
                        {c.tipo} · {c.telefono}
                      </div>
                    </div>
                  </div>
                  {c.obra !== undefined && c.obra !== '' && (
                    <p className="mt-2 truncate text-xs text-muted">Obra: {c.obra}</p>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    <div>
                      <Etiqueta>Cotiz.</Etiqueta>
                      <div className="text-base font-extrabold text-navy">{cotizaciones.length}</div>
                    </div>
                    <div>
                      <Etiqueta>Total</Etiqueta>
                      <div className="text-base font-extrabold text-navy">{copCorto(total)}</div>
                    </div>
                    <div>
                      <Etiqueta>Aceptadas</Etiqueta>
                      <div className="text-base font-extrabold text-ok">{aceptadas}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {abrir && (
        <Modal titulo="Nuevo cliente" onCerrar={() => setAbrir(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre"
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Ej. Constructora Aldea S.A.S."
            />
            <Campo
              etiqueta="Teléfono"
              value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
              placeholder="604 322 1188"
            />
            <label className="block">
              <Etiqueta className="mb-1">Tipo</Etiqueta>
              <select
                value={nuevo.tipo}
                onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoCliente })}
                className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option value="Particular">Particular</option>
                <option value="Contratista">Contratista</option>
                <option value="Empresa">Empresa</option>
              </select>
            </label>
            <Campo
              etiqueta="Documento / NIT"
              value={nuevo.documento}
              onChange={(e) => setNuevo({ ...nuevo, documento: e.target.value })}
            />
            <Campo
              etiqueta="Correo"
              type="email"
              value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
            />
            <Campo
              etiqueta="Obra"
              value={nuevo.obra}
              onChange={(e) => setNuevo({ ...nuevo, obra: e.target.value })}
            />
          </div>
          <Boton
            variante="primario"
            className="mt-4 w-full"
            disabled={nuevo.nombre.trim() === '' || nuevo.telefono.trim() === ''}
            onClick={() => {
              const creado = crearCliente(nuevo)
              setAbrir(false)
              navigate(`/clientes/${creado.id}`)
            }}
          >
            Guardar cliente
          </Boton>
        </Modal>
      )}
    </div>
  )
}
