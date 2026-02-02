import { HeroUpload } from "@/components/veridoc/HeroUpload";
import { HomeLogin } from "@/components/HomeLogin";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-teal-200/50 via-sky-200/40 to-white blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-40 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-200/40 via-emerald-200/30 to-white blur-3xl" />
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-8 pt-8 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-teal-500 to-sky-500" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Veridoc</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <HomeLogin />
            <a
              href="#privacy"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900 md:inline-block"
            >
              How Privacy Works
            </a>
            <a
              href="#hero-upload"
              className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:inline-block"
            >
              Upload Blood Test
            </a>
          </div>
        </header>
        <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-20 sm:px-8 lg:px-10">
          <section className="grid items-center gap-12 pb-8 pt-4 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <span className="w-fit rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur">
                Privacy-first AI
              </span>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Private AI Insights for Your Blood Test Results
              </h1>
              <p className="text-lg leading-8 text-slate-600">
                Upload your blood diagnostics and receive secure, private
                explanations powered by medical-grade AI.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#hero-upload"
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upload Blood Test
                </a>
                <a
                  href="#privacy"
                  className="rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  How Privacy Works
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200">
                  Zero-knowledge inference
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200">
                  No data resale
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200">
                  Encrypted processing
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur">
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Start locally
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    Upload your lab report
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Begin the wizard with a quick upload. Nothing is sent to a
                    server.
                  </p>
                  <div className="mt-4">
                    <HeroUpload />
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-br from-teal-200/40 to-transparent blur-2xl" />
            </div>
          </section>

          <section className="grid gap-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                How it works
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Designed for clarity and privacy at every step, from upload to
                understanding.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Upload Diagnostics",
                  body: "Securely upload your blood test PDF or image.",
                },
                {
                  title: "Private AI Inference",
                  body: "AI analyzes results without storing or sharing raw data.",
                },
                {
                  title: "Clear Medical Insights",
                  body: "Understand markers, risks, and recommended actions.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur"
                >
                  <div className="mb-4 h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-sky-500/20" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="privacy"
            className="rounded-[32px] border border-slate-200/70 bg-white/70 p-8 shadow-sm backdrop-blur"
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Privacy &amp; security at the core
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Veridoc applies zero-knowledge inference principles so your
                  raw diagnostics stay in your control. We do not resell data,
                  and we do not train models on your personal medical records.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    "Local or encrypted processing language",
                    "Inference without exposure",
                    "No data resale or sharing",
                    "Built for medical confidentiality",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4"
                    >
                      <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12l4 4L19 7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4">
                {[
                  {
                    title: "Your data never leaves your control",
                    body: "Processing is designed around privacy-first handling and encrypted flows.",
                  },
                  {
                    title: "Inference without exposure",
                    body: "Only insights are returned, never raw diagnostics.",
                  },
                  {
                    title: "Built for medical confidentiality",
                    body: "Architecture aligned to compliance-ready environments.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-5"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                What you&#39;ll learn
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Receive clear explanations of common biomarkers and what they
                mean for your health decisions.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Cholesterol & lipid risks",
                "Inflammation markers",
                "Iron & vitamin deficiencies",
                "Red flags that require medical attention",
                "What&#39;s normal vs. what&#39;s not",
                "Next-step questions for your clinician",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-4 text-sm text-amber-700">
              Veridoc does not replace professional medical advice.
            </div>
          </section>

          <section className="grid gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Trust signals
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Designed with medical privacy in mind",
                "Built for compliance-ready environments",
                "Audits and certifications available upon request",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 text-sm text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[36px] border border-slate-200/70 bg-white/80 px-8 py-12 text-center shadow-sm backdrop-blur">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Understand Your Blood Tests — Privately.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Private AI explanations, clear next steps, and complete control of
              your diagnostics.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#hero-upload"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Upload Your Diagnostics
              </a>
              <button className="rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                Talk to a privacy specialist
              </button>
            </div>
          </section>

          <footer className="pb-10 text-xs text-slate-500">
            Veridoc is designed to support informed discussions with your
            clinician.
          </footer>
        </main>
      </div>
    </div>
  );
}
