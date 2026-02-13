"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { HomeLogin } from "@/components/HomeLogin";
import { LanguageSelector } from "@/components/LanguageSelector";

/** z-index for mobile menu overlay and drawer so they sit above page content (portaled to body) */
const MOBILE_MENU_LAYER = 9999;

export type NavBarProps = {
  /** When provided (e.g. in wizard), shown on the left instead of only logo */
  leftSlot?: React.ReactNode;
  /** When "wizard", primary CTA becomes "Clear session" and calls onClearSession */
  variant?: "default" | "wizard";
  onClearSession?: () => void;
};

const MAIN_NAV = [
  { href: "/marketplace", labelKey: "marketplace" as const },
  { href: "/analisis", labelKey: "analisis" as const },
] as const;

export function NavBar({
  leftSlot,
  variant = "default",
  onClearSession,
}: NavBarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);

  const isWizard = pathname === "/veridoc";

  const navItems = MAIN_NAV.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
  }));

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, closeMenu]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus trap in drawer (a11y): keep focus inside while open; focus close button first
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const el = drawerRef.current;
    const focusables = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex="0"]'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first) return;
    first.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const ctaHref = "/veridoc";
  const ctaLabel = isWizard ? t("clearSession") : t("start");

  const ctaButton =
    variant === "wizard" && onClearSession ? (
      <button
        type="button"
        onClick={onClearSession}
        className="shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:bg-slate-700 min-h-[44px] inline-flex items-center justify-center"
      >
        {ctaLabel}
      </button>
    ) : (
      <Link
        href={ctaHref}
        className="shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:bg-slate-700 min-h-[44px] inline-flex items-center justify-center"
      >
        {ctaLabel}
      </Link>
    );

  return (
    <header
      className="relative z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur pt-[env(safe-area-inset-top,0px)]"
      role="banner"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 sm:min-h-16">
        {/* Mobile-first: left = slot or logo */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leftSlot != null ? (
            leftSlot
          ) : (
            <Link
              href="/"
              className="flex shrink-0 items-center rounded-lg py-2 outline-offset-2 focus:outline focus:ring-2 focus:ring-slate-400 min-h-[44px] sm:min-h-0 sm:py-2"
              aria-label={t("veridocHome")}
            >
              <Image
                src="/veridoc-logo.png"
                alt="Veridoc"
                width={120}
                height={48}
                className="h-10 w-auto object-contain sm:h-12"
                priority
              />
            </Link>
          )}
        </div>

        {/* Mobile: CTA + hamburger (visible by default) */}
        <div className="flex items-center gap-2 md:hidden">
          {ctaButton}
          <button
            type="button"
            onClick={toggleMenu}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
            aria-expanded={open}
            aria-controls="main-nav-menu"
            aria-label={open ? t("closeMenu") : t("openMenu")}
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Desktop: nav + language + auth + CTA (hidden on mobile, shown from md) */}
        <nav
          className="hidden md:flex md:items-center md:gap-1"
          aria-label={t("mainMenu")}
        >
          <LanguageSelector />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 min-h-[44px] inline-flex items-center"
            >
              {item.label}
            </Link>
          ))}
          <div className="mx-2 h-8 w-px bg-slate-200" aria-hidden />
          <HomeLogin variant="inline" showHelpInHeader={false} />
          {variant === "wizard" && onClearSession ? (
            <button
              type="button"
              onClick={onClearSession}
              className="ml-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 min-h-[44px] inline-flex items-center"
            >
              {ctaLabel}
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="ml-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 min-h-[44px] inline-flex items-center"
            >
              {ctaLabel}
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile drawer: portaled to body so it isn't clipped by parent overflow/transform */}
      {mounted &&
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm md:hidden"
              style={{ zIndex: MOBILE_MENU_LAYER }}
              aria-hidden
              onClick={closeMenu}
            />
            <nav
              ref={drawerRef}
              id="main-nav-menu"
              role="dialog"
              aria-modal="true"
              aria-label={t("mainMenu")}
              className="fixed right-0 top-0 flex h-full w-full max-w-[min(100vw,20rem)] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl md:hidden pt-[env(safe-area-inset-top,0px)]"
              style={{ zIndex: MOBILE_MENU_LAYER + 1 }}
            >
              {/* Header: clear close button (best practice: primary dismiss at top) */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">
                  {t("mainMenu")}
                </span>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
                  aria-label={t("closeMenu")}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{tCommon("close")}</span>
                </button>
              </div>

              <div className="flex flex-1 flex-col px-4 py-5">
                {/* Primary: main nav links */}
                <div className="flex flex-col gap-0.5">
                  {navItems.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMenu}
                      className="flex min-h-[48px] items-center rounded-xl px-4 py-3 text-base font-medium text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Secondary: language */}
                <div className="mt-6">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {tCommon("language")}
                  </p>
                  <div className="rounded-xl bg-slate-50/80 px-4 py-3">
                    <LanguageSelector />
                  </div>
                </div>

                {/* Account: login / profile at bottom (familiar pattern) */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("account")}
                  </p>
                  <HomeLogin variant="stacked" />
                </div>
              </div>
            </nav>
          </>,
          document.body
        )}
    </header>
  );
}
