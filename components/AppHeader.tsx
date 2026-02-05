"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { HomeLogin } from "@/components/HomeLogin";

const navItems = [
  { href: "#privacy", label: "How Privacy Works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "#hero-upload", label: "Upload" },
] as const;

export function AppHeader() {
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, closeMenu]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-4 pt-4 sm:px-8 sm:pb-6 sm:pt-6 lg:px-10 md:pb-8 md:pt-8">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 rounded-lg outline-offset-2 focus:outline focus:ring-2 focus:ring-slate-400"
        aria-label="Veridoc home"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm ring-1 ring-slate-200/70 backdrop-blur sm:h-10 sm:w-10 sm:rounded-2xl">
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-teal-500 to-sky-500 sm:h-4 sm:w-4" />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          Veridoc
        </span>
      </Link>

      {/* Desktop nav + auth */}
      <nav className="hidden items-center md:flex" aria-label="Main">
        <div className="flex items-center gap-0.5">
          <a
            href="#privacy"
            className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            How Privacy Works
          </a>
          <a
            href="/marketplace"
            className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Marketplace
          </a>
        </div>
        <div className="ml-1 flex h-9 shrink-0 items-center border-l border-slate-200 pl-3">
          <HomeLogin variant="inline" showHelpInHeader={false} />
        </div>
        <a
          href="#hero-upload"
          className="ml-1 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Upload
        </a>
      </nav>

      {/* Mobile: CTA + hamburger */}
      <div className="flex items-center gap-2 md:hidden">
        <a
          href="#hero-upload"
          className="min-h-[44px] shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
        >
          Upload
        </a>
        <button
          type="button"
          onClick={toggleMenu}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          aria-expanded={open}
          aria-controls="app-header-menu"
          aria-label={open ? "Close menu" : "Open menu"}
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

      {/* Mobile menu overlay + panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={closeMenu}
          />
          <nav
            id="app-header-menu"
            role="dialog"
            aria-label="Main menu"
            className="fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-slate-200/80 bg-[#f6fbfb] px-6 py-8 shadow-2xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="min-h-[48px] rounded-xl px-4 py-3 text-base font-medium text-slate-800 transition hover:bg-white hover:shadow-sm"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Account
              </p>
              <HomeLogin variant="stacked" />
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
