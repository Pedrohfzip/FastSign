// Tela pública de assinatura — acessada via link com accessToken, sem necessidade de conta
import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, PenLine, CheckCircle2, Loader2, AlertCircle, Check, User } from "lucide-react";
import { getSignatureInfo, getSignatureFile, confirmSignature } from "../api/signRoute";
import PdfPositionPicker from "../components/PdfPositionPicker";
import { useSignatureImage } from "../hooks/useSignatureImage";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

export default function PublicSign() {
    const { accessToken } = useParams();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);

    const [file, setFile] = useState(null);
    const [position, setPosition] = useState(null);
    const [positionConfirmed, setPositionConfirmed] = useState(false);
    const [signatureName, setSignatureName] = useState("");

    const { imageDataUrl: signatureImage, loading: signatureLoading } = useSignatureImage(signatureName);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await getSignatureInfo(accessToken);
                if (cancelled) return;

                setData(result);
                const alreadySigned = result.signatory.status === "SIGNED";
                if (alreadySigned) setSigned(true);
                setSignatureName(result.signatory.name || "");

                // Pré-posiciona a assinatura no ponto sugerido pela heurística — o usuário
                // ainda pode tocar em outro lugar do documento pra sobrescrever.
                if (result.document.suggestedPosition) {
                    setPosition(result.document.suggestedPosition);
                }

                // Só busca o arquivo se ainda falta assinar — evita download desnecessário.
                if (!alreadySigned) {
                    getSignatureFile(accessToken)
                        .then((blob) => { if (!cancelled) setFile(blob); })
                        .catch(() => { /* o picker mostra seu próprio erro de carregamento */ });
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

    // Toda vez que a posição muda (o usuário tocou em outro lugar do documento),
    // a confirmação anterior deixa de valer — exige nova confirmação explícita.
    const handlePositionChange = (newPosition) => {
        setPosition(newPosition);
        setPositionConfirmed(false);
    };

    // Mesma lógica: editar o nome muda a imagem da assinatura, então a confirmação
    // anterior (que era sobre a assinatura antiga) deixa de valer.
    const handleNameChange = (e) => {
        setSignatureName(e.target.value);
        setPositionConfirmed(false);
    };

    const handleConfirm = async () => {
        setSigning(true);
        setError(null);
        try {
            await confirmSignature(accessToken, { signatureImage, position });
            setSigned(true);
        } catch (err) {
            setError(err?.response?.data?.error || "Erro ao confirmar assinatura.");
        } finally {
            setSigning(false);
        }
    };

    return (
        <div
            className="w-full h-screen overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto scrollbar-hidden">
                <div className="w-full max-w-lg flex flex-col items-center text-center gap-5 pb-10">
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

                            <div className="w-full flex flex-col gap-2 text-left">
                                <label className="text-xs text-gray-500 px-1">Nome para a assinatura</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                >
                                    <User size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={signatureName}
                                        onChange={handleNameChange}
                                        placeholder="Seu nome completo"
                                        disabled={signing}
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <PdfPositionPicker
                                    file={file}
                                    position={position}
                                    onPositionChange={handlePositionChange}
                                    disabled={signing}
                                    signatureImage={signatureImage}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setPositionConfirmed((prev) => !prev)}
                                disabled={signing || !signatureImage}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-60"
                                style={{
                                    background: positionConfirmed ? "rgba(91,106,240,0.1)" : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${positionConfirmed ? "rgba(91,106,240,0.4)" : BORDER_SOFT}`,
                                }}
                            >
                                <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                        background: positionConfirmed ? ACCENT : "transparent",
                                        border: `1.5px solid ${positionConfirmed ? ACCENT : "rgba(255,255,255,0.25)"}`,
                                    }}
                                >
                                    <AnimatePresence>
                                        {positionConfirmed && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <Check size={13} color="#fff" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <span className="text-sm text-white font-medium">Confirmo minha assinatura e a posição selecionada</span>
                            </button>

                            <motion.button
                                whileHover={{ scale: signing || !positionConfirmed || !signatureImage ? 1 : 1.03 }}
                                whileTap={{ scale: signing || !positionConfirmed || !signatureImage ? 1 : 0.97 }}
                                disabled={signing || !positionConfirmed || !signatureImage || signatureLoading}
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