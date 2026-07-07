import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { FileText, ArrowLeft, Loader2, CheckCircle2, Clock, Mail } from "lucide-react";
import { getDocumentDetail } from "../api/fileRoute";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const STATUS_LABELS = {
    DRAFT: { label: "Rascunho", color: "#6b6b80" },
    PENDING: { label: "Aguardando assinaturas", color: "#facc15" },
    IN_PROGRESS: { label: "Em andamento", color: "#5b6af0" },
    COMPLETED: { label: "Concluído", color: "#4ade80" },
    CANCELLED: { label: "Cancelado", color: "#f87171" },
};

export default function DocumentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getDocumentDetail(id);
                if (!cancelled) setDocument(data);
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Erro ao carregar documento.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [id]);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
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
                <div className="w-full max-w-lg flex flex-col gap-5 pb-10">
                    <button
                        onClick={() => navigate("/documents")}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 size={24} className="text-white animate-spin" />
                        </div>
                    ) : error ? (
                        <div
                            className="rounded-xl px-4 py-3 text-sm"
                            style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                        >
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* Header do documento */}
                            <div className="flex flex-col items-center text-center gap-2 mb-1">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ background: "rgba(91,106,240,0.12)", border: `1px solid ${BORDER_SOFT}` }}
                                >
                                    <FileText size={18} style={{ color: ACCENT }} />
                                </div>
                                <h1 className="text-xl font-semibold text-white">{document.title}</h1>
                                {(() => {
                                    const statusInfo = STATUS_LABELS[document.status] || STATUS_LABELS.DRAFT;
                                    return (
                                        <span
                                            className="text-xs font-medium px-2.5 py-1 rounded-full"
                                            style={{
                                                color: statusInfo.color,
                                                background: `${statusInfo.color}1a`,
                                                border: `1px solid ${statusInfo.color}4d`,
                                            }}
                                        >
                                            {statusInfo.label}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Lista de signatários */}
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-gray-500 pl-1">
                                    {document.signatories.length} signatário(s)
                                </p>

                                {document.signatories.length === 0 ? (
                                    <div
                                        className="rounded-xl px-4 py-6 text-center text-sm text-gray-400"
                                        style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                    >
                                        Nenhum signatário adicionado ainda.
                                    </div>
                                ) : (
                                    document.signatories.map((sig) => {
                                        const isSigned = sig.status === "SIGNED";
                                        return (
                                            <motion.div
                                                key={sig.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{
                                                        background: isSigned ? "rgba(74,222,128,0.12)" : "rgba(250,204,21,0.12)",
                                                    }}
                                                >
                                                    {isSigned ? (
                                                        <CheckCircle2 size={15} style={{ color: "#4ade80" }} />
                                                    ) : (
                                                        <Clock size={15} style={{ color: "#facc15" }} />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{sig.name}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Mail size={11} />
                                                        {sig.email}
                                                    </p>
                                                </div>

                                                <span
                                                    className="text-xs font-medium shrink-0"
                                                    style={{ color: isSigned ? "#4ade80" : "#facc15" }}
                                                >
                                                    {isSigned ? "Assinado" : "Pendente"}
                                                </span>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}