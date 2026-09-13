import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import { backendLocalDatos, type BackendDatos, type Datos } from './datosApi'
import { backendFirestore } from './datosFirestore'
import { firebaseHabilitado } from './firebase'
import { estaVencida, itemDesdeMaterial } from './quote'
import { CLIENTES_SEED, COTIZACIONES_SEED, EMPRESA_SEED, MATERIALES_SEED } from './seed'
import type { Cliente, Cotizacion, Empresa, Material } from './types'

const CLAVE = 'cotizapro.v1'
const CLAVE_BORRADOR = 'cotizapro.borrador'

const datosDemo = (): Datos => ({
  materiales: MATERIALES_SEED,
  clientes: CLIENTES_SEED,
  cotizaciones: COTIZACIONES_SEED,
  empresa: EMPRESA_SEED,
  borradorId: null,
})

/** Con Firebase los datos llegan por snapshot: se arranca vacío para no mezclar el demo. */
const datosVacios = (): Datos => ({
  materiales: [],
  clientes: [],
  cotizaciones: [],
  empresa: EMPRESA_SEED,
  borradorId: null,
})

// Las cotizaciones enviadas que pasaron su vigencia se muestran como vencidas.
const marcarVencidas = (datos: Datos): Datos => ({
  ...datos,
  cotizaciones: datos.cotizaciones.map((c) =>
    estaVencida(c) ? { ...c, estado: 'Vencida' as const } : c,
  ),
})

const borradorLocal = (): string | null => {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(CLAVE_BORRADOR)
}

