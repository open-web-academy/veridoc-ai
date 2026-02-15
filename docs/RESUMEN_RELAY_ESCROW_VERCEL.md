# Resumen: correcciones para relay-escrow-deposit en Vercel

Documento para que otro desarrollador pueda retomar el trabajo. Describe el problema que ocurría en producción (Vercel) y los cambios realizados.

---

## Problema inicial

- **Flujo:** En la app, el usuario puede "Pagar y solicitar segunda opinión" (depósito USDT a escrow vía meta-transacción).
- **Comportamiento:** En **local** (localhost:3000) el flujo funcionaba; en **Vercel** (https://veridoc-ai-pearl.vercel.app) fallaba.
- **Síntomas:**
  1. Primero: **405 Method Not Allowed** al llamar a `POST /api/near/relay-escrow-deposit`.
  2. Después de ajustes: **Relay failed — Cannot find module 'borsh'** (Require stack: `/var/task/package.json` o similar).

---

## Cambios realizados

### 1. Ruta API: `app/api/near/relay-escrow-deposit/route.ts`

| Cambio | Motivo |
|--------|--------|
| **OPTIONS** | El navegador envía preflight OPTIONS antes del POST con `Content-Type: application/json`. Sin handler OPTIONS, podía devolverse 405. Se añadió un `export async function OPTIONS()` que responde 204 con headers CORS adecuados. |
| **runtime = "nodejs"** | Asegurar que Vercel ejecute esta ruta en Node.js y no en Edge (la ruta usa APIs de Node). |
| **dynamic = "force-dynamic"** | Evitar que la ruta se trate como estática y que eso afecte al POST en producción. |
| **GET de prueba** | Se añadió `export async function GET()` que devuelve `{ ok: true, message: "Use POST with body: { signedDelegateBase64 }" }` para comprobar en el navegador que la ruta está desplegada. |
| **Import estático de `borsh`** | Antes se usaba `createRequire` + `require("borsh")` (desde el package.json del proyecto o desde `@near-js/transactions`). En Vercel el bundler **no incluye** módulos cargados solo por `require` dinámico, lo que provocaba *Cannot find module 'borsh'*. Se sustituyó por **import estático**: `import { deserialize as borshDeserialize, type Schema } from "borsh"` para que el bundler incluya `borsh` en la función serverless. Se eliminó el uso de `createRequire` y `path` para cargar borsh. |

### 2. Frontend: `app/[locale]/marketplace/RequestSecondOpinion.tsx`

| Cambio | Motivo |
|--------|--------|
| **URL absoluta para el fetch** | En lugar de `fetch("/api/near/relay-escrow-deposit", ...)` se usa una URL absoluta: `window.location.origin + "/api/near/relay-escrow-deposit"` (con fallback a la ruta relativa si `window` no existe, p. ej. en SSR). Así se evita que una redirección intermedia (p. ej. en Vercel) convierta el POST en GET y provoque 405. |

### 3. Dependencias: `package.json`

| Cambio | Motivo |
|--------|--------|
| **`borsh` como dependencia directa** | Se añadió `borsh@^1.0.0` con `npm install borsh@^1.0.0 --save`. Así el paquete está en el `node_modules` de la raíz del proyecto y puede ser importado estáticamente en la ruta API; además, la versión es compatible con la usada por `@near-js/transactions`. |

---

## Cómo verificar en Vercel

1. **GET de la ruta**  
   Abrir en el navegador:  
   `https://<tu-dominio>.vercel.app/api/near/relay-escrow-deposit`  
   Debe devolver: `{"ok":true,"message":"Use POST with body: { signedDelegateBase64 }"}`.

2. **Flujo completo**  
   Ir a la funcionalidad "Pagar y solicitar segunda opinión" en la app desplegada, completar el flujo (firma del delegate, etc.) y confirmar que el POST a `/api/near/relay-escrow-deposit` responde 200 y que el pago/relay se completa sin error "Relay failed" ni "Cannot find module 'borsh'".

3. **Variables de entorno en Vercel**  
   Asegurarse de que en el proyecto de Vercel estén configuradas las variables necesarias para el relayer, por ejemplo:
   - `NEAR_RELAYER_ACCOUNT_ID`
   - `NEAR_RELAYER_PRIVATE_KEY`  
   (y las que use `@/lib/near-config` y la ruta, según el proyecto.)

---

## Archivos tocados

- `app/api/near/relay-escrow-deposit/route.ts` — OPTIONS, GET, runtime, dynamic, import de `borsh`.
- `app/[locale]/marketplace/RequestSecondOpinion.tsx` — URL absoluta del fetch al relay.
- `package.json` — dependencia directa `borsh`.
- `package-lock.json` — actualizado por `npm install`.

---

## Si algo vuelve a fallar

- **405 en POST:** Revisar en DevTools → Network que la petición que falla sea realmente **POST** (y no GET tras una redirección). Confirmar que OPTIONS devuelve 204 y que no hay middleware/proxy que bloquee POST.
- **Cannot find module 'borsh':** No volver a cargar `borsh` con `createRequire`/`require` dinámico; mantener el **import estático** desde `"borsh"` en la ruta para que el bundler de Vercel lo incluya.
- **Otros errores del relay:** Revisar logs de la función en Vercel (pestaña Functions / Logs) y variables de entorno del relayer.

---

*Última actualización: febrero 2025.*
