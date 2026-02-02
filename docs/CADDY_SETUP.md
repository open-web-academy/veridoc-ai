# Caddy para HTTPS local (Veridoc / Tatchi)

WebAuthn (passkeys) exige contexto seguro (HTTPS). Caddy proporciona TLS local con certificados de confianza para desarrollo.

## 1. Instalar Caddy

**macOS (Homebrew):**

```bash
brew install caddy
```

Si Homebrew da error de permisos:

```bash
sudo chown -R $(whoami) /opt/homebrew /opt/homebrew/Cellar /opt/homebrew/Frameworks /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/opt /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var
brew install caddy
```

**Otras plataformas:** [caddyserver.com/docs/install](https://caddyserver.com/docs/install)

## 2. Confiar en la CA local (una vez)

**Caddy tiene que estar corriendo** para que `caddy trust` funcione (usa la API de administración en el puerto 2019).

**Terminal 1 – arrancar Caddy:**

```bash
caddy run --config Caddyfile --adapter caddyfile
```

**Terminal 2 – instalar la CA local:**

```bash
caddy trust
```

Cuando termine, puedes parar Caddy (Ctrl+C en la Terminal 1). Solo hace falta ejecutar `caddy trust` una vez por máquina.

## 3. Usar HTTPS en desarrollo

**Terminal 1 – Next.js:**

```bash
npm run dev
```

**Terminal 2 – Caddy:**

```bash
caddy run --config Caddyfile --adapter caddyfile
```

O desde la raíz del proyecto:

```bash
npm run dev:https
```

**Abrir en el navegador:** [https://veridoc.localhost](https://veridoc.localhost)

No uses `http://localhost:3000` para flujos con passkey; usa siempre `https://veridoc.localhost` para que Touch ID / Face ID funcionen correctamente.

---

## Después de `caddy trust`: flujo diario

Cuando ya hayas ejecutado `caddy trust` una vez, cada vez que quieras desarrollar con HTTPS:

1. **Terminal 1** – en la raíz del proyecto:
   ```bash
   npm run dev
   ```

2. **Terminal 2** – en la misma raíz:
   ```bash
   npm run dev:https
   ```
   (o `caddy run --config Caddyfile --adapter caddyfile`)

3. **Navegador** – abre:
   ```
   https://veridoc.localhost
   ```

4. En la home: **Create account** o **Sign in** con passkey (Touch ID / Face ID). Completa el paso biométrico cuando lo pida el modal.
