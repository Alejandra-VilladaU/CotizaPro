# CotizaPro — Busca. Cotiza. Construye.

Aplicación web lista para usar para consultar materiales del inventario, agregar cantidades,
generar cotizaciones confiables (con IVA, descuentos y vigencia) y conservar el historial por
cliente.

- **Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + React Router.
- **Acceso:** login con Firebase Authentication, recuperación de contraseña, cambio obligatorio
  en el primer ingreso y perfiles **Administrador** / **Vendedor** con permisos configurables
  (ver [FIREBASE.md](FIREBASE.md)). Sin configurar Firebase arranca en modo demo local.
- **Datos de negocio:** persistidos en el navegador (`localStorage`, clave `cotizapro.v1`) con
  catálogo demo de 30 materiales, 5 clientes y 8 cotizaciones.
- **Despliegue:** sitio estático; el único servicio externo es Firebase para la autenticación.

## Pantallas

| Ruta | Función |
| --- | --- |
| `/` | Buscar materiales por nombre, código o categoría; ver precio, unidad y stock; stepper de cantidad y "Agregar". |
| `/cotizacion` | Cotización en curso (borrador): cliente, cantidades, precio editable, descuento por línea, descuento global, IVA, vigencia, notas, generar y compartir. |
| `/cotizacion/:id` | Ver o editar una cotización específica. |
| `/cotizaciones` | Historial general con KPIs (enviadas, aceptadas, por vencer, borradores), filtros por estado y acciones (PDF, duplicar, aceptar, rechazar). |
| `/clientes` | Lista de clientes con total cotizado y aceptadas; crear cliente. |
| `/clientes/:id` | Historial de cotizaciones de ese cliente. |
| `/inventario` | Administrar materiales: crear, editar, eliminar, importar CSV, alertas de stock. *(solo Administrador)* |
| `/reportes` | Reportes globales: ventas, conversión, ticket promedio, ventas por vendedor y por mes, top clientes. *(solo Administrador)* |
| `/usuarios` | Crear vendedores con clave temporal, activar/desactivar, eliminar y configurar permisos. *(solo Administrador)* |
| `/ajustes` | Datos de la empresa para el PDF (logo, NIT, dirección), IVA y vigencia por defecto. *(edición solo Administrador)* |
| `/login` | Ingreso y recuperación de contraseña. |
| `/cambiar-password` | Cambio obligatorio de contraseña en el primer ingreso. |
| `/pdf/:id` | Vista imprimible tamaño carta (Imprimir → "Guardar como PDF"). |

## Reglas del cotizador

```
total_línea = cantidad × precio_unitario × (1 − descuento_línea / 100)
subtotal    = Σ total_línea
descuento   = subtotal × descuento_global / 100
base        = subtotal − descuento
iva         = base × iva_pct / 100
total       = base + iva
```

- El nombre y el precio quedan **congelados** en la cotización (snapshot): cambiar el inventario no
  altera cotizaciones ya emitidas; la app avisa y ofrece "Actualizar precios" en los borradores.
- El **número consecutivo** se asigna al generar, no al crear el borrador.
- Vigencia por defecto 15 días; al pasar la fecha, una cotización *Enviada* pasa a *Vencida*.
- Se puede cotizar por encima del stock, pero se muestra advertencia.
- Moneda COP sin decimales (`$ 1.452.327`), IVA por defecto 19 %.

## Importar inventario por CSV

Encabezado opcional; separador `,` o `;`:

```csv
codigo,nombre,categoria,unidad,precio,stock,stock_minimo
COD-1023,Cemento Gris Uso General 50 kg,Cemento,bulto,32400,240,40
COD-2210,Varilla corrugada 1/2" x 6 m,Acero,unidad,28900,8,20
```

Unidades válidas: `unidad`, `bulto`, `m2`, `m3`, `kg`, `ml`. Si el código ya existe, se actualiza el
material; si no, se crea.

## Ejecutar en local

Requiere **Node.js 20.19+** (recomendado 22 LTS) y npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Otros comandos:

```bash
npm run build        # typecheck (tsc -b) + build de producción en dist/
npm run preview      # sirve dist/ en http://localhost:4173
npm run typecheck    # tsc -b
```

### Variables de entorno

```bash
cp .env.example .env   # config web de Firebase
```

Sin `.env` la app funciona en **modo demo local** (usuarios en `localStorage`,
`admin@cotizapro.co` / `Admin1234` y `vendedor@cotizapro.co` / `Vendedor1234`). Para el login
real, sigue [FIREBASE.md](./FIREBASE.md): crear el proyecto, habilitar Email/Password, publicar
`firestore.rules` y crear el primer administrador.

## Despliegue

Ver **[DESPLIEGUE.md](./DESPLIEGUE.md)** — Docker + Nginx, VPS con dominio y HTTPS,
Vercel/Netlify, subcarpeta, actualización y respaldo de datos.

## Limitaciones actuales

- El login, los roles y los permisos sí son remotos (Firebase), pero el inventario, los clientes
  y las cotizaciones siguen viviendo en el navegador de cada usuario: **no se comparten** entre
  dispositivos ni personas, y se pierden si se borra el almacenamiento del sitio. Para que el
  equipo comparta inventario e historial hay que mover esas colecciones a Firestore.
- El modo demo local (sin Firebase) **no es seguridad de producción**: valida credenciales en el
  propio navegador.
- El PDF es la vista imprimible del navegador (Imprimir → Guardar como PDF), no generación en
  servidor.
- WhatsApp y correo se abren con enlaces `wa.me` y `mailto:`; no hay integración con la API oficial.
- El enlace que se comparte (`/pdf/:id`) solo funciona en el navegador donde se creó la cotización,
  precisamente porque no hay backend.
