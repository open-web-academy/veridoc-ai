import type { NextConfig } from "next";

const WALLET_ORIGIN = "https://wallet.web3authn.org";

// Headers required for Tatchi wallet iframe (Permissions-Policy + CSP).
// See @tatchi-xyz/sdk/plugins/next and https://tatchi.xyz/docs/getting-started/installation
function tatchiHeaders(): { key: string; value: string }[] {
  const permissions = [
    `publickey-credentials-get=(self "${WALLET_ORIGIN}")`,
    `publickey-credentials-create=(self "${WALLET_ORIGIN}")`,
    `clipboard-read=(self "${WALLET_ORIGIN}")`,
    `clipboard-write=(self "${WALLET_ORIGIN}")`,
  ].join(", ");
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    `frame-src 'self' ${WALLET_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  return [
    { key: "Permissions-Policy", value: permissions },
    { key: "Content-Security-Policy", value: csp },
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: tatchiHeaders(),
      },
    ];
  },
};

export default nextConfig;
