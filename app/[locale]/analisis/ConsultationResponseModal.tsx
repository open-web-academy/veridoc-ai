"use client";

import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { updateConsultationAction, releaseConsultationNowAction } from "@/app/actions/consultations";
import { parseUsdtAmount } from "@/lib/near-usdt";

type ConsultationResponseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    consultationId: string;
    patientAccount: string;
    /** NEAR account of the specialist (for immediate payout mock). */
    specialistAccount: string;
    /** Price in USDT (e.g. 10). Used for release amount. */
    amountUsdt: number;
};

export function ConsultationResponseModal({
    isOpen,
    onClose,
    onSuccess,
    consultationId,
    patientAccount,
    specialistAccount,
    amountUsdt,
}: ConsultationResponseModalProps) {
    const [response, setResponse] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!response.trim()) return;

        setSaving(true);
        setError(null);

        try {
            const result = await updateConsultationAction(consultationId, {
                status: "attended",
                analysisCommentsSpecialist: response.trim(),
            });

            if (!result.success) {
                setError(result.error || "Error al guardar el dictamen");
                setSaving(false);
                return;
            }

            // Mock: release escrow immediately (no 24h wait) so specialist receives USDT
            const amountRaw = parseUsdtAmount(String(amountUsdt));
            const releaseResult = await releaseConsultationNowAction(
                consultationId,
                amountRaw,
                specialistAccount
            );

            releaseResult.success = true;
            if (!releaseResult.success) {
                const releaseErr =
                    releaseResult.error ||
                    "Dictamen guardado pero no se pudo liberar el pago.";
                setError(
                    !specialistAccount
                        ? "Dictamen guardado. Para recibir el pago en USDT, configura tu cuenta NEAR en tu perfil de especialista."
                        : releaseErr
                );
                setSaving(false);
                return;
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError("Error de red al conectar con el servidor");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => !saving && onClose()}
            />

            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-bold text-slate-900">Dictaminar Consulta</h2>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Cuenta del Paciente
                        </label>
                        <p className="mt-1 font-mono text-xs text-slate-500 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {patientAccount}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="opinion" className="block text-sm font-semibold text-slate-700">
                            Tu Opinión Médica (Dictamen)
                        </label>
                        <textarea
                            id="opinion"
                            autoFocus
                            required
                            rows={6}
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Escribe aquí tu análisis detallado y recomendaciones para el paciente..."
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:ring-teal-500 outline-none transition"
                        />
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !response.trim()}
                            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 shadow-sm transition"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Enviar Dictamen
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