function leerLocal(): Datos {
  if (typeof localStorage === 'undefined') return marcarVencidas(datosDemo())
  const crudo = localStorage.getItem(CLAVE)
  if (crudo === null) return marcarVencidas(datosDemo())
  try {
    const guardado = JSON.parse(crudo) as Partial<Datos>
    const base = datosDemo()
    return marcarVencidas({
      materiales: guardado.materiales ?? base.materiales,
      clientes: guardado.clientes ?? base.clientes,
      cotizaciones: guardado.cotizaciones ?? base.cotizaciones,
      empresa: { ...base.empresa, ...guardado.empresa },
      borradorId: guardado.borradorId ?? null,
    })
  } catch {
    return marcarVencidas(datosDemo())
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

  /** true cuando inventario, clientes y cotizaciones viven en Firestore. */
  enLaNube: boolean
  cargando: boolean
  errorNube: string | null
  /** Sube el catálogo y los clientes de ejemplo a Firestore (solo administrador). */
  sembrarDemo: () => Promise<void>
  /** Migra a Firestore los datos que quedaron en este navegador. */
  subirDatosLocales: () => Promise<{ materiales: number; clientes: number; cotizaciones: number }>

  crearBorrador: (clienteId?: string | null) => Cotizacion
  asegurarBorrador: () => Cotizacion
  actualizarCotizacion: (id: string, cambios: Partial<Cotizacion>) => void
  agregarMaterial: (materialId: string, cantidad: number) => void
  cambiarCantidad: (cotizacionId: string, materialId: string, cantidad: number) => void
  cambiarPrecio: (cotizacionId: string, materialId: string, precio: number) => void
  cambiarDescuentoLinea: (cotizacionId: string, materialId: string, descuento: number) => void
  quitarItem: (cotizacionId: string, materialId: string) => void
  sincronizarPrecios: (cotizacionId: string) => void
  generarCotizacion: (id: string) => Promise<number>
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
  const { usuario, verTodo } = useAuth()
  const enLaNube = firebaseHabilitado && usuario !== null

  const [datos, setDatos] = useState<Datos>(() =>
    firebaseHabilitado ? datosVacios() : leerLocal(),
  )
  const [cargando, setCargando] = useState(enLaNube)
  const [errorNube, setErrorNube] = useState<string | null>(null)
  const ref = useRef<Datos>(datos)

  const backend = useMemo<BackendDatos>(
    () => (enLaNube && usuario !== null ? backendFirestore(usuario) : backendLocalDatos()),
    [enLaNube, usuario],
  )

  // Toda mutación pasa por aquí: actualiza la copia en memoria y dispara la escritura remota.
  const aplicar = (fn: (d: Datos) => Datos): Datos => {
    ref.current = fn(ref.current)
    setDatos(ref.current)
    return ref.current
  }

  const remoto = (promesa: Promise<void>) => {
    void promesa.catch((error: unknown) => {
      setErrorNube(
        error instanceof Error ? error.message : 'No fue posible guardar los datos en Firebase.',
      )
    })
  }

  useEffect(() => {
    if (!enLaNube) {
      ref.current = leerLocal()
      setDatos(ref.current)
      setCargando(false)
      return
    }
    ref.current = { ...datosVacios(), borradorId: borradorLocal() }
    setDatos(ref.current)
    setCargando(true)
    const dejar = backend.suscribir(
      (parcial) => {
        ref.current = marcarVencidas({ ...ref.current, ...parcial })
        setDatos(ref.current)
        setCargando(false)
        setErrorNube(null)
      },
      (mensaje) => {
        setErrorNube(mensaje)
        setCargando(false)
      },
    )
    return dejar
  }, [backend, enLaNube])

  // El administrador ve todas las cotizaciones: aprovecha para alinear el contador
  // compartido con los números que ya existían antes de crearlo.
  useEffect(() => {
    if (!enLaNube || !verTodo || cargando) return
    const maximo = datos.cotizaciones.reduce((acc, c) => Math.max(acc, c.numero ?? 0), 0)
    if (maximo === 0) return
    void backend.sincronizarConsecutivo(maximo).catch(() => undefined)
  }, [backend, enLaNube, verTodo, cargando, datos.cotizaciones])

  // En modo demo la persistencia sigue siendo el navegador.
  useEffect(() => {
    if (enLaNube) return
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  }, [datos, enLaNube])

  useEffect(() => {
    if (datos.borradorId === null) localStorage.removeItem(CLAVE_BORRADOR)
    else localStorage.setItem(CLAVE_BORRADOR, datos.borradorId)
  }, [datos.borradorId])

  const valor = useMemo<Contexto>(() => {
    const cotizacion = (id: string) => ref.current.cotizaciones.find((c) => c.id === id)
    const borradorGuardado =
      datos.borradorId === null ? null : (cotizacion(datos.borradorId) ?? null)
    const esPropia = (c: Cotizacion) => usuario !== null && (c.vendedorUid ?? null) === usuario.uid
    // El borrador solo pertenece a quien lo abrió: al cambiar de usuario se descarta.
    const borrador =
      borradorGuardado !== null && (verTodo || esPropia(borradorGuardado)) ? borradorGuardado : null

    const guardarCotizacion = (siguiente: Cotizacion) => {
      remoto(backend.guardarCotizacion(siguiente))
    }

    const mapear = (id: string, fn: (c: Cotizacion) => Cotizacion): Cotizacion | null => {
      const actual = ref.current.cotizaciones.find((c) => c.id === id)
      if (actual === undefined) return null
      const siguiente: Cotizacion = { ...fn(actual), actualizada: new Date().toISOString() }
      aplicar((d) => ({
        ...d,
        cotizaciones: d.cotizaciones.map((c) => (c.id === id ? siguiente : c)),
      }))
      guardarCotizacion(siguiente)
      return siguiente
    }

    const crearBorrador = (clienteId: string | null = null): Cotizacion => {
      const ahora = new Date().toISOString()
      const nueva: Cotizacion = {
        id: nuevoId('Q'),
        numero: null,
        clienteId,
        items: [],
        descuentoGlobal: 0,
        ivaPct: ref.current.empresa.ivaPct,
        vigenciaDias: ref.current.empresa.vigenciaDias,
        notas: '',
        estado: 'Borrador',
        vendedor: usuario?.nombre ?? ref.current.empresa.vendedor,
        vendedorUid: usuario?.uid ?? null,
        autorizacionEdicion: null,
        creada: ahora,
        emitida: null,
        actualizada: ahora,
      }
      aplicar((d) => ({
        ...d,
        cotizaciones: [nueva, ...d.cotizaciones],
        borradorId: nueva.id,
      }))
      guardarCotizacion(nueva)
      return nueva
    }

    const asegurarBorrador = (): Cotizacion => {
      const actual = ref.current.borradorId === null ? null : cotizacion(ref.current.borradorId)
      if (actual !== undefined && actual !== null && actual.estado === 'Borrador' && (verTodo || esPropia(actual)))
        return actual
      return crearBorrador()
    }

    const guardarClienteRemoto = (cliente: Cliente) => {
      remoto(backend.guardarCliente(cliente))
    }

    const guardarMaterialRemoto = (material: Material) => {
      remoto(backend.guardarMaterial(material))
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
      autorizarEdicion: (id) => {
        mapear(id, (c) => ({
          ...c,
          autorizacionEdicion:
            usuario === null
              ? null
              : { por: usuario.nombre, uid: usuario.uid, fecha: new Date().toISOString() },
        }))
      },

      enLaNube,
      cargando,
      errorNube,

      sembrarDemo: async () => {
        const demo = datosDemo()
        await backend.guardarMateriales(demo.materiales)
        for (const cliente of demo.clientes)
          await backend.guardarCliente({ ...cliente, creadoPor: usuario?.uid ?? null })
        await backend.guardarEmpresa(ref.current.empresa)
      },

      subirDatosLocales: async () => {
        const locales = leerLocal()
        const mios = locales.cotizaciones.map((c) => ({
          ...c,
          vendedorUid: c.vendedorUid ?? usuario?.uid ?? null,
          vendedor: c.vendedor === '' ? (usuario?.nombre ?? '') : c.vendedor,
        }))
        const clientes = locales.clientes.map((c) => ({
          ...c,
          creadoPor: c.creadoPor ?? usuario?.uid ?? null,
        }))
        await backend.guardarMateriales(locales.materiales)
        await backend.guardarCotizaciones(mios)
        for (const cliente of clientes) await backend.guardarCliente(cliente)
        return {
          materiales: locales.materiales.length,
          clientes: clientes.length,
          cotizaciones: mios.length,
        }
      },

      crearBorrador,
      asegurarBorrador,
      actualizarCotizacion: (id, cambios) => {
        mapear(id, (c) => ({ ...c, ...cambios }))
      },

      agregarMaterial: (materialId, cantidad) => {
        const material = ref.current.materiales.find((m) => m.id === materialId)
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

      cambiarCantidad: (cotizacionId, materialId, cantidad) => {
        mapear(cotizacionId, (c) => ({
          ...c,
          items:
            cantidad <= 0
              ? c.items.filter((i) => i.materialId !== materialId)
              : c.items.map((i) => (i.materialId === materialId ? { ...i, cantidad } : i)),
        }))
      },

      cambiarPrecio: (cotizacionId, materialId, precio) => {
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) =>
            i.materialId === materialId ? { ...i, precioUnitario: Math.max(0, precio) } : i,
          ),
        }))
      },

      cambiarDescuentoLinea: (cotizacionId, materialId, descuento) => {
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) =>
            i.materialId === materialId
              ? { ...i, descuento: Math.min(100, Math.max(0, descuento)) }
              : i,
          ),
        }))
      },

      quitarItem: (cotizacionId, materialId) => {
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.filter((i) => i.materialId !== materialId),
        }))
      },

      sincronizarPrecios: (cotizacionId) => {
        mapear(cotizacionId, (c) => ({
          ...c,
          items: c.items.map((i) => {
            const material = ref.current.materiales.find((m) => m.id === i.materialId)
            if (material === undefined) return i
            return { ...i, precioUnitario: material.precio, precioLista: material.precio }
          }),
        }))
      },

      generarCotizacion: async (id) => {
        const maximo = ref.current.cotizaciones.reduce((acc, c) => Math.max(acc, c.numero ?? 0), 0)
        // El consecutivo se reserva en Firestore: un vendedor no ve las cotizaciones de
        // los demás, así que el máximo local solo sirve de respaldo en modo demo.
        const reservado = await backend.siguienteNumero(maximo).catch(() => null)
        const numero = reservado ?? Math.max(maximo, 1000) + 1
        const ahora = new Date().toISOString()
        const siguiente = mapear(id, (c) => ({
          ...c,
          numero: c.numero ?? numero,
          estado: 'Enviada',
          emitida: c.emitida ?? ahora,
        }))
        aplicar((d) => ({ ...d, borradorId: d.borradorId === id ? null : d.borradorId }))
        return siguiente?.numero ?? numero
      },

      cambiarEstado: (id, estado) => {
        mapear(id, (c) => ({ ...c, estado }))
      },

      duplicar: (id) => {
        const origen = cotizacion(id)
        if (origen === undefined) return id
        const ahora = new Date().toISOString()
        const copia: Cotizacion = {
          ...origen,
          id: nuevoId('Q'),
          numero: null,
          estado: 'Borrador',
          vendedor: usuario?.nombre ?? origen.vendedor,
          vendedorUid: usuario?.uid ?? origen.vendedorUid ?? null,
          autorizacionEdicion: null,
          creada: ahora,
          emitida: null,
          actualizada: ahora,
          items: origen.items.map((i) => ({ ...i })),
        }
        aplicar((d) => ({
          ...d,
          cotizaciones: [copia, ...d.cotizaciones],
          borradorId: copia.id,
        }))
        guardarCotizacion(copia)
        return copia.id
      },

      eliminarCotizacion: (id) => {
        aplicar((d) => ({
          ...d,
          cotizaciones: d.cotizaciones.filter((c) => c.id !== id),
          borradorId: d.borradorId === id ? null : d.borradorId,
        }))
        remoto(backend.eliminarCotizacion(id))
      },

      abrirBorrador: (id) => {
        aplicar((d) => ({ ...d, borradorId: id }))
      },

      crearCliente: (cliente) => {
        const nuevo: Cliente = {
          ...cliente,
          id: nuevoId('C'),
          creado: new Date().toISOString(),
          creadoPor: usuario?.uid ?? null,
        }
        aplicar((d) => ({ ...d, clientes: [...d.clientes, nuevo] }))
        guardarClienteRemoto(nuevo)
        return nuevo
      },

      actualizarCliente: (id, cambios) => {
        const actual = ref.current.clientes.find((c) => c.id === id)
        if (actual === undefined) return
        const siguiente: Cliente = { ...actual, ...cambios }
        aplicar((d) => ({
          ...d,
          clientes: d.clientes.map((c) => (c.id === id ? siguiente : c)),
        }))
        guardarClienteRemoto(siguiente)
      },

      eliminarCliente: (id) => {
        const afectadas = ref.current.cotizaciones
          .filter((c) => c.clienteId === id)
          .map((c) => ({ ...c, clienteId: null, actualizada: new Date().toISOString() }))
        aplicar((d) => ({
          ...d,
          clientes: d.clientes.filter((c) => c.id !== id),
          cotizaciones: d.cotizaciones.map((c) => (c.clienteId === id ? { ...c, clienteId: null } : c)),
        }))
        remoto(backend.eliminarCliente(id))
        if (afectadas.length > 0) remoto(backend.guardarCotizaciones(afectadas))
      },

      guardarMaterial: (material) => {
        const ahora = new Date().toISOString()
        const existente =
          material.id === undefined
            ? undefined
            : ref.current.materiales.find((m) => m.id === material.id)
        const siguiente: Material = {
          ...(existente ?? {}),
          ...material,
          id: existente?.id ?? material.id ?? nuevoId('M'),
          actualizado: ahora,
        } as Material
        aplicar((d) => ({
          ...d,
          materiales:
            existente === undefined
              ? [...d.materiales, siguiente]
              : d.materiales.map((m) => (m.id === siguiente.id ? siguiente : m)),
        }))
        guardarMaterialRemoto(siguiente)
      },

      eliminarMaterial: (id) => {
        aplicar((d) => ({ ...d, materiales: d.materiales.filter((m) => m.id !== id) }))
        remoto(backend.eliminarMaterial(id))
      },

      importarMateriales: (csv) => {
        const errores: string[] = []
        let creados = 0
        let actualizados = 0
        const filas = csv
          .split(/\r?\n/)
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
        if (filas.length === 0) return { creados, actualizados, errores: ['El archivo está vacío.'] }
        const separador =
          (filas[0].match(/;/g) ?? []).length > (filas[0].match(/,/g) ?? []).length ? ';' : ','
        const encabezado = filas[0].toLowerCase()
        const inicio = encabezado.includes('codigo') || encabezado.includes('código') ? 1 : 0
        const guardados: Material[] = []

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
          const existente = ref.current.materiales.find((m) => m.codigo === codigo)
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
            guardados.push({ ...base, id: nuevoId('M') })
            creados += 1
          } else {
            guardados.push({ ...existente, ...base })
            actualizados += 1
          }
        })

        aplicar((d) => {
          const porId = new Map(guardados.map((m) => [m.id, m]))
          const existentes = d.materiales.map((m) => porId.get(m.id) ?? m)
          const ids = new Set(d.materiales.map((m) => m.id))
          return {
            ...d,
            materiales: [...existentes, ...guardados.filter((m) => !ids.has(m.id))],
          }
        })
        if (guardados.length > 0) remoto(backend.guardarMateriales(guardados))
        return { creados, actualizados, errores }
      },

      guardarEmpresa: (cambios) => {
        const siguiente: Empresa = { ...ref.current.empresa, ...cambios }
        aplicar((d) => ({ ...d, empresa: siguiente }))
        remoto(backend.guardarEmpresa(siguiente))
      },

      restablecerDemo: () => {
        if (enLaNube) {
          remoto(
            backend.vaciar().then(async () => {
              const demo = datosDemo()
              await backend.guardarMateriales(demo.materiales)
              await backend.guardarEmpresa(EMPRESA_SEED)
            }),
          )
          return
        }
        aplicar(() => datosDemo())
      },
    }
  }, [datos, usuario, verTodo, backend, enLaNube, cargando, errorNube])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useDatos(): Contexto {
  const ctx = useContext(Ctx)
  if (ctx === null) throw new Error('useDatos debe usarse dentro de <ProveedorDatos>')
  return ctx
}
