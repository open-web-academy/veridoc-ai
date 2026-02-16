# Verificación: pago de USDT al especialista tras el diagnóstico

Este documento describe el flujo desde que el especialista entrega su dictamen hasta que recibe el 85% del pago en USDT en su cuenta NEAR, y qué debe cumplir cada parte.

---

## 1. Flujo completo (resumen)

```
Especialista envía dictamen (status "attended")
        ↓
Backend guarda delivered_at y release_after_at = delivered_at + 24h
        ↓
Cron (cada 10–15 min) llama GET /api/consultations/pending-release
        ↓
Backend devuelve consultas con release_after_at <= now y released_at = null
        ↓
Para cada consulta: escrow envía 85% USDT → especialista, 15% → plataforma
        ↓
Backend marca released_at (POST /api/consultations/:id/release)
```

---

## 2. Qué hace este repo (frontend + API)

### 2.1 Especialista entrega el diagnóstico ✅

- **Dónde:** `ConsultationResponseModal.tsx` (pestaña “Especialista” en `/analisis`).
- **Acción:** Al enviar el dictamen se llama `updateConsultationAction(consultationId, { status: "attended", analysisCommentsSpecialist })`.
- **Efecto:** Se hace **PATCH** al backend: `PATCH /api/consultations/:id` con `status: "attended"` y el texto del dictamen.

El frontend no guarda `delivered_at` ni `release_after_at`; eso debe hacerlo el **backend** al recibir ese PATCH.

### 2.2 Job de liberación (cron) ✅

- **Dónde:** `app/api/cron/release-escrow/route.ts`.
- **URL:** `POST /api/cron/release-escrow` (protegido con header `x-cron-secret` o `Authorization: Bearer <CRON_SECRET>`).
- **Qué hace:**
  1. Llama al backend **GET** `/api/consultations/pending-release`.
  2. Para cada consulta devuelta:
     - Comprueba que tenga `consultationId`, `amount_raw` y `specialistAccount` (o `specialist_account`).
     - Comprueba que `specialistAccount` sea una **cuenta NEAR válida** (no un id interno).
     - Calcula 85% y 15% del `amount_raw`.
     - Hace **storage_deposit** en USDT para el especialista si no tiene.
     - Envía **85% USDT** desde la cuenta escrow a `specialistAccount`.
     - Envía **15% USDT** desde la cuenta escrow a la cuenta plataforma.
     - Llama al backend **POST** `/api/consultations/:id/release` con `releasedAt`, `releaseTxHash`, etc.

Si `specialistAccount` no es una cuenta NEAR válida (p. ej. es un id de base de datos), esa consulta se salta y se añade a `errors` con un mensaje claro.

---

## 3. Qué debe implementar el backend

Para que el especialista **reciba realmente** los USDT, el backend de consultas tiene que implementar lo siguiente.

### 3.1 Al recibir PATCH con `status: "attended"`

Al actualizar una consulta a `status: "attended"`:

- Guardar **delivered_at** = fecha/hora actual.
- Calcular **release_after_at** = delivered_at + 24 horas.

Así la consulta quedará elegible para liberación 24 h después de que el especialista entregue el dictamen.

### 3.2 GET `/api/consultations/pending-release`

- **Respuesta:** Lista de consultas que cumplan:
  - `delivered_at` definido  
  - `released_at` null  
  - `release_after_at <= now`
- **Campos necesarios en cada ítem** (el cron los usa):
  - `_id` o `id` → consultationId
  - `amount_raw` (string, USDT en crudo 6 decimales)
  - `specialistAccount` o `specialist_account` → **cuenta NEAR del especialista** (no un id interno)

Importante: `specialistAccount` debe ser la **dirección NEAR** del especialista (ej. `abc123...` implícita o `usuario.near`). Si en la consulta solo guardas el id del especialista, hay que hacer join con la tabla de especialistas y devolver su `nearAddress`. Si no, el cron no podrá enviar USDT o fallará la validación de cuenta NEAR.

