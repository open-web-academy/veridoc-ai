"use client";

import { useCallback, useEffect, useState } from "react";
import { useTatchi } from "@tatchi-xyz/sdk/react";

/** Map SDK / WebAuthn errors to user-friendly messages */
function toUserMessage(raw: string | undefined): string {
  if (!raw) return "Something went wrong. Please try again.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("missing registration credential") ||
    lower.includes("missing credential from registration")
  ) {
    return "Registration was cancelled or the passkey step didn’t complete. Please try again and complete Touch ID / Face ID when prompted.";
  }
  if (lower.includes("user rejected") || lower.includes("cancel")) {
    return "You cancelled. Try again when you’re ready.";
  }
  if (lower.includes("not allowed") || lower.includes("security")) {
    return "Passkey wasn’t allowed. Use HTTPS and complete the biometric step in the popup.";
  }
  return raw;
}

type HomeLoginVariant = "inline" | "stacked";

export function HomeLogin({
  variant = "inline",
  showHelpInHeader = true,
}: {
  variant?: HomeLoginVariant;
  /** When false (e.g. in header), hide "No account yet" and error so layout stays one row */
  showHelpInHeader?: boolean;
}) {
  const {
    loginState,
    registerPasskey,
    loginAndCreateSession,
    logout,
    walletIframeConnected,
    accountInputState,
    refreshAccountData,
    tatchi,
  } = useTatchi();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshAccountData();
  }, [refreshAccountData]);

  const handleRegister = useCallback(() => {
    setError(null);
    setBusy(true);
    const contractId = tatchi.configs?.contractId ?? "w3a-v1.testnet";
    const accountId = `veridoc-${Date.now()}.${contractId}`;
    registerPasskey(accountId, {
      onEvent: (event) => {
        if (event.phase === "error" || (event as { status?: string }).status === "error") {
          setError(toUserMessage((event as { message?: string }).message));
        }
      },
    })
      .then((res) => {
        if (!res.success) setError(toUserMessage(res.error));
      })
      .catch((err) => setError(toUserMessage(err?.message)))
      .finally(() => setBusy(false));
  }, [registerPasskey, tatchi.configs?.contractId]);

  const handleLogin = useCallback(() => {
    setError(null);
    const accountId =
      accountInputState.lastLoggedInUsername ||
      accountInputState.indexDBAccounts?.[0] ||
      accountInputState.targetAccountId;
    if (!accountId) {
      setError("Create an account first, or enter your account name.");
      return;
    }
    setBusy(true);
    loginAndCreateSession(accountId, {
      onEvent: (event) => {
        const e = event as { phase?: string; status?: string; message?: string };
        if (e.phase === "login-error" || e.status === "error") {
          setError(e.message ?? "Login failed");
        }
      },
    })
      .then((res) => {
        if (!res.success) setError(toUserMessage(res.error));
      })
      .catch((err) => setError(toUserMessage(err?.message)))
      .finally(() => setBusy(false));
  }, [loginAndCreateSession, accountInputState]);

  const handleLogout = useCallback(() => {
    setError(null);
    logout();
  }, [logout]);

  const isStacked = variant === "stacked";

  if (!walletIframeConnected) {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-500 ${isStacked ? "w-full justify-center" : ""}`}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Connecting…
      </div>
    );
  }

  if (loginState.isLoggedIn && loginState.nearAccountId) {
    return (
      <div
        className={`flex items-center gap-3 ${isStacked ? "w-full flex-col" : ""}`}
      >
        <span
          className={`max-w-[140px] truncate rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200/70 sm:max-w-[200px] ${isStacked ? "w-full max-w-none text-center" : ""}`}
        >
          {loginState.nearAccountId}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className={`rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 ${isStacked ? "w-full min-h-[44px]" : ""}`}
        >
          Sign out
        </button>
      </div>
    );
  }

  const showHelp = showHelpInHeader || isStacked;

  return (
    <div
      className={
        isStacked
          ? "flex w-full flex-col items-stretch gap-2"
          : "flex flex-col items-end gap-1"
      }
    >
      <div
        className={`flex shrink-0 gap-2 ${isStacked ? "flex-col" : "flex-row flex-nowrap items-center"}`}
      >
        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          className={`rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 ${isStacked ? "min-h-[44px] w-full" : ""}`}
        >
          {busy ? "…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={handleRegister}
          disabled={busy}
          className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 ${isStacked ? "min-h-[44px] w-full" : ""}`}
        >
          {busy ? "…" : "Create account"}
        </button>
      </div>
      {showHelp && accountInputState.indexDBAccounts?.length === 0 && (
        <p
          className={`text-xs text-slate-500 ${isStacked ? "text-center" : "text-right"}`}
        >
          No account yet. Click &quot;Create account&quot; to use passkey.
        </p>
      )}
      {showHelp && error && (
        <p
          className={`max-w-[280px] text-xs text-red-600 ${isStacked ? "w-full text-center" : "text-right"}`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
