# Colecciones de CotizaPro en Firestore

Inventario, clientes, cotizaciones y los datos de la empresa se guardan en Firestore, así que
todo el equipo trabaja sobre la misma información. La app escucha cada colección en tiempo real
(`onSnapshot`): lo que guarda un vendedor aparece en el resto de sesiones sin recargar.

Proyecto: el que configures en `.env` (`VITE_FIREBASE_*`, ver `.env.example`).
Base de datos: la predeterminada `(default)`, modo nativo.

## Resumen

| Colección | Documento | Contenido | Quién escribe |
| --- | --- | --- | --- |
| `usuarios` | `{uid}` de Firebase Auth | perfiles, rol y permisos | Administrador (y el propio usuario solo su primer ingreso) |
| `materiales` | `{materialId}` (`M...`) | inventario de materiales | Administrador |
| `clientes` | `{clienteId}` (`C...`) | clientes registrados | Administrador y el vendedor que lo creó |
| `cotizaciones` | `{cotizacionId}` (`Q...`) | cotizaciones e historial | Administrador y el vendedor dueño |
| `config` | `empresa` | razón social, NIT, logo, IVA | Administrador |
| `consecutivos` | `cotizaciones` | último número de cotización emitido | cualquier perfil activo (solo hacia arriba) |

Los identificadores los genera la app (por ejemplo `MLX1F2AB3CD`), no son autogenerados por
Firestore, para que un mismo registro se pueda migrar desde el navegador sin duplicarse.

## `usuarios/{uid}`

Perfil de cada cuenta. El id del documento es el `uid` de Firebase Authentication.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `uid` | string | igual al id del documento |
| `nombre` | string | |
| `email` | string | el mismo de Authentication |
| `rol` | string | `Administrador` \| `Vendedor` |
| `permisos` | string[] | ver `src/lib/roles.ts` |
| `activo` | boolean | un perfil inactivo no puede leer ni escribir nada |
| `debeCambiarPassword` | boolean | `true` en todo usuario creado desde la app; obliga a cambiar la clave en el primer ingreso |
| `creado` | string ISO | |
| `creadoPor` | string \| null | `uid` del administrador que lo creó |
| `ultimoIngreso` | string ISO \| null | lo escribe el propio usuario al entrar |

## `materiales/{materialId}`

Inventario compartido. Es la única fuente de precios vigentes.

| Campo | Tipo | Obligatorio | Notas |
| --- | --- | --- | --- |
| `id` | string | sí | igual al id del documento |
| `codigo` | string | sí | código interno; la importación CSV lo usa para no duplicar |
| `nombre` | string | sí | |
| `categoria` | string | sí | `Sin categoría` si el CSV no la trae |
| `unidad` | string | sí | `unidad` \| `bulto` \| `m2` \| `m3` \| `kg` \| `ml` |
| `precio` | number | sí | COP sin decimales |
| `stock` | number | sí | |
| `stockMinimo` | number | sí | por debajo de este valor la app marca "Stock bajo" |
| `activo` | boolean | sí | `false` lo oculta del buscador sin borrar el histórico |
| `actualizado` | string ISO | sí | |

Ejemplo:

```json
{
  "id": "M0001",
  "codigo": "CEM-50",
  "nombre": "Cemento gris 50 kg",
  "categoria": "Cementos",
  "unidad": "bulto",
  "precio": 32500,
  "stock": 180,
  "stockMinimo": 40,
  "activo": true,
  "actualizado": "2026-09-13T12:00:00.000Z"
}
```

## `clientes/{clienteId}`

| Campo | Tipo | Obligatorio | Notas |
| --- | --- | --- | --- |
| `id` | string | sí | igual al id del documento |
| `nombre` | string | sí | |
| `tipo` | string | sí | `Particular` \| `Contratista` \| `Empresa` |
| `telefono` | string | sí | |
| `documento` | string | no | NIT o cédula |
| `email` | string | no | |
| `obra` | string | no | obra o proyecto asociado |
| `creado` | string ISO | sí | |
| `creadoPor` | string \| null | sí en escrituras de vendedor | `uid` del vendedor dueño del cliente |

`creadoPor` delimita el historial: un vendedor ve sus clientes y los que tengan cotizaciones
suyas; el administrador ve todos.

## `cotizaciones/{cotizacionId}`

| Campo | Tipo | Obligatorio | Notas |
| --- | --- | --- | --- |
| `id` | string | sí | igual al id del documento |
| `numero` | number \| null | sí | `null` mientras es borrador; se asigna al generarla |
| `clienteId` | string \| null | sí | referencia a `clientes/{id}`; queda `null` si el cliente se elimina |
| `items` | array | sí | líneas de la cotización (ver abajo) |
| `descuentoGlobal` | number | sí | porcentaje 0–100 |
| `ivaPct` | number | sí | porcentaje aplicado, copiado de `config/empresa` al crearla |
| `vigenciaDias` | number | sí | días de validez desde `emitida` |
| `notas` | string | sí | |
| `estado` | string | sí | `Borrador` \| `Enviada` \| `Aceptada` \| `Rechazada` \| `Vencida` |
| `vendedor` | string | sí | nombre mostrado en el PDF |
| `vendedorUid` | string \| null | sí | `uid` dueño de la cotización; las reglas y las consultas se basan en él |
| `autorizacionEdicion` | objeto \| null | sí | `{ por, uid, fecha }` que registra la autorización del administrador para editar una cotización ajena |
| `creada` | string ISO | sí | |
| `emitida` | string ISO \| null | sí | fecha de generación; `null` en borradores |
| `actualizada` | string ISO | sí | |

Cada elemento de `items` es un **snapshot** del material en el momento de cotizar; no se
recalcula si cambia el inventario (la app ofrece un botón explícito para sincronizar precios):

| Campo | Tipo | Notas |
| --- | --- | --- |
| `materialId` | string | referencia a `materiales/{id}` |
| `codigo`, `nombre`, `unidad` | string | copiados del material |
| `precioLista` | number | precio del inventario al agregarlo |
| `precioUnitario` | number | precio realmente cotizado |
| `cantidad` | number | |
| `descuento` | number | porcentaje 0–100 de la línea |

Ejemplo:

```json
{
  "id": "Q0001",
  "numero": 1007,
  "clienteId": "C0002",
  "items": [
    {
      "materialId": "M0001",
      "codigo": "CEM-50",
      "nombre": "Cemento gris 50 kg",
      "unidad": "bulto",
      "precioLista": 32500,
      "precioUnitario": 31000,
      "cantidad": 25,
      "descuento": 0
    }
  ],
  "descuentoGlobal": 0,
  "ivaPct": 19,
  "vigenciaDias": 15,
  "notas": "Entrega en obra",
  "estado": "Enviada",
  "vendedor": "Vendedor Demo",
  "vendedorUid": "AbC123...",
  "autorizacionEdicion": null,
  "creada": "2026-09-13T12:00:00.000Z",
  "emitida": "2026-09-13T12:30:00.000Z",
  "actualizada": "2026-09-13T12:30:00.000Z"
}
```

## `config/empresa`

Documento único con los datos que encabezan el PDF y los valores por defecto de cada cotización:
`nombre`, `logoUrl`, `nit`, `direccion`, `telefono`, `email`, `vendedor`, `ivaPct`,
`vigenciaDias`, `condiciones`, `notas`.

## `config/ia`

Configuración del asesor de proyectos con IA. La escribe el administrador desde
**Ajustes → Asesor con IA** y la leen todos los perfiles activos:

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `apiKey` | string | clave de Google Gemini (capa gratuita) |
| `modelo` | string | modelo usado, por defecto `gemini-2.5-flash` |
| `actualizado` | string ISO | última vez que se guardó |

Al ser una app sin backend, la clave llega al navegador de cada usuario del equipo: restríngela en
Google Cloud a la *Generative Language API* y al dominio de la app (ver `ASESOR_IA.md`). Si se
requiere que no salga del servidor, hay que moverla detrás de una Cloud Function.

## `consecutivos/cotizaciones`

Contador compartido del número de cotización:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `ultimo` | number | último consecutivo entregado; arranca en 1000 |
| `actualizado` | string ISO | |

Al generar una cotización la app reserva el número con `runTransaction`, así que dos vendedores
que emiten al mismo tiempo no pueden obtener el mismo consecutivo. Es necesario porque un
vendedor no puede leer las cotizaciones de los demás y no podría calcular el máximo por su
cuenta. Las reglas solo permiten subir el contador, nunca retrocederlo; al restablecer los datos
el administrador lo borra y la numeración vuelve a empezar en 1001.

## Relaciones

```
usuarios/{uid} ──< clientes.creadoPor
usuarios/{uid} ──< cotizaciones.vendedorUid
clientes/{id}  ──< cotizaciones.clienteId
materiales/{id} ──< cotizaciones.items[].materialId   (solo referencia; el precio es snapshot)
config/empresa ──> valores por defecto de ivaPct y vigenciaDias
```

## Permisos (resumen de `firestore.rules`)

| Colección | Administrador | Vendedor |
| --- | --- | --- |
| `materiales` | leer y escribir | solo leer |
| `clientes` | leer, crear, editar y eliminar | leer; crear y editar los propios (`creadoPor` = su uid); no eliminar |
| `cotizaciones` | leer todas, editar y eliminar | solo las propias (`vendedorUid` = su uid) |
| `config/empresa` y `config/ia` | leer y escribir | solo leer |
| `consecutivos/cotizaciones` | leer, subir y borrar | leer y subir el contador |
| `usuarios` | leer y administrar todos | solo su perfil; únicamente puede tocar `debeCambiarPassword` y `ultimoIngreso` |

Todo acceso exige sesión iniciada y `activo == true` en el perfil.

Como un vendedor no puede leer cotizaciones ajenas, la app consulta
`where('vendedorUid', '==', uid)` cuando el perfil no es administrador: una consulta sin ese
filtro sería rechazada por las reglas.

`clientes` se lee completo por todo el equipo a propósito: una cotización necesita mostrar los
datos de su cliente aunque lo haya registrado otro vendedor. El filtro por vendedor se aplica en
la app sobre el historial, no en la lectura.

## Publicar las reglas

```bash
# opción 1: consola → Firestore → Reglas → pegar firestore.rules → Publicar
# opción 2: CLI
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project <tu-project-id>
```

## Índices

Las consultas actuales (colección completa para el administrador y un único `where` por
`vendedorUid` para el vendedor) funcionan con los índices automáticos: no hace falta crear
índices compuestos.

## Cargar los primeros datos

En **Ajustes → Almacenamiento de los datos** (solo administrador):

- **Cargar catálogo de ejemplo**: escribe en Firestore el inventario y los clientes de muestra.
- **Subir datos de este navegador**: migra a Firestore el inventario, clientes y cotizaciones que
  quedaron en `localStorage` de versiones anteriores; conserva los ids, así que se puede repetir
  sin duplicar.
- **Restablecer datos**: borra las tres colecciones y el contador de consecutivos, y vuelve a
  cargar el catálogo de ejemplo. No toca los perfiles de `usuarios`.

Sin credenciales de Firebase la app arranca en modo demo y guarda todo en `localStorage`
(clave `cotizapro.v1`). La cotización abierta (`cotizapro.borrador`) siempre es local: es una
preferencia del dispositivo, no un dato compartido.
