"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavBar } from "@/components/NavBar";
import {
  Star,
  MapPin,
  Languages,
  CalendarCheck,
  Award,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";
import { RequestSecondOpinion } from "./RequestSecondOpinion";
import type { UiSpecialist } from "@/lib/marketplace/specialists";

export function SpecialistDetailView({ specialist }: { specialist: UiSpecialist }) {
  const t = useTranslations("marketplace");
  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-900">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-teal-200/40 via-sky-200/30 to-white blur-3xl" />
        <div className="absolute left-0 top-40 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-200/30 via-emerald-200/20 to-white blur-3xl" />
      </div>

      <div className="relative z-10">
        <NavBar />

        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("backToMarketplace")}
          </Link>

          {/* Specialist profile card */}
          <section className="mt-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-3 sm:w-36">
                <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-white shadow-md ring-1 ring-slate-100">
                  <img
                    src={specialist.image}
                    alt={specialist.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{specialist.rating.toFixed(1)}</span>
                  <span className="font-normal text-amber-600/80">
                    ({specialist.reviews} {t("reviews")})
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {specialist.name}
                  </h1>
                  {specialist.verified && (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-600"
                      title={t("verified")}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {specialist.specialty}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-slate-400" />
                    {specialist.experience} {t("yearsOfExperience")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Languages className="h-4 w-4 text-slate-400" />
                    {specialist.languages.join(", ")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {specialist.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4 text-slate-400" />
                    {t("availability")}: {specialist.availability}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialist.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {(specialist.licenseDocumentUrl || specialist.degreeDocumentUrl) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {specialist.licenseDocumentUrl && (
                      <a
                        href={specialist.licenseDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-sm font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {t("licenseDocument")}
                      </a>
                    )}
                    {specialist.degreeDocumentUrl && (
                      <a
                        href={specialist.degreeDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-sm font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {t("degreeDocument")}
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {specialist.priceUsdt}
                  </span>
                  <span className="text-sm font-medium text-slate-500">USDT</span>
                  <span className="ml-2 text-sm text-slate-500">
                    {t("perPanelReview")}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Send analyses & request second opinion */}
          <section className="mt-8">
            <RequestSecondOpinion
              specialistAccount={specialist.nearAddress || specialist.id}
              specialistName={specialist.name}
              priceUsdt={specialist.priceUsdt}
            />
          </section>

          {/* Security note */}
          <div className="mt-8 rounded-2xl border border-slate-200/60 bg-white/50 px-4 py-3 text-center backdrop-blur">
            <p className="text-xs text-slate-500">
              {t("securityNote")}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
