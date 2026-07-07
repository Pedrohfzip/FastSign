import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { FileText, ArrowLeft, Loader2, Users, CheckCircle2 } from "lucide-react";
import { getDocuments } from "../api/fileRoute";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const STATUS_LABELS = {
    DRAFT: { label: "Rascunho", color: "#6b6b80" },
    PENDING: { label: "Aguardando assinaturas", color: "#facc15" },
    IN_PROGRESS: { label: "Em andamento", color: "#5b6af0" },
    COMPLETED: { label: "Concluído", color: "#4ade80" },
    CANCELLED: { label: "Cancelado", color: "#f87171" },
};

export default function MyDocuments() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getDocuments();
                if (!cancelled) setDocuments(data);
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Erro ao carregar documentos.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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
                <div className="w-full max-w-2xl flex flex-col gap-5 pb-10">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    <div className="flex flex-col gap-1 mb-2">
                        <h1 className="text-2xl font-semibold text-white">Meus documentos</h1>
                        <p className="text-sm text-gray-400">Acompanhe o status de assinatura de cada documento.</p>
                    </div>

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
                    ) : documents.length === 0 ? (
                        <div
                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                        >
                            Você ainda não enviou nenhum documento.
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2.5">
                            {documents.map((doc) => {
                                const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.DRAFT;
                                const allSigned = doc.totalSignatories > 0 && doc.signedCount === doc.totalSignatories;

                                return (
                                    <motion.li
                                        key={doc.id}
                                        whileHover={{ scale: 1.005 }}
                                        onClick={() => navigate(`/documents/${doc.id}`)}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: `1px solid ${BORDER_SOFT}`,
                                        }}
                                    >
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: "rgba(91,106,240,0.12)" }}
                                        >
                                            <FileText size={16} style={{ color: ACCENT }} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
                                                {doc.totalSignatories > 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                                        {allSigned ? (
                                                            <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                                                        ) : (
                                                            <Users size={12} />
                                                        )}
                                                        {doc.signedCount}/{doc.totalSignatories} assinaram
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <span
                                            className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                                            style={{
                                                color: statusInfo.color,
                                                background: `${statusInfo.color}1a`,
                                                border: `1px solid ${statusInfo.color}4d`,
                                            }}
                                        >
                                            {statusInfo.label}
                                        </span>
                                    </motion.li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
}