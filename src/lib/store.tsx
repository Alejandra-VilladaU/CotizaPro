import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import { estaVencida, itemDesdeMaterial } from './quote'
import { CLIENTES_SEED, COTIZACIONES_SEED, EMPRESA_SEED, MATERIALES_SEED } from './seed'
import type { Cliente, Cotizacion, Empresa, Material } from './types'

const CLAVE = 'cotizapro.v1'

type Datos = {
  materiales: Material[]
  clientes: Cliente[]
  cotizaciones: Cotizacion[]
  empresa: Empresa
  borradorId: string | null
}

const datosIniciales = (): Datos => ({
  materiales: MATERIALES_SEED,
  clientes: CLIENTES_SEED,
  cotizaciones: COTIZACIONES_SEED,
  empresa: EMPRESA_SEED,
  borradorId: null,
})

// Las cotizaciones enviadas que pasaron su vigencia quedan vencidas.
const marcarVencidas = (datos: Datos): Datos => ({
  ...datos,
  cotizaciones: datos.cotizaciones.map((c) =>
    estaVencida(c) ? { ...c, estado: 'Vencida' as const } : c,
  ),
})

function leer(): Datos {
  if (typeof localStorage === 'undefined') return marcarVencidas(datosIniciales())
  const crudo = localStorage.getItem(CLAVE)
  if (crudo === null) return marcarVencidas(datosIniciales())
  try {
    const guardado = JSON.parse(crudo) as Partial<Datos>
    const base = datosIniciales()
    return marcarVencidas({
      materiales: guardado.materiales ?? base.materiales,
      clientes: guardado.clientes ?? base.clientes,
      cotizaciones: guardado.cotizaciones ?? base.cotizaciones,
      empresa: { ...base.empresa, ...guardado.empresa },
      borradorId: guardado.borradorId ?? null,
    })
  } catch {
    return marcarVencidas(datosIniciales())
  }
}

const nuevoId = (prefijo: string): string =>
  `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

type Contexto = {
  datos: Datos
  materialesActivos: Material[]
  borrador: Cotizacion | null
  cotizacion: (id: string) => Cotizacion | undefined
  cliente: (id: string | null) => Cliente | undefined
  material: (id: string) => Material | undefined
  cotizacionesDeCliente: (clienteId: string) => Cotizacion[]
  /** Cotizaciones y clientes que el usuario en sesión tiene permitido ver. */
  cotizacionesVisibles: Cotizacion[]
  clientesVisibles: Cliente[]
  esPropia: (c: Cotizacion) => boolean
  puedeEditar: (c: Cotizacion) => boolean
  autorizarEdicion: (id: string) => void

  crearBorrador: (clienteId?: string | null) => Cotizacion
  asegurarBorrador: () => Cotizacion
  actualizarCotizacion: (id: string, cambios: Partial<Cotizacion>) => void
  agregarMaterial: (materialId: string, cantidad: number) => void
  cambiarCantidad: (cotizacionId: string, materialId: string, cantidad: number) => void
  cambiarPrecio: (cotizacionId: string, materialId: string, precio: number) => void
  cambiarDescuentoLinea: (cotizacionId: string, materialId: string, descuento: number) => void
  quitarItem: (cotizacionId: string, materialId: string) => void
  sincronizarPrecios: (cotizacionId: string) => void
  generarCotizacion: (id: string) => number
  cambiarEstado: (id: string, estado: Cotizacion['estado']) => void
  duplicar: (id: string) => string
  eliminarCotizacion: (id: string) => void
  abrirBorrador: (id: string) => void

  crearCliente: (cliente: Omit<Cliente, 'id' | 'creado'>) => Cliente
  actualizarCliente: (id: string, cambios: Partial<Cliente>) => void
  eliminarCliente: (id: string) => void

  guardarMaterial: (material: Omit<Material, 'id' | 'actualizado'> & { id?: string }) => void
  eliminarMaterial: (id: string) => void
  importarMateriales: (csv: string) => { creados: number; actualizados: number; errores: string[] }

  guardarEmpresa: (cambios: Partial<Empresa>) => void
  restablecerDemo: () => void
}

const Ctx = createContext<Contexto | null>(null)

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(leer)
  const { usuario, verTodo } = useAuth()

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  }, [datos])

  const mapear = useCallback(
    (id: string, fn: (c: Cotizacion) => Cotizacion) =>
      setDatos((d) => ({
        ...d,
        cotizaciones: d.cotizaciones.map((c) =>
          c.id === id ? { ...fn(c), actualizada: new Date().toISOString() } : c,
        ),
      })),
    [],
  )

  const valor = useMemo<Contexto>(() => {
    const cotizacion = (id: string) => datos.cotizaciones.find((c) => c.id === id)
    const borradorGuardado =
      datos.borradorId === null ? null : (cotizacion(datos.borradorId) ?? null)
    const esPropia = (c: Cotizacion) =>
      usuario !== null && (c.vendedorUid ?? null) === usuario.uid
    // El borrador solo pertenece a quien lo abrió: al cambiar de usuario se descarta.
    const borrador =
      borradorGuardado !== null && (verTodo || esPropia(borradorGuardado))
        ? borradorGuardado
        : null

    const crearBorrador = (clienteId: string | null = null): Cotizacion => {
      const ahora = new Date().toISOString()
      const nueva: Cotizacion = {
        id: nuevoId('Q'),
        numero: null,
        clienteId,
        items: [],
        descuentoGlobal: 0,
        ivaPct: datos.empresa.ivaPct,
        vigenciaDias: datos.empresa.vigenciaDias,
        notas: '',
        estado: 'Borrador',
        vendedor: usuario?.nombre ?? datos.empresa.vendedor,
        vendedorUid: usuario?.uid ?? null,
        autorizacionEdicion: null,
        creada: ahora,
        emitida: null,
        actualizada: ahora,
      }
      setDatos((d) => ({
        ...d,
        cotizaciones: [nueva, ...d.cotizaciones],
        borradorId: nueva.id,
      }))
      return nueva
    }

    const asegurarBorrador = (): Cotizacion => {
      if (borrador !== null && borrador.estado === 'Borrador') return borrador
      return crearBorrador()
    }

    return {
      datos,
      materialesActivos: datos.materiales.filter((m) => m.activo),
      borrador: borrador !== null && borrador.estado === 'Borrador' ? borrador : null,
      cotizacion,
      cliente: (id) => (id === null ? undefined : datos.clientes.find((c) => c.id === id)),
      material: (id) => datos.materiales.find((m) => m.id === id),
      cotizacionesDeCliente: (clienteId) =>
        datos.cotizaciones
          .filter((c) => c.clienteId === clienteId && (verTodo || esPropia(c)))
          .sort((a, b) => b.creada.localeCompare(a.creada)),

      cotizacionesVisibles: datos.cotizaciones.filter((c) => verTodo || esPropia(c)),
      clientesVisibles: verTodo
        ? datos.clientes
        : datos.clientes.filter(
            (cl) =>
              (cl.creadoPor ?? null) === (usuario?.uid ?? null) ||
              datos.cotizaciones.some((c) => c.clienteId === cl.id && esPropia(c)),
          ),
      esPropia,
      // El administrador no edita cotizaciones ajenas sin registrar autorización explícita.
      puedeEditar: (c) =>
        usuario !== null &&
        (esPropia(c) ||
          (usuario.rol === 'Administrador' &&
            c.autorizacionEdicion !== null &&
            c.autorizacionEdicion !== undefined)),
      autorizarEdicion: (id) =>
        mapear(id, (c) => ({
          ...c,
          autorizacionEdicion:
            usuario === null
              ? null
              : { por: usuario.nombre, uid: usuario.uid, fecha: new Date().toISOString() },
        })),

      crearBorrador,
      asegurarBorrador,
      actualizarCotizacion: (id, cambios) => mapear(id, (c) => ({ ...c, ...cambios })),

      agregarMaterial: (materialId, cantidad) => {
        const material = datos.materiales.find((m) => m.id === materialId)
        if (material === undefined || cantidad <= 0) return
        const destino = asegurarBorrador()
        mapear(destino.id, (c) => {
          const existente = c.items.find((i) => i.materialId === materialId)
          if (existente !== undefined) {
            return {
              ...c,
              items: c.items.map((i) =>
                i.materialId === materialId ? { ...i, cantidad: i.cantidad + cantidad } : i,
              ),
            }
          }
          return { ...c, items: [...c.items, itemDesdeMaterial(material, cantidad)] }
        })
      },

      cambiarCantidad: (cotizacionId, materialId, cantidad) =>
        mapear(cotizacionId, (c) => ({
          ...c,
          items:
            cantidad <= 0
              ? c.items.filter((i) => i.materialId !== materialId)
              : c.items.map((i) => (i.materialId === materialId ? { ...i, cantidad } : i)),
        })),

      cambiarPrecio: (cotizacionId, materialId, precio) =>
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) =>
            i.materialId === materialId ? { ...i, precioUnitario: Math.max(0, precio) } : i,
          ),
        })),

      cambiarDescuentoLinea: (cotizacionId, materialId, descuento) =>
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) =>
            i.materialId === materialId
              ? { ...i, descuento: Math.min(100, Math.max(0, descuento)) }
              : i,
          ),
        })),

      quitarItem: (cotizacionId, materialId) =>
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.filter((i) => i.materialId !== materialId),
        })),

      sincronizarPrecios: (cotizacionId) =>
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) => {
            const material = datos.materiales.find((m) => m.id === i.materialId)
            if (material === undefined) return i
            return { ...i, precioUnitario: material.precio, precioLista: material.precio }
          }),
        })),

      generarCotizacion: (id) => {
        const maximo = datos.cotizaciones.reduce((acc, c) => Math.max(acc, c.numero ?? 0), 1000)
        const numero = maximo + 1
        const ahora = new Date().toISOString()
        setDatos((d) => ({
          ...d,
          cotizaciones: d.cotizaciones.map((c) =>
            c.id === id
              ? {
                  ...c,
                  numero: c.numero ?? numero,
                  estado: 'Enviada',
                  emitida: c.emitida ?? ahora,
                  actualizada: ahora,
                }
              : c,
          ),
          borradorId: d.borradorId === id ? null : d.borradorId,
        }))
        return numero
      },

      cambiarEstado: (id, estado) => mapear(id, (c) => ({ ...c, estado })),

      duplicar: (id) => {
        const origen = cotizacion(id)
        if (origen === undefined) return id
        const ahora = new Date().toISOString()
        const copia: Cotizacion = {
          ...origen,
          id: nuevoId('Q'),
          numero: null,
          estado: 'Borrador',
          creada: ahora,
          emitida: null,
          actualizada: ahora,
          items: origen.items.map((i) => ({ ...i })),
        }
        setDatos((d) => ({
          ...d,
          cotizaciones: [copia, ...d.cotizaciones],
          borradorId: copia.id,
        }))
        return copia.id
      },

      eliminarCotizacion: (id) =>
        setDatos((d) => ({
          ...d,
          cotizaciones: d.cotizaciones.filter((c) => c.id !== id),
          borradorId: d.borradorId === id ? null : d.borradorId,
        })),

      abrirBorrador: (id) => setDatos((d) => ({ ...d, borradorId: id })),

      crearCliente: (cliente) => {
        const nuevo: Cliente = {
          ...cliente,
          id: nuevoId('C'),
          creado: new Date().toISOString(),
          creadoPor: usuario?.uid ?? null,
        }
        setDatos((d) => ({ ...d, clientes: [...d.clientes, nuevo] }))
        return nuevo
      },

      actualizarCliente: (id, cambios) =>
        setDatos((d) => ({
          ...d,
          clientes: d.clientes.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
        })),

      eliminarCliente: (id) =>
        setDatos((d) => ({
          ...d,
          clientes: d.clientes.filter((c) => c.id !== id),
          cotizaciones: d.cotizaciones.map((c) =>
            c.clienteId === id ? { ...c, clienteId: null } : c,
          ),
        })),

      guardarMaterial: (material) => {
        const ahora = new Date().toISOString()
        setDatos((d) => {
          if (material.id !== undefined && d.materiales.some((m) => m.id === material.id)) {
            return {
              ...d,
              materiales: d.materiales.map((m) =>
                m.id === material.id ? { ...m, ...material, actualizado: ahora } : m,
              ),
            }
          }
          return {
            ...d,
            materiales: [
              ...d.materiales,
              { ...material, id: material.id ?? nuevoId('M'), actualizado: ahora },
            ],
          }
        })
      },

      eliminarMaterial: (id) =>
        setDatos((d) => ({ ...d, materiales: d.materiales.filter((m) => m.id !== id) })),

      importarMateriales: (csv) => {
        const errores: string[] = []
        let creados = 0
        let actualizados = 0
        const filas = csv
          .split(/\r?\n/)
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
        if (filas.length === 0) return { creados, actualizados, errores: ['El archivo está vacío.'] }
        const separador = (filas[0].match(/;/g) ?? []).length > (filas[0].match(/,/g) ?? []).length
          ? ';'
          : ','
        const encabezado = filas[0].toLowerCase()
        const inicio = encabezado.includes('codigo') || encabezado.includes('código') ? 1 : 0
        const nuevos: Material[] = []
        const cambios = new Map<string, Partial<Material>>()

        filas.slice(inicio).forEach((fila, indice) => {
          const celdas = fila.split(separador).map((c) => c.trim().replace(/^"|"$/g, ''))
          const [codigo, nombre, categoria, unidad, precio, stock, stockMinimo] = celdas
          if (codigo === undefined || nombre === undefined || precio === undefined) {
            errores.push(`Fila ${indice + inicio + 1}: faltan columnas obligatorias.`)
            return
          }
          const precioNum = Number(precio.replace(/[^\d]/g, ''))
          if (Number.isNaN(precioNum) || precioNum <= 0) {
            errores.push(`Fila ${indice + inicio + 1}: precio inválido (${precio}).`)
            return
          }
          const existente = datos.materiales.find((m) => m.codigo === codigo)
          const base = {
            codigo,
            nombre,
            categoria: categoria === undefined || categoria === '' ? 'Sin categoría' : categoria,
            unidad: (unidad ?? 'unidad') as Material['unidad'],
            precio: precioNum,
            stock: Number(stock ?? 0) || 0,
            stockMinimo: Number(stockMinimo ?? 0) || 0,
            activo: true,
            actualizado: new Date().toISOString(),
          }
          if (existente === undefined) {
            nuevos.push({ ...base, id: nuevoId('M') })
            creados += 1
          } else {
            cambios.set(existente.id, base)
            actualizados += 1
          }
        })

        setDatos((d) => ({
          ...d,
          materiales: [
            ...d.materiales.map((m) => {
              const cambio = cambios.get(m.id)
              return cambio === undefined ? m : { ...m, ...cambio }
            }),
            ...nuevos,
          ],
        }))
        return { creados, actualizados, errores }
      },

      guardarEmpresa: (cambios) =>
        setDatos((d) => ({ ...d, empresa: { ...d.empresa, ...cambios } })),

      restablecerDemo: () => setDatos(datosIniciales()),
    }
  }, [datos, mapear, usuario, verTodo])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useDatos(): Contexto {
  const ctx = useContext(Ctx)
  if (ctx === null) throw new Error('useDatos debe usarse dentro de <ProveedorDatos>')
  return ctx
}
