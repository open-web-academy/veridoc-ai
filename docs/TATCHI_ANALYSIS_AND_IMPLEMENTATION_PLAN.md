# Análisis Tatchi Passkey SDK y Plan de Implementación

**Documento CTO · Veridoc AI**  
**Fecha:** Febrero 2025  
**Referencia:** [Tatchi Docs](https://tatchi.xyz/docs/getting-started/installation)

---

## 1. Resumen ejecutivo

**Tatchi** es un SDK de wallet embebido, **serverless** y **self-custody**, construido sobre **Passkeys (WebAuthn)** y la blockchain **NEAR**. Permite registrar y autenticar usuarios con biometría (TouchID/FaceID) y firmar transacciones onchain sin backend propio ni custodios centralizados.

Para Veridoc, integrar Tatchi puede aportar **identidad verificable**, **ownership de datos** y eventualmente **pagos o incentivos** en NEAR, siempre que el producto tenga un caso de uso claro para blockchain/wallet.

---

## 2. Qué hace Tatchi (funcionalidad)

### 2.1 Propuesta de valor

| Área | Descripción |
|------|-------------|
| **Auth sin backend** | WebAuthn se ejecuta contra un **smart contract en NEAR**, no contra tus servidores. Cero almacenamiento de credenciales en tu infra. |
| **Claves derivadas de passkeys** | Las claves de firma se derivan de forma determinística desde el passkey (PRF). El usuario no ve ni gestiona seeds/mnemonics. |
| **Firma en iframe aislado** | WebAuthn, PRF, VRF y firma ocurren en un **iframe de otro origen** (`wallet.web3authn.org` o self-hosted). Tu app solo envía mensajes tipados y recibe respuestas; no toca secretos. |
| **Recuperación y portabilidad** | Múltiples dispositivos pueden vincularse al mismo wallet (QR). Passkeys pueden vivir en iCloud/Google/Bitwarden. Los autenticadores se registran onchain. |

### 2.2 Flujos principales

1. **Registro (Registration)**  
   - Usuario ejecuta `registerPasskey(accountId, options)` desde un **gesto de usuario** (ej. click).  
   - WebAuthn crea el passkey (PRF.first + PRF.second).  
   - Worker VRF deriva claves determinísticas (VRF/NEAR); worker Signer sella y firma la tx de registro.  
   - Contrato verifica prueba VRF + registro WebAuthn de forma atómica.  
   - Vault cifrado (y metadatos) se guardan en IndexedDB del origen del wallet; tu app nunca ve datos en claro.

2. **Login (Session unlock)**  
   - **Modo principal:** Shamir 3-pass con relay + dispositivo; un solo prompt TouchID.  
   - **Modo recuperación:** PRF.second (alta fricción, se zeroiza).  
   - Opcional: emitir **JWT** para usar la sesión en auth web2.

3. **Transacciones**  
   - App prepara intención → wallet valida, pide nonce/block hash, calcula digest canónico.  
   - Un solo prompt biométrico por tx.  
   - Firma en worker Signer; broadcast vía RPC NEAR.

### 2.3 Arquitectura de seguridad (resumen)

- **Origen del wallet** distinto al de la app → mismo origen no puede leer storage/workers del iframe.  
- **Workers WASM:** VRF worker (WebAuthn, Shamir, derivación) y Signer worker (KEK, descifrado, firma). Secretos no pasan por el main thread.  
- **Headers:** CSP estricta, Permissions-Policy para delegar WebAuthn al iframe.  
- **Confirmación:** El botón de confirmación real está en el origen del wallet; la app no puede suplantarlo.

**Trade-off explícito:** se confía en el runtime del wallet (código del origen + navegador/OS). No protege frente a malware en el endpoint ni a extensiones maliciosas con acceso al origen del wallet (hay ruta opcional con extensión para endurecer).

---

## 3. Encaje con Veridoc AI

### 3.1 Estado actual del producto

- Next.js 16, React 19, flujo tipo wizard (subida de labs → diagnóstico → resultados).  
- Sesión “ligera” vía `sessionStore` (archivo pendiente en memoria).  
- Sin auth ni identidad persistente; sin blockchain ni pagos.

### 3.2 Casos de uso posibles con Tatchi

| Caso de uso | Descripción | Prioridad típica |
|-------------|-------------|-------------------|
| **Identidad persistente** | Mismo usuario en varios dispositivos sin email/password. | Alta si quieres historial o multi-device. |
| **Ownership de resultados** | Vincular informes/insights a una wallet NEAR (prueba de “este usuario generó este resultado”). | Media/alta si apuestas por portabilidad o compliance. |
| **Pagos o incentivos** | Pagar por informes, premium, o recompensas en NEAR. | Depende del modelo de negocio. |
| **Firma de consentimiento** | Consentimiento informado firmado onchain (auditable). | Útil en contexto médico/legal. |

### 3.3 Cuándo no tiene sentido

- Si solo necesitas “login con passkey” sin blockchain: soluciones tipo Hanko, Stytch o WebAuthn puro pueden ser más simples.  
- Si no tienes plan de usar NEAR (producto, tokens, governance): añades complejidad y dependencia sin beneficio claro.

---

## 4. Requisitos técnicos y riesgos

### 4.1 Stack y dependencias

- **Framework:** La doc oficial muestra **Vite** (`tatchiAppServer`, `tatchiBuildHeaders`). Next.js aparece en la navegación; hay que confirmar si existe plugin oficial para Next o hay que replicar headers a mano.  
- **HTTPS obligatorio:** WebAuthn exige contexto seguro. En local: Caddy (o similar) con TLS interno.  
- **Navegadores:** Safari tiene restricciones con WebAuthn cross-origin; puede hacer falta dominio en allowlist del contrato o self-host del wallet.

### 4.2 Riesgos (vista CTO)

| Riesgo | Mitigación |
|--------|------------|
| **Dependencia de NEAR** | Contrato y relay son parte del modelo. Si NEAR cambia o el servicio se depreca, hay que tener plan B (self-host, otro L1). |
| **Complejidad crypto/UX** | Flujos (registro, login, recovery) deben explicarse bien; un solo “Register with Passkey” puede no ser suficiente para usuarios no crypto. |
| **Headers y CSP en Next** | Next no usa Vite; habrá que configurar headers (y si aplica middleware) para el origen del wallet. Verificar compatibilidad con App Router y edge. |
| **Safari / cross-origin** | Validar en Safari desde día uno; tener claro si usamos wallet alojado o self-hosted para evitar bloqueos. |

---

## 5. Plan de implementación (en fases)

### Fase 0: Decisión y alcance (1–2 días)

- [ ] Definir **objetivo de negocio** concreto: solo identidad, ownership de datos, pagos, firma de consentimiento, o combinación.  
- [ ] Decisión: **wallet alojado** (`wallet.web3authn.org`) vs **self-hosted** (más control, más ops).  
- [ ] Confirmar en docs o con soporte Tatchi: **plugins/guía para Next.js** (headers, CSP, Permissions-Policy).  
- [ ] Crear **POC en rama** separada para no bloquear el flujo actual de Veridoc.

**Criterio de go:** Documento de alcance firmado y POC técnico viable (registro + login en dev con HTTPS).

---

### Fase 1: Entorno y SDK (3–5 días)

1. **Dependencias**
   - Añadir `@tatchi-xyz/sdk`.
   - Opcional: `jsqr` + `qrcode` si más adelante se usa device linking.

2. **HTTPS en desarrollo**
   - Caddy (o equivalente) con `tls internal` y dominio tipo `veridoc.localhost`.  
   - Todo el flujo Tatchi probado bajo HTTPS.

3. **Next.js**
   - Si existe plugin Next en el SDK: integrarlo según documentación.  
   - Si no: configurar en `next.config.ts` (o middleware) los headers necesarios para el wallet origin:
     - `Permissions-Policy: publickey-credentials-get, publickey-credentials-create` (y atributos `allow` en iframe).
     - CSP compatible con el iframe del wallet (sin bloquear scripts del origen del wallet).  
   - Revisar que no se rompa el resto de la app (Tailwind, rutas, etc.).

4. **Provider React**
   - Envolver la app (o solo la zona Veridoc) con `TatchiPasskeyProvider`:
     - `iframeWallet.walletOrigin`: URL del wallet (hosted o self-hosted).  
     - `relayer.url`: p.ej. `https://relay.tatchi.xyz`.  
   - Garantizar que los flujos (registro/login) se disparen desde **gestos de usuario** (onClick), no desde `useEffect` o timers.

**Entregables:** App Next en local con HTTPS; provider montado; registro y login de prueba funcionando en Chrome (y documentado si en Safari hay limitaciones).

---

### Fase 2: Integración con flujo Veridoc (5–8 días)

1. **Modelo de identidad**
   - Decidir qué se asocia a la wallet: solo “usuario anónimo con passkey” o también email/alias para soporte.  
   - Definir si hay “cuenta” en backend (si lo hay) vinculada por `accountId` NEAR o por JWT emitido tras login.

2. **UX**
   - Pantalla o modal “Iniciar sesión / Registrarse con Passkey” accesible desde el wizard o header.  
   - Estados: no autenticado, registrando, logueado, error, recuperación.  
   - Mensajes claros para usuario no técnico (evitar jerga “wallet”, “NEAR” si no aporta).

3. **Persistencia**
   - Si se usa JWT: almacenamiento (cookie httpOnly o memoria) y renovación.  
   - Si no hay backend: sesión solo en cliente; al cerrar pestaña se pierde hasta nuevo login (comportamiento a documentar).

4. **Protección de rutas o pasos**
   - Opcional: exigir login con Tatchi para ver resultados o para “guardar” informe.  
   - No bloquear el flujo actual de subida/diagnóstico hasta que el producto lo requiera.

**Entregables:** Usuario puede registrarse y loguearse con Passkey en Veridoc; estado de sesión visible; criterios de aceptación de producto cumplidos.

---

### Fase 3: Ownership y transacciones (opcional, 1–2 sprints)

- **Ownership de resultados:** Almacenar en tu sistema (o onchain) la relación `accountId NEAR ↔ informe_id` (o hash del informe).  
- **Firma de consentimiento:** Si aplica, flujo que termina en `tatchi.signTransaction(...)` con payload de consentimiento.  
- **Pagos:** Integrar llamadas a contrato o token en NEAR según diseño económico.

Queda fuera del alcance de este plan detallado; se especifica en backlog cuando el negocio lo priorice.

---

### Fase 4: Producción y observabilidad (continuo)

- **Dominio y TLS:** Producción ya debe ser HTTPS; verificar que el dominio esté allowlisted en el contrato WebAuthn si usas wallet alojado (sobre todo Safari).  
- **Monitoring:** Errores de registro/login, fallos de relay, tiempo de respuesta del iframe.  
- **Recovery y soporte:** Documentar recuperación (PRF.second, device linking) para soporte y usuarios avanzados.

---

## 6. Checklist CTO antes de comprometer

- [ ] **Objetivo de negocio** escrito y alineado con el uso de NEAR/Tatchi.  
- [ ] **Alternativas consideradas** (passkeys sin blockchain, otros wallets) con pros/cons.  
- [ ] **Compatibilidad Next.js** confirmada (headers, App Router, edge si aplica).  
- [ ] **Safari** probado y limitaciones documentadas.  
- [ ] **Coste de relay y NEAR** estimado (gas, uso de relay si es de pago).  
- [ ] **Plan de salida:** qué pasa si Tatchi o NEAR dejan de ser viables (self-host, migración de usuarios).  
- [ ] **Seguridad:** revisión de headers (CSP, Permissions-Policy) y de que no se expone ningún secreto al origen de la app.

---

## 7. Referencias

- [Tatchi – Overview](https://tatchi.xyz/docs/getting-started/overview)  
- [Tatchi – Installation](https://tatchi.xyz/docs/getting-started/installation)  
- [Tatchi – Architecture](https://tatchi.xyz/docs/concepts/architecture)  
- [Tatchi – Security Model](https://tatchi.xyz/docs/concepts/security-model)  
- [NEAR](https://github.com/near)

---

*Documento vivo: actualizar al confirmar soporte Next.js y tras cada hito de implementación.*