### 3.3 POST `/api/consultations/:id/release`

- **Body:** `releasedAt`, `releaseTxHash`, `specialistTxHash`, `platformTxHash`.
- **Acción:** Marcar la consulta como liberada: guardar **released_at** y los hashes que envíe el cron.

### 3.4 Datos de pago en la consulta

Para que una consulta aparezca en `pending-release` y se pueda calcular el 85%/15%, la consulta debe tener al menos:

- **amount_raw** (se guarda cuando el frontend llama a **confirm-payment**; si el backend no tiene ese endpoint, nunca se rellena y el cron no podrá liberar).

Por tanto, para que el flujo esté completo, el backend también debe tener:

- **POST** `/api/consultations/:id/confirm-payment` (body: `txHash`, `amountRaw`, `paidAt`) para registrar el pago y guardar `amount_raw`, `paid_at`, `escrow_tx_hash`, etc.

---

## 4. Condiciones para que el especialista reciba USDT

| Requisito | Dónde |
|-----------|--------|
| Especialista tiene **cuenta NEAR** (nearAddress en su perfil) | Perfil del especialista en el backend / onboarding. En el frontend se usa `specialist.nearAddress \|\| specialist.id`; si no hay nearAddress, se usa el id (no es NEAR válido). |
| La **consulta** se creó con `specialistAccount` = cuenta NEAR del especialista | Backend al guardar la consulta (el frontend envía `specialistAccount` en createConsultation). |
| La consulta está **pagada**: tiene `amount_raw`, `paid_at` | Backend implementa confirm-payment y el frontend lo llama tras el depósito en escrow. |
| Tras el dictamen, la consulta tiene **delivered_at** y **release_after_at** | Backend al poner status "attended". |
| **Cron** ejecutándose cada 10–15 min contra `POST /api/cron/release-escrow` | Servicio externo (cron-job.org, EventBridge, etc.) con `CRON_SECRET`. |
| **Escrow** con NEAR para gas y **ESCROW_PRIVATE_KEY** en el servidor | Variables de entorno (Amplify / .env). |

---

## 5. Resumen de verificación

- **En este repo:** El proceso está implementado: el especialista envía el dictamen vía `ConsultationResponseModal` (PATCH "attended") y el job de liberación en `release-escrow` hace las dos transferencias USDT (85% especialista, 15% plataforma) y llama a release en el backend. Se añade validación de que `specialistAccount` sea una cuenta NEAR válida antes de transferir.
- **En el backend:** Hay que implementar (1) delivered_at y release_after_at al marcar "attended", (2) GET pending-release con los campos indicados y con `specialistAccount` = cuenta NEAR del especialista, (3) POST confirm-payment para guardar amount_raw, (4) POST release para marcar released_at, y (5) asegurar que los especialistas tengan `nearAddress` y que la consulta guarde la cuenta NEAR del especialista.

Cuando el backend cumpla todo lo anterior y el cron esté programado, el especialista recibirá el 85% en USDT en su cuenta NEAR 24 horas después de entregar el diagnóstico.

---

## 6. Mock: liberación inmediata (sin 24 h)

Para no depender del cron ni del backend, se implementó una **liberación inmediata** cuando el especialista envía su dictamen:

- **Flujo:** En `ConsultationResponseModal`, tras guardar el dictamen (`status: "attended"`) se llama a `releaseConsultationNowAction(consultationId, amountRaw, specialistAccount)`, que invoca **POST /api/consultations/release-now** y ejecuta las dos transferencias (85% → especialista, 15% → plataforma) en ese momento.
- **Requisitos:** El especialista debe tener **nearAddress** y **consultationPrice** en su perfil (se cargan desde `/api/specialists/identifier/:address` en la pestaña Especialista). En el servidor deben estar configurados **CRON_SECRET** y **ESCROW_PRIVATE_KEY** (el release-now usa el mismo secret que el cron).
- Para volver al flujo con 24 h de espera, basta con dejar de llamar a `releaseConsultationNowAction` en el modal y usar solo el cron.
