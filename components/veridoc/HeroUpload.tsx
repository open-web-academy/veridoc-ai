"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { setPendingLabsFile } from "@/lib/veridoc/sessionStore";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const HeroUpload = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload a PDF or image file (PNG, JPG, JPEG).";
    }
    if (file.size > MAX_FILE_BYTES) {
      return `File is too large. Max size is ${formatBytes(
        MAX_FILE_BYTES,
      )}.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setPendingLabsFile(file);
    router.push("/veridoc");
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="grid gap-2 sm:gap-3">
      <div
        id="hero-upload"
        className={`min-h-[140px] rounded-2xl border-2 border-dashed px-4 py-5 text-center transition sm:min-h-0 sm:rounded-3xl sm:px-6 sm:py-6 ${
          isDragging
            ? "border-teal-400 bg-teal-50/60"
            : "border-slate-200 bg-white/80"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
        <p className="text-sm font-semibold text-slate-800 sm:text-sm">
          Drag and drop your lab file
        </p>
        <p className="mt-1 text-xs text-slate-500 sm:mt-2">
          PDF, PNG, JPG, JPEG. Max {formatBytes(MAX_FILE_BYTES)}.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 min-h-[44px] rounded-full border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] sm:mt-4 sm:min-h-0 sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:text-xs sm:font-semibold sm:text-slate-700 sm:hover:border-slate-300 sm:hover:bg-white sm:hover:text-slate-900"
        >
          Choose file
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Runs locally. Nothing is uploaded or stored.
      </p>
    </div>
  );
};
