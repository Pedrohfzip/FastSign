// Tela de assinatura — apenas para teste do fluxo de navegação com animação.
// Recebe os arquivos enviados na tela anterior via location.state.files
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { FileText, PenLine, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

export default function SignScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const files = location.state?.files ?? [];

    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Simulação simples de assinatura, só pra testar o fluxo/UI
    const handleSign = async () => {
        setSigning(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setSigning(false);
        setSigned(true);
    };

    return (
        <div
            className="w-full  overflow-hidden bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 min-h-0 overflow-hidden flex items-center justify-center px-6 py-6 scrollbar-hidden">
                <div className="w-full max-w-lg flex flex-col gap-4 scrollbar-hidden">
                    {/* Botão voltar */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2 py-4">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{
                                background: "rgba(91,106,240,0.12)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <PenLine size={18} style={{ color: "#5b6af0" }} />
                        </div>
                        <h1 className="text-lg font-semibold text-white">Assinar documentos</h1>
                        <p className="text-xs text-gray-400">
                            {files.length > 0
                                ? `${files.length} arquivo(s) prontos para assinatura`
                                : "Nenhum arquivo recebido"}
                        </p>
                    </div>

                    {/* Lista de arquivos recebidos */}
                    {files.length > 0 ? (
                        <ul className="flex flex-col gap-2">
                            {files.map((file, index) => (
                                <li
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                    }}
                                >
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: "rgba(91,106,240,0.12)" }}
                                    >
                                        <FileText size={13} style={{ color: "#5b6af0" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                        <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div
                            className="rounded-xl px-4 py-6 text-center text-sm text-gray-400"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed rgba(255,255,255,0.1)",
                            }}
                        >
                            Você chegou aqui sem enviar arquivos. Volte e faça o upload primeiro.
                        </div>
                    )}

                    {/* CTA de assinatura (teste) */}
                    {files.length > 0 && (
                        <div className="flex justify-center mt-2">
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                disabled={signing || signed}
                                onClick={handleSign}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                                style={{
                                    background: signed
                                        ? "rgba(74,222,128,0.15)"
                                        : "linear-gradient(360deg, #5b6af0 0%, #7c5cf6 100%)",
                                    color: signed ? "#4ade80" : "#fff",
                                    border: signed ? "1px solid rgba(74,222,128,0.3)" : "none",
                                }}
                            >
                                {signing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Assinando...
                                    </>
                                ) : signed ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Assinado com sucesso
                                    </>
                                ) : (
                                    <>
                                        <PenLine size={16} />
                                        Assinar agora
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}