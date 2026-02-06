"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui";
import type { WalletSelector, AccountState } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";

interface WalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accountId: string | null;
  signMessage: (message: {
    message: string;
    recipient: string;
    nonce: Uint8Array | number[];
  }) => Promise<any>;
}

const WalletContext = createContext<WalletContextType>({
  selector: null,
  modal: null,
  accountId: null,
  signMessage: async () => {
    throw new Error("Wallet not initialized");
  },
});

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const initWallet = async () => {
      try {
        // Setup Meteor Wallet
        const meteorWallet = await setupMeteorWallet();

        // Setup Wallet Selector with only Meteor Wallet
        const walletSelector = await setupWalletSelector({
          network: "testnet",
          modules: [meteorWallet],
        });

        // Setup Modal UI
        const walletModal = setupModal(walletSelector, {
          contractId: "veridoc.testnet", // Replace with your contract ID if needed
        });

        setSelector(walletSelector);
        setModal(walletModal);

        // Get initial account state
        const accounts = walletSelector.store.getState().accounts;
        if (accounts.length > 0) {
          setAccountId(accounts[0].accountId);
        }

        // Listen for account changes
        const subscription = walletSelector.store.observable.subscribe((state) => {
          const accounts = state.accounts;
          if (accounts.length > 0) {
            setAccountId(accounts[0].accountId);
          } else {
            setAccountId(null);
          }
        });

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
      }
    };

    initWallet();
  }, []);

  const signMessage = async (message: {
    message: string;
    recipient: string;
    nonce: Uint8Array | number[];
  }) => {
    if (!selector) {
      throw new Error("Wallet selector not initialized");
    }

    const wallet = await selector.wallet();
    if (!wallet) {
      throw new Error("No wallet connected");
    }

    // Check if wallet supports signMessage (NEP-413)
    if (typeof wallet.signMessage !== "function") {
      throw new Error("Wallet does not support signMessage");
    }

    // Convert nonce to Uint8Array if it's an array
    const nonceBytes =
      message.nonce instanceof Uint8Array
        ? message.nonce
        : Uint8Array.from(message.nonce);

    // Sign the message
    const signedMessage = await wallet.signMessage({
      message: message.message,
      recipient: message.recipient,
      nonce: nonceBytes,
    });

    return signedMessage;
  };

  return (
    <WalletContext.Provider
      value={{
        selector,
        modal,
        accountId,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
