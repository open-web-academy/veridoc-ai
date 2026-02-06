# Variables de entorno en AWS Amplify

En local usas el archivo `.env`, pero **ese archivo no se sube a Git** (está en `.gitignore`). En producción, Amplify **no tiene acceso a tu .env**, así que las variables deben configurarse en la consola de Amplify.

## Por qué en producción no se detectan (build vs runtime)

En Amplify, las variables que configuras en la consola están disponibles **solo durante el build**, no en el **runtime** del servidor (SSR, API routes, Server Actions). Por eso en producción `process.env.MONGODB_URI` etc. pueden salir `undefined` aunque las tengas definidas en Amplify.

Para que Next.js las use en runtime, el `amplify.yml` escribe esas variables en `.env.production` **antes** de `npm run build`, así Next.js puede cargarlas cuando la app recibe tráfico. No hace falta que hagas nada más si las variables están ya en Amplify.

## Por qué funciona en local y no en producción (resumen)

- **Local**: Next.js lee `MONGODB_URI`, `LLAMA_CLOUD_API_KEY`, `NEAR_AI_API_KEY` desde `.env`.
- **Producción (Amplify)**: Debes definirlas en Environment variables de Amplify **y** el build debe escribirlas en `.env.production` (eso lo hace ya el `amplify.yml`). Si no están en Amplify, verás "No configurado" en /status.

## Cómo configurarlas en Amplify

1. Entra en **AWS Amplify Console** → tu app.
2. En el menú izquierdo: **Hosting** → **Environment variables** (o **App settings** → **Environment variables**).
3. Añade cada variable con el **mismo nombre** que en tu `.env`:

   | Nombre                 | Descripción                          | Ejemplo (no uses estos valores literales) |
   |------------------------|--------------------------------------|-------------------------------------------|
   | `MONGODB_URI`          | URI de MongoDB (Atlas o servidor)   | `mongodb+srv://user:pass@cluster.mongodb.net/veridoc` |
   | `LLAMA_CLOUD_API_KEY`  | API key de LlamaParse / Llama Cloud | `llx-...`                                 |
   | `NEAR_AI_API_KEY`      | API key de NEAR AI                  | `sk-...`                                  |

4. Guarda los cambios. Amplify **redespliega** la app para que las variables se apliquen (puede tardar unos minutos).

## Comprobar que está bien

- Abre en producción la ruta **/status**.
- Si todo está configurado correctamente, MongoDB, LlamaParse y NEAR AI deberían aparecer como **Operativo**.

Si en producción sigues viendo "LlamaParse: No configurado" o "LLAMA_CLOUD_API_KEY no está configurada", la causa es que esa variable no está definida (o está mal escrita) en Environment variables de Amplify.
