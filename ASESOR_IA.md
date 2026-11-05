# Asesor de proyectos con IA

El módulo **Asesor de proyectos** (`/asesor`) es un chat dentro de CotizaPro donde el vendedor o
el administrador describe una obra ("¿cuántos bloques necesito para un muro de 4 × 2,40 m?"), adjunta
fotos, planos o dibujos a mano, y recibe medidas, pasos y la lista de materiales **del inventario
real**, con un botón para pasarlos a la cotización en curso. Además de lo indispensable, propone
**materiales complementarios** para terminar esa misma obra, siempre dentro de lo que vende una
comercializadora de materiales de construcción: impermeabilizantes y sellantes, acabados,
herramientas de obra, consumibles y elementos de protección.

## Por qué Google Gemini

- Tiene **capa gratuita** (sin tarjeta) suficiente para uso comercial liviano.
- Acepta **imágenes** en la misma conversación, que es el requisito de recibir dibujos.
- Se consume por API REST desde el navegador: no hace falta servidor propio ni backend nuevo.

Límites de la capa gratuita (los fija Google y cambian con el tiempo): del orden de unas decenas
de consultas por minuto y algunos cientos por día para `gemini-3.6-flash`. Si se agota, la app
muestra "Se agotó la cuota gratuita de Gemini por ahora".

### Cuando Gemini está saturado (error 503)

En horas pico Google responde 503 ("model overloaded") aunque la clave y la cuota estén bien.
`preguntarIA()` lo maneja solo:

1. Reintenta con el modelo configurado tras 1,5 s y 4 s.
2. Si sigue saturado, consulta `GET /v1beta/models` y prueba hasta 2 modelos *flash* de texto
   disponibles para la clave (primero los estables, luego los *preview*).
3. Solo si todos fallan muestra "Gemini está saturado en este momento…".

Los errores de clave, permisos o cuota (400, 403, 404, 429) no se reintentan. Si el 503 se
repite a diario, cambia el modelo en **Ajustes → Asesor con IA** por uno estable.

## Configurar la clave (5 minutos, una sola vez)

1. Entra a https://aistudio.google.com/app/apikey con la misma cuenta de Google.
2. **Create API key** → elige el proyecto (puede ser `cotizaprobd`) → copia la clave (`AIza…`).
3. En CotizaPro, como administrador: **Ajustes → Asesor con IA** → pega la clave →
   **Guardar clave del asesor**.
4. Abre **Asesor de proyectos** y haz una consulta de prueba.

La clave queda en el documento `config/ia` de Firestore (solo el administrador la escribe; el
equipo la lee). En modo demo sin Firebase se usa la variable `VITE_GEMINI_API_KEY` del `.env`.

### Seguridad de la clave

Al ser una app sin backend, la clave llega al navegador de cada usuario. Restríngela en
https://console.cloud.google.com/apis/credentials:

- **API restrictions** → solo *Generative Language API*.
- **Application restrictions** → *Websites* → el dominio donde publiques la app.

Si algún día necesitas que la clave no salga del servidor, el reemplazo natural es una Cloud
Function que haga de intermediaria; el resto del módulo no cambia.

## Cómo funciona por dentro

- `src/lib/ia.ts`: lee la configuración, arma la instrucción de sistema y llama a
  `generativelanguage.googleapis.com`. Las imágenes viajan como `inline_data` en base64.
- El **catálogo** (hasta 200 materiales: código, nombre, unidad, precio, stock) se envía como contexto
  para que el asesor recomiende lo que la ferretería vende y con el precio vigente.
- Se le pide cerrar la respuesta con dos bloques fijos, en este orden:

  ```
  MATERIALES SUGERIDOS
  CODIGO x CANTIDAD | nombre del material
  NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo

  MATERIALES COMPLEMENTARIOS
  CODIGO x CANTIDAD | nombre del material
  NO-DISPONIBLE x CANTIDAD unidad | nombre del material que no está en el catálogo
  ```

  *Sugeridos* es lo indispensable para ejecutar lo consultado. *Complementarios* son entre 3 y 6
  materiales opcionales que el cliente probablemente también compre para terminar esa obra:
  protección (impermeabilizante, sellador), acabados (estuco, pintura; pegante, boquilla,
  crucetas y esquineros en un enchape), consumibles de la instalación (soldadura PVC, teflón,
  cinta aislante, cajas), herramientas de obra (palustre, llana, nivel, balde, brochas, rodillos)
  y elementos de protección (guantes, gafas, tapabocas). No propone muebles, herrajes de
  carpintería, decoración ni iluminación decorativa. Explica en una o dos frases por qué los
  propone y calcula sus cantidades con el mismo criterio.
