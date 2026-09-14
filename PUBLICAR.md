# Publicar CotizaPro desde GitHub (paso a paso)

Guía corta para tener la app en línea, con HTTPS y dominio gratis, lista para presentar.
Para servidores propios (Docker, VPS, cPanel) usa `DESPLIEGUE.md`.

Antes de empezar: el código debe estar en `main` (hoy el trabajo va en ramas `devin/…`, así que
primero mezcla los PR abiertos en `main`).

---

## Opción A — Firebase Hosting (recomendada: mismo proyecto del login y los datos)

La app ya usa Firebase (`cotizaprobd`), así que el dominio queda del estilo
`https://cotizaprobd.web.app` y no hay que configurar nada extra de autenticación.

### A.1 Publicar la primera vez desde tu computador

```bash
git clone https://github.com/Alejandra-VilladaU/CotizaPro.git
cd CotizaPro
npm ci

cp .env.example .env     # pega los valores de tu app web de Firebase
npm run build            # genera dist/

npm i -g firebase-tools
firebase login
firebase init hosting
#   ¿Proyecto?            → cotizaprobd
#   ¿Carpeta pública?     → dist
#   ¿App de una página?   → Yes   (imprescindible: /cotizaciones y /pdf/:id son rutas internas)
#   ¿Sobrescribir index?  → No

firebase deploy --only hosting
```

Al terminar, la consola imprime la URL pública (`https://cotizaprobd.web.app`). Esa es la que
compartes o presentas.

### A.2 Autorizar el dominio en Authentication

Firebase Console → **Authentication → Settings → Authorized domains** → agrega
`cotizaprobd.web.app` (y tu dominio propio si usas uno). Sin esto el login falla en producción.

### A.3 Publicar automáticamente en cada push (GitHub Actions)

```bash
firebase init hosting:github
# Repositorio: Alejandra-VilladaU/CotizaPro
# ¿Configurar deploy automático en merge a main? → Yes
# Comando de build: npm ci && npm run build
```

Crea `.github/workflows/` y guarda solo la credencial de despliegue en los secretos del repo.
Las variables `VITE_FIREBASE_*` no están en Git, así que agrégalas como **Secrets** del
repositorio (Settings → Secrets and variables → Actions) y en el workflow, antes del build:

```yaml
      - run: npm ci && npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

### A.4 Publicar también las reglas de Firestore

```bash
firebase deploy --only firestore:rules
```

---

## Opción B — Vercel (sin instalar nada, todo desde el navegador)

1. Entra a https://vercel.com y elige **Continue with GitHub**.
2. **Add New… → Project** → importa `Alejandra-VilladaU/CotizaPro`.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist` (Vercel lo detecta solo).
4. **Environment Variables**: agrega una por una las `VITE_FIREBASE_*` de tu `.env`.
5. **Deploy**. Queda en `https://cotiza-pro.vercel.app` y cada push a `main` republica solo.
6. Firebase Console → Authentication → Authorized domains → agrega el dominio de Vercel.

El repo ya trae `vercel.json` con el *rewrite* de SPA, así que `/cotizaciones` y `/pdf/:id`
funcionan al recargar.

Netlify es equivalente: **Add new site → Import from GitHub**, build `npm run build`,
publish `dist`, y las mismas variables de entorno.

---

## Dominio propio (opcional)

- Firebase Hosting: **Hosting → Add custom domain** y copia los registros A que te da.
- Vercel: **Settings → Domains → Add** y copia el CNAME.
- En ambos casos el certificado HTTPS se emite gratis y automáticamente.
- Recuerda volver a agregar el dominio en **Authorized domains** de Authentication.

---

## Lista de verificación antes de presentar

- [ ] Entra a la URL pública e inicia sesión con `m.alejandra3003@gmail.com`.
- [ ] Recarga estando en `/cotizaciones`: debe seguir mostrando la página (no un 404).
- [ ] Crea un vendedor de prueba y comprueba el cambio de clave en el primer ingreso.
- [ ] El vendedor ve el mismo inventario y genera una cotización con número propio.
- [ ] Abre "Vista previa PDF" e imprime a PDF desde el navegador.
- [ ] Si vas a mostrar el asesor con IA, guarda la clave de Gemini en **Ajustes → Asesor con IA**
      (ver `ASESOR_IA.md`) y haz una consulta de prueba.
