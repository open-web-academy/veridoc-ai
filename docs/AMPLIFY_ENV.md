# Variables de entorno en AWS Amplify

En local usas el archivo `.env`, pero **ese archivo no se sube a Git** (está en `.gitignore`). En producción, Amplify **no tiene acceso a tu .env**, así que las variables deben configurarse en la consola de Amplify.

## Por qué funciona en local y no en producción

- **Local**: Next.js lee `MONGODB_URI`, `LLAMA_CLOUD_API_KEY`, `NEAR_AI_API_KEY` desde `.env`.
- **Producción (Amplify)**: Esas variables solo existen si las defines en Amplify. Si no están ahí, verás "No configurado" en la página de status y LlamaParse/NEAR AI no funcionarán.

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