- `recomendacion()` cruza cada bloque con el inventario y la página los muestra en dos tarjetas,
  **Materiales para este proyecto** y **Complementarios para la obra**, cada una con su
  subtotal. Los materiales del catálogo traen precio, cantidad sugerida editable, botón
  **Agregar** (avisa si la cantidad supera el stock) y **Agregar todos**; los que la ferretería
  no tiene se marcan como **Falta** para conseguirlos aparte o cargarlos al inventario. Si el
  modelo repite un material en ambos bloques, queda solo como necesario.
- Para que los complementarios salgan del inventario y no como *Falta*, hay que tenerlos
  cargados: ver la lista de la sección siguiente.
- **Historial de consultas**: cada respuesta guarda la conversación en `asesorias` de Firestore
  (en modo demo, en el navegador) durante 30 días (`DIAS_HISTORIAL` en
  `src/lib/historialAsesor.ts`). El botón **Historial** lista las consultas del vendedor (el
  administrador ve las de todo el equipo) y permite reabrir una y seguirla, o eliminarla. Las
  imágenes adjuntas no se guardan, solo cuántas había. Las conversaciones vencidas se borran al
  abrir el historial.
- **Asesoría en la cotización**: al pulsar **Agregar** o **Agregar todos**, el borrador en curso
  guarda la asesoría (`asesoria`: consultas del vendedor y última respuesta, sin la lista de
  materiales) y, si aún no tiene descripción del proyecto, toma la primera consulta. La
  cotización la muestra en la tarjeta **Asesoría del proyecto** y el PDF la imprime como valor
  agregado; el vendedor puede quitarla mientras la cotización sea borrador.

## Inventario sugerido para la comercializadora

El asesor solo puede proponer con código lo que exista en el inventario. El archivo
[`materiales-construccion.csv`](./materiales-construccion.csv) trae 117 materiales de obra
gris, acero, mampostería, cubiertas, hidráulica, sanitarios, eléctricos de obra, acabados,
pinturas, impermeabilizantes, herramientas, fijaciones y seguridad industrial, listos para cargar
desde **Inventario → Importar CSV** (usa `;` como separador). Precios, stock y stock mínimo son
de referencia: ajústalos antes o después de importar. Las filas con un código que ya exista
actualizan ese material: los códigos `COD-91xx` a `COD-94xx` que se conservan de la lista
anterior se actualizan, y los nuevos van de `COD-8001` a `COD-8923`. De la lista anterior se
retiraron laca, sellador y masilla para madera, lija para madera, mini rodillo, paneles y cintas
LED, reflector, sensor de movimiento y herrajes de mueble: si ya los importaste, desactívalos en
el inventario.

## Alcance del asesor

**Sí responde:** planeación y dimensionamiento de obras de construcción y remodelación (obra
gris, mampostería, cubiertas, instalaciones hidráulicas, sanitarias y eléctricas, pisos, enchapes,
drywall, pintura e impermeabilización); cálculo de cantidades (área, perímetro, piezas, desperdicio); lectura de fotos,
planos o dibujos; uso, rendimiento e instalación de los materiales; y recomendación de materiales
del catálogo.

**No responde:** diseño de muebles o carpintería (cocinas integrales, closets, mesas),
decoración, y temas ajenos al negocio (geografía, salud, tareas escolares, política,
programación, texto general); precios de proveedores externos, descuentos o condiciones
comerciales; y datos de clientes, usuarios o cotizaciones, porque solo ve el catálogo. Ante un
cálculo estructural (vigas, columnas, cimentaciones) o instalaciones de gas, advierte que lo
valide un profesional.

El bloqueo tiene dos capas:

1. `esConsultaDelNegocio()` filtra en la app y ni siquiera envía la consulta —ahorra cuota— salvo
   que mencione vocabulario del dominio o un material del catálogo, traiga una imagen, o sea un
   seguimiento corto de una conversación ya abierta ("¿y si la hago de 3 m?").
2. La instrucción de sistema obliga a Gemini a responder solo la frase de `FUERA_DE_ALCANCE` ante
   cualquier otro tema, sin lista de materiales.

Es un filtro por prompt, no un bloqueo externo: cubre el uso normal, pero alguien insistiendo
puede sacar al modelo de tema.

## Permisos

Se agregó el permiso `asesor.ia`:

- Administrador y vendedor lo traen activo por defecto.
- El administrador puede quitárselo a un vendedor en **Usuarios → Permisos**.
- Sin el permiso, la entrada del menú no aparece y `/asesor` responde "Sin permiso".

Los vendedores creados **antes** de esta versión no tienen el permiso en su perfil: actívaselo una
vez desde Usuarios.
