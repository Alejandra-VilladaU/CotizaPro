# Autenticación y roles en CotizaPro

CotizaPro usa **Firebase Authentication** (correo + contraseña) para el login y
**Cloud Firestore** para guardar el perfil de cada usuario: rol, permisos, estado y la
bandera de cambio obligatorio de contraseña.

Si no configuras Firebase, la app arranca en **modo demo local** con usuarios guardados en
`localStorage`. Sirve para probar la experiencia completa, **no para producción**: no hay
servidor que valide credenciales ni envío real de correos.

---

## 1. Crear el proyecto en Firebase

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto**.
2. Nombre: `cotizapro` (puedes desactivar Google Analytics).
3. Cuando termine, en el panel izquierdo abre **Compilación → Authentication → Comenzar**.
4. Pestaña **Sign-in method** → habilita **Correo electrónico/contraseña**.
   Deja *Vínculo de correo electrónico* desactivado.
5. Abre **Compilación → Firestore Database → Crear base de datos** → modo **producción** →
   elige la región (`southamerica-east1` o `us-central1`).

## 2. Obtener la configuración web

1. Ícono de engranaje → **Configuración del proyecto**.
2. En **Tus apps**, botón **</>** (Web), nombre `CotizaPro web` → **Registrar app**.
3. Copia el objeto `firebaseConfig` y llévalo al archivo `.env` (usa `.env.example` como
   plantilla):

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=cotizapro.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cotizapro
VITE_FIREBASE_STORAGE_BUCKET=cotizapro.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

> Estas variables **son públicas** por diseño: Firebase las incrusta en el navegador. Nunca
> pongas en `VITE_*` una clave privada, un token de servicio ni una contraseña.

En Vercel/Netlify agrégalas como *Environment Variables* del proyecto y vuelve a desplegar.

## 3. Publicar las reglas de seguridad

El repo incluye `firestore.rules`. Impiden que un vendedor se ascienda a administrador, se
cambie los permisos o lea perfiles ajenos.

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # elige tu proyecto
firebase deploy --only firestore:rules
```

Si prefieres no instalar nada: **Firestore → Reglas**, pega el contenido de
`firestore.rules` y publica.

## 4. Crear el primer administrador

El primer administrador se crea a mano una sola vez (nadie puede crearlo desde la app
todavía):

1. **Authentication → Users → Agregar usuario**: correo y una contraseña temporal.
   Copia el **UID** que aparece en la lista.
2. **Firestore → Iniciar colección** → ID de colección: `usuarios`.
3. ID del documento: **pega el UID exacto** del paso 1. Campos:

| Campo                 | Tipo    | Valor                          |
| --------------------- | ------- | ------------------------------ |
| `email`               | string  | `admin@tuempresa.co`           |
| `nombre`              | string  | `Nombre del administrador`     |
| `rol`                 | string  | `Administrador`                |
| `activo`              | boolean | `true`                         |
| `debeCambiarPassword` | boolean | `true`                         |
| `permisos`            | array   | déjalo vacío (usa los del rol) |
| `creado`              | string  | `2026-01-01T00:00:00.000Z`     |
| `ultimoIngreso`       | null    | (tipo *null*)                  |

Con `debeCambiarPassword: true` la app te obligará a definir tu contraseña definitiva en el
primer ingreso.

4. Entra a la app con ese correo. Desde **Usuarios** ya puedes crear vendedores sin volver a
   la consola.

Si este primer administrador ya eligió su contraseña definitiva, deja
`debeCambiarPassword: false` y entrará directo al panel.

## 4.1 Crear más administradores

Lo normal es hacerlo **desde la app**: *Usuarios → Crear usuario → Perfil: Administrador*. Por
seguridad, todo perfil creado desde la app —vendedor o administrador— debe cambiar la clave
inicial en su primer ingreso.

También puedes hacerlo desde la consola repitiendo el paso 4: crear el usuario en
**Authentication** y su documento en `usuarios/{UID}` con `rol: "Administrador"`.

## 5. Cómo funciona el flujo

- **Login**: `signInWithEmailAndPassword`. Si el usuario no tiene documento en `usuarios` o
  tiene `activo: false`, la sesión se cierra y se muestra un error: entrar a Firebase Auth no
  basta para entrar a CotizaPro.
- **Recuperar contraseña**: `sendPasswordResetEmail`. El correo lo envía Firebase; puedes
  personalizar la plantilla en **Authentication → Templates**.
- **Primer ingreso**: todo usuario creado desde la app queda con `debeCambiarPassword: true`.
  Mientras esa bandera esté activa, la app solo permite la pantalla *Crea tu contraseña*
  (mínimo 8 caracteres, con letras y números). Al guardarla, `updatePassword` cambia la clave
  y la bandera pasa a `false`.
  La única excepción es el primer administrador creado a mano en la consola, donde tú decides
  el valor de la bandera.
- **Crear vendedores sin perder la sesión**: la creación usa una **instancia secundaria** de
  Firebase (`cotizapro-alta-usuarios`), porque `createUserWithEmailAndPassword` iniciaría
  sesión con el usuario nuevo en la instancia principal.

## 6. Perfiles

| | Administrador | Vendedor |
| --- | --- | --- |
| Buscar materiales | ✔ (solo consulta) | ✔ |
| Generar cotizaciones | ✘ (rol de gestión) | ✔ |
| Editar cotizaciones ajenas | solo con autorización explícita registrada | ✘ |
| Registrar clientes | ✔ | ✔ |
| Eliminar clientes | ✔ | ✘ |
| Inventario (crear/editar) | ✔ | ✘ |
| Empresa, logo, NIT, dirección | ✔ | ✘ |
| Usuarios y permisos | ✔ | ✘ |
| Reportes globales | ✔ | ✘ (solo sus registros) |
| Exportar PDF / Excel | ✔ | ✔ |

Los permisos de cada vendedor son configurables uno por uno en **Usuarios → Permisos**
(registrar clientes, generar cotizaciones, exportar, buscar materiales).

La "autorización explícita" queda registrada en la cotización con el nombre, el UID y la
fecha de quien la otorgó; sin ella el administrador ve las cotizaciones ajenas en modo
lectura.

## 7. Limitación importante

El login, los roles y los permisos son remotos, pero **el inventario, los clientes y las
cotizaciones siguen guardándose en el navegador** (`localStorage`). Por eso cada dispositivo
mantiene sus propios datos de negocio. Para que un equipo comparta inventario e historial
hace falta mover esas colecciones a Firestore; es el siguiente paso natural y la estructura
de datos (`vendedorUid`, `creadoPor`, `autorizacionEdicion`) ya está preparada para ello.

## 8. Modo demo (sin Firebase)

Sin variables `VITE_FIREBASE_*` la app usa usuarios locales:

| Correo | Contraseña | Rol | Nota |
| --- | --- | --- | --- |
| `admin@cotizapro.co` | `Admin1234` | Administrador | |
| `vendedor@cotizapro.co` | `Vendedor1234` | Vendedor | |
| `nuevo@cotizapro.co` | `Inicial1234` | Vendedor | exige cambiar la clave al entrar |

En modo demo la recuperación de contraseña no envía correos: muestra en pantalla una clave
temporal.
