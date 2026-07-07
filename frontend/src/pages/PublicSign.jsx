// Tela pública de assinatura — acessada via link com accessToken, sem necessidade de conta
import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { motion } from "framer-motion";
import { FileText, PenLine, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { getSignatureInfo, confirmSignature } from "../api/signRoute";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

export default function PublicSign() {
    const { accessToken } = useParams();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await getSignatureInfo(accessToken);
                if (!cancelled) {
                    setData(result);
                    if (result.signatory.status === "SIGNED") setSigned(true);
                }
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Link inválido ou expirado.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [accessToken]);

    const handleConfirm = async () => {
        setSigning(true);
        setError(null);
        try {
            await confirmSignature(accessToken);
            setSigned(true);
        } catch (err) {
            setError(err?.response?.data?.error || "Erro ao confirmar assinatura.");
        } finally {
            setSigning(false);
        }
    };

    return (
        <div
            className="w-full h-screen overflow-hidden bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6 scrollbar-hidden">
                <div className="w-full max-w-md flex flex-col items-center text-center gap-5">
                    {loading ? (
                        <Loader2 size={28} className="text-white animate-spin" />
                    ) : error ? (
                        <>
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)" }}
                            >
                                <AlertCircle size={18} style={{ color: "#f87171" }} />
                            </div>
                            <h1 className="text-xl font-semibold text-white">Link inválido</h1>
                            <p className="text-sm text-gray-400">{error}</p>
                        </>
                    ) : signed ? (
                        <>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}
                            >
                                <CheckCircle2 size={18} style={{ color: "#4ade80" }} />
                            </motion.div>
                            <h1 className="text-xl font-semibold text-white">Assinatura confirmada!</h1>
                            <p className="text-sm text-gray-400">
                                Obrigado, {data?.signatory?.name}. Sua assinatura em <strong>{data?.document?.title}</strong> foi registrada com sucesso.
                            </p>
                        </>
                    ) : (
                        <>
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(91,106,240,0.12)", border: `1px solid ${BORDER_SOFT}` }}
                            >
                                <FileText size={18} style={{ color: ACCENT }} />
                            </div>
                            <h1 className="text-xl font-semibold text-white">Você foi convidado a assinar</h1>
                            <p className="text-sm text-gray-400">
                                Olá, <strong>{data?.signatory?.name}</strong>. O documento{" "}
                                <strong>{data?.document?.title}</strong> está pronto para sua assinatura.
                            </p>

                            <motion.button
                                whileHover={{ scale: signing ? 1 : 1.03 }}
                                whileTap={{ scale: signing ? 1 : 0.97 }}
                                disabled={signing}
                                onClick={handleConfirm}
                                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 disabled:opacity-60"
                                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`, boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)" }}
                            >
                                {signing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Confirmando...
                                    </>
                                ) : (
                                    <>
                                        <PenLine size={16} />
                                        Confirmar assinatura
                                    </>
                                )}
                            </motion.button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}