"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePrivy, useLogin, useLoginWithOAuth } from "@privy-io/react-auth";
import { LogOut, Copy, Fingerprint, Mail, Wallet } from "lucide-react";
import { useNEAR } from "@/context/NearContext";
import { getUsdtBalance, formatUsdtBalance } from "@/lib/near-usdt";

/** Same style as "Continue with Google" – bordered card with icon + label */
const loginButtonClass =
  "flex w-full min-h-[48px] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type HomeLoginVariant = "inline" | "stacked";

/** Returns a short display label for the logged-in user (email, wallet, or id) */
function getUserDisplayName(user: { id?: string; email?: { address?: string }; wallet?: { address?: string } } | null): string {
  if (!user) return "";
  const email = user.email?.address;
  if (email) return email.length > 20 ? `${email.slice(0, 18)}…` : email;
  const addr = user.wallet?.address;
  if (addr) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return user.id ? `User ${user.id.slice(0, 8)}…` : "Signed in";
}

/** Text to copy (wallet, email, or id) */
function getCopyableText(user: { id?: string; email?: { address?: string }; wallet?: { address?: string } } | null): string {
  if (!user) return "";
  return user.wallet?.address ?? user.email?.address ?? user.id ?? "";
}

export function HomeLogin({
  variant = "inline",
  showHelpInHeader = true,
}: {
  variant?: HomeLoginVariant;
  showHelpInHeader?: boolean;
}) {
  const t = useTranslations("homeLogin");
  const { ready, authenticated, user, logout } = usePrivy();
  const { walletId, isLoading: nearLoading, createNearWallet } = useNEAR();
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (!walletId) {
      setUsdtBalance(null);
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    getUsdtBalance(walletId)
      .then((raw) => {
        if (!cancelled) setUsdtBalance(formatUsdtBalance(raw));
      })
      .catch(() => {
        if (!cancelled) setUsdtBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletId]);

  const { login } = useLogin({
    onError: (error) => {
      setError(error != null ? String(error) : t("loginFailed"));
    },
  });
  const { initOAuth } = useLoginWithOAuth({
    onError: (error) => setError(error != null ? String(error) : t("googleLoginFailed")),
  });

  const [error, setError] = useState<string | null>(null);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLoginOptions) return;
    const close = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowLoginOptions(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showLoginOptions]);

  const openLoginOptions = useCallback(() => {
    setError(null);
    setShowLoginOptions((v) => !v);
  }, []);

  const runPasskey = useCallback(() => {
    setShowLoginOptions(false);
    login({ loginMethods: ["passkey"] });
  }, [login]);

  const runGoogle = useCallback(() => {
    setShowLoginOptions(false);
    initOAuth({ provider: "google" });
  }, [initOAuth]);

  const runEmail = useCallback(() => {
    setShowLoginOptions(false);
    login({ loginMethods: ["email"] });
  }, [login]);

  const runWallet = useCallback(() => {
    setShowLoginOptions(false);
    login({ loginMethods: ["wallet"] });
  }, [login]);

  const handleLogout = useCallback(() => {
    setError(null);
    logout();
  }, [logout]);

  const handleCopy = useCallback(() => {
    const text = user ? getCopyableText(user) : "";
    if (text) navigator.clipboard.writeText(text).catch(() => {});
  }, [user]);

  const isStacked = variant === "stacked";
  const copyable = user ? getCopyableText(user) : "";

  if (!ready) {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-500 ${isStacked ? "w-full justify-center" : ""}`}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Connecting…
      </div>
    );
  }

  if (authenticated && user) {
    const showNearWallet = !!walletId;
    const balanceDisplay =
      balanceLoading && showNearWallet
        ? "…"
        : usdtBalance != null && showNearWallet
          ? `${usdtBalance} USDT`
          : showNearWallet
            ? "0.00 USDT"
            : null;

    return (
      <div
        className={`flex items-center gap-2 ${isStacked ? "w-full flex-col" : ""}`}
      >
        {showNearWallet && (
          <span
            className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-200/60"
            title="USDT en NEAR Intents"
          >
            {balanceDisplay}
          </span>
        )}
        {!showNearWallet && !nearLoading && (
          <button
            type="button"
            onClick={() => createNearWallet()}
            className="shrink-0 rounded-md bg-teal-100 px-2.5 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-200"
          >
            {t("retryNearWallet")}
          </button>
        )}
        {nearLoading && <span className="text-xs text-slate-500">{t("creatingNearWallet")}</span>}
        <Link
          href="/profile"
          className={`max-w-[120px] truncate rounded-md bg-slate-100/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-800 sm:max-w-[160px] ${isStacked ? "w-full max-w-none text-center" : ""}`}
          title={t("goToProfile")}
        >
          {getUserDisplayName(user)}
        </Link>
        {copyable ? (
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("copyAddress")}
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={t("logout")}
        >
          <LogOut className="h-4 w-4" />
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
      ref={optionsRef}
    >
      <div
        className={`relative flex shrink-0 gap-2 ${isStacked ? "flex-col" : "flex-row flex-nowrap items-center"}`}
      >
        <button
          type="button"
          onClick={openLoginOptions}
          className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 ${isStacked ? "min-h-[44px] w-full" : ""}`}
        >
          Log in
        </button>
        {showLoginOptions && (
          <div
            className={`absolute top-full z-50 mt-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ${isStacked ? "w-full" : "min-w-[240px] right-0"}`}
            role="menu"
            aria-label="Choose login method"
          >
            <button
              type="button"
              className={loginButtonClass}
              onClick={runPasskey}
              role="menuitem"
            >
              <Fingerprint className="h-5 w-5 shrink-0 text-slate-600" />
              Continue with Passkey
            </button>
            <button
              type="button"
              className={loginButtonClass}
              onClick={runEmail}
              role="menuitem"
            >
              <Mail className="h-5 w-5 shrink-0 text-slate-600" />
              Continue with Email
            </button>
            <button
              type="button"
              className={loginButtonClass}
              onClick={runGoogle}
              role="menuitem"
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              Continue with Google
            </button>
            <button
              type="button"
              className={loginButtonClass}
              onClick={runWallet}
              role="menuitem"
            >
              <Wallet className="h-5 w-5 shrink-0 text-slate-600" />
              Continue with Wallet
            </button>
          </div>
        )}
      </div>
      {showHelp && (
        <p
          className={`text-xs text-slate-500 ${isStacked ? "text-center" : "text-right"}`}
        >
          Sign in with passkey, email, Google, or wallet.
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
