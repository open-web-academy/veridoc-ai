"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import type { DiagnosisMode } from "@/lib/veridoc/localInference";
import { generateLocalRecommendation } from "@/lib/veridoc/localInference";
import { analyzeWithNearAI, type NearReport } from "@/app/actions/analyze-near";

 type StepResultsProps = {
   labsFile: File;
   diagnosisMode: DiagnosisMode;
   diagnosisFile: File | null;
   diagnosisText: string;
   formatBytes: (bytes: number) => string;
   onStartOver: () => void;
   onClearSession: () => void;
   onBack: () => void;
 };

 export const StepResults = ({
   labsFile,
   diagnosisMode,
   diagnosisFile,
   diagnosisText,
   formatBytes,
   onStartOver,
   onClearSession,
   onBack,
 }: StepResultsProps) => {
   const [nearLoading, setNearLoading] = useState(true);
   const [nearResult, setNearResult] = useState<{
     success: boolean;
     report?: NearReport;
     error?: string;
   } | null>(null);

   useEffect(() => {
     let cancelled = false;
     (async () => {
       setNearLoading(true);
       setNearResult(null);
       try {
         const response = await analyzeWithNearAI();
         if (!cancelled) setNearResult(response);
       } catch (err: unknown) {
         if (!cancelled) {
           setNearResult({
             success: false,
             error: err instanceof Error ? err.message : "Error al generar la recomendación",
           });
         }
       } finally {
         if (!cancelled) setNearLoading(false);
       }
     })();
     return () => { cancelled = true; };
   }, []);

   const localReport = useMemo(
     () =>
       generateLocalRecommendation({
         labsFile,
         diagnosisMode,
         diagnosisFile,
         diagnosisText,
       }),
     [labsFile, diagnosisMode, diagnosisFile, diagnosisText],
   );

   type DisplayReport = typeof localReport & { extraInfo?: string };
   const report: DisplayReport = nearResult?.success && nearResult.report
     ? {
         ...localReport,
         summary: nearResult.report.summary,
         keyItems: nearResult.report.keyItems.length > 0 ? nearResult.report.keyItems : localReport.keyItems,
         nextSteps: nearResult.report.nextSteps.length > 0 ? nearResult.report.nextSteps : localReport.nextSteps,
         questions: nearResult.report.questions.length > 0 ? nearResult.report.questions : localReport.questions,
         extraInfo: nearResult.report.extraInfo,
       }
     : localReport;

   const isUsingFallback = !nearLoading && (!nearResult?.success || !nearResult?.report);

   const handleDownload = () => {
     const doc = new jsPDF({ format: "a4", unit: "pt" });
     const pageW = doc.internal.pageSize.getWidth();
     const pageH = doc.internal.pageSize.getHeight();
     const marginPt = 55;
     const marginLeft = marginPt;
     const marginRight = marginPt;
     const marginTop = marginPt;
     const marginBottom = marginPt;
     const contentWidthPt = pageW - marginLeft - marginRight;
     const maxY = pageH - marginBottom;
     let y = marginTop;
     const lineHeight = 14;
     const fontSize = 11;

     const pushText = (text: string, opts?: { bold?: boolean; size?: number }) => {
       const size = opts?.size ?? fontSize;
       doc.setFontSize(size);
       doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
       const lines = doc.splitTextToSize(String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n"), contentWidthPt, { fontSize: size });
       for (let i = 0; i < lines.length; i++) {
         if (y + lineHeight > maxY) {
           doc.addPage();
           y = marginTop;
         }
         doc.text(lines[i], marginLeft, y);
         y += lineHeight;
       }
     };

     doc.setFontSize(18);
     doc.setFont("helvetica", "bold");
     if (y + lineHeight * 2 > maxY) {
       doc.addPage();
       y = marginTop;
     }
     doc.text("Veridoc AI", marginLeft, y);
     y += lineHeight * 2;

     doc.setFontSize(fontSize);
     doc.setFont("helvetica", "normal");
     pushText(report.summary);
     y += lineHeight;

     pushText("Key items to review:");
     report.keyItems.forEach((item) => pushText(`• ${item}`));
     y += lineHeight;

     pushText("Next steps:");
     report.nextSteps.forEach((item) => pushText(`• ${item}`));
     y += lineHeight;

     pushText("Questions to ask your clinician:");
     report.questions.forEach((item) => pushText(`• ${item}`));
     y += lineHeight;

     if (report.extraInfo) {
       pushText("Additional information:");
       pushText(report.extraInfo);
       y += lineHeight;
     }

     y += lineHeight;
     pushText(report.disclaimer, { bold: true });

     doc.save("veridoc-summary.pdf");
   };

   const diagnosisLabel =
     diagnosisMode === "file"
       ? diagnosisFile?.name || "Diagnosis file"
       : diagnosisMode === "text"
         ? "Diagnosis notes"
         : "No diagnosis";

  return (
    <section className="grid gap-6 pb-24 sm:pb-0">
      <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-6">
         <div className="flex flex-col gap-2">
           <h2 className="text-xl font-semibold text-slate-900">
             Recommendation report
           </h2>
           <p className="text-sm text-slate-600">
             Generated locally from your uploads. Nothing leaves your device.
           </p>
         </div>

         <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
             <div>
               <p className="text-xs text-slate-500">Lab file</p>
               <p className="font-semibold text-slate-900">{labsFile.name}</p>
               <p className="text-xs text-slate-500">
                 {labsFile.type || "Unknown type"} | {formatBytes(labsFile.size)}
               </p>
             </div>
             <div>
               <p className="text-xs text-slate-500">Diagnosis input</p>
               <p className="font-semibold text-slate-900">{diagnosisLabel}</p>
             </div>
           </div>
         </div>

         <div className="mt-6 grid gap-5">
           {nearLoading && !nearResult ? (
             <div
               className="flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-6 py-12"
               role="status"
               aria-live="polite"
               aria-label="Generating recommendation"
             >
               <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
               <div className="space-y-1 text-center">
                 <p className="text-sm font-semibold text-slate-700">
                   Preparing your recommendation…
                 </p>
                 <p className="text-xs text-slate-500 max-w-sm">
                   Analyzing your lab results. This usually takes a few seconds.
                 </p>
               </div>
               <p className="text-xs text-slate-400">Powered by NEAR AI · Private Inference</p>
             </div>
           ) : null}

           {(nearResult?.success && nearResult.report) || !nearLoading ? (
             <>
               {isUsingFallback ? (
                 <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
                   <p className="font-semibold">Recommendation could not be generated from your document.</p>
                   <p className="mt-1 text-xs text-amber-700">
                     Below is a general summary, not an analysis of your specific results. This can happen if the document text could not be extracted or the analysis service was unavailable. Try uploading again or check that the PDF has selectable text.
                   </p>
                   {nearResult && !nearResult.success && nearResult.error ? (
                     <p className="mt-2 text-xs font-medium text-amber-800">Details: {nearResult.error}</p>
                   ) : null}
                 </div>
               ) : null}
               <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
                 <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
                 <p className="mt-2 text-sm leading-7 text-slate-600">
                   {report.summary}
                 </p>
               </div>

               <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
                 <h3 className="text-sm font-semibold text-slate-900">
                   Key items to review
                 </h3>
                 <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                   {report.keyItems.map((item) => (
                     <li key={item}>{item}</li>
                   ))}
                 </ul>
               </div>

               <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
                 <h3 className="text-sm font-semibold text-slate-900">
                   Next steps &amp; questions
                 </h3>
                 <div className="mt-3 grid gap-4 sm:grid-cols-2">
                   <div>
                     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                       Next steps
                     </p>
                     <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
                       {report.nextSteps.map((item) => (
                         <li key={item}>{item}</li>
                       ))}
                     </ul>
                   </div>
                   <div>
                     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                       Questions to ask
                     </p>
                     <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
                       {report.questions.map((item) => (
                         <li key={item}>{item}</li>
                       ))}
                     </ul>
                   </div>
                 </div>
               </div>

               {report.extraInfo ? (
                 <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5">
                   <h3 className="text-sm font-semibold text-slate-900">
                     Additional information
                   </h3>
                   <div className="mt-2 text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                     {report.extraInfo}
                   </div>
                   <p className="mt-3 text-right text-xs text-slate-400">
                     Powered by NEAR AI · Private Inference
                   </p>
                 </div>
               ) : null}

               {nearResult?.success && !report.extraInfo ? (
                 <p className="text-right text-xs text-slate-400">
                   Powered by NEAR AI · Private Inference
                 </p>
               ) : null}
             </>
           ) : null}

           <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs text-amber-700">
             {report.disclaimer}
           </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Session actions
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 flex w-full items-center justify-center rounded-full bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Download summary (PDF)
            </button>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onStartOver}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={onClearSession}
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Clear session
              </button>
            </div>
          </div>
         </div>
       </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/70 bg-[#f5fbfb]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Back
          </button>
        </div>
      </div>
     </section>
   );
 };
