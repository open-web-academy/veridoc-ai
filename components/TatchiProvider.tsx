"use client";

import { TatchiPasskeyProvider } from "@tatchi-xyz/sdk/react/provider";

const WALLET_ORIGIN = "https://wallet.web3authn.org";
const RELAY_URL = "https://relay.tatchi.xyz";

export function TatchiProvider({ children }: { children: React.ReactNode }) {
  return (
    <TatchiPasskeyProvider
      config={{
        iframeWallet: {
          walletOrigin: WALLET_ORIGIN,
        },
        relayer: {
          url: RELAY_URL,
        },
      }}
      eager={false}
    >
      {children}
    </TatchiPasskeyProvider>
  );
}
