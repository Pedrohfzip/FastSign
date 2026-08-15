// Tela de detalhes de um documento que o usuário logado precisa assinar.
// Mostra informações do documento antes de levar para a tela de confirmação da assinatura.
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FileText, ArrowLeft, Loader2, AlertCircle, PenLine, CheckCircle2, Clock, Mail, User, Sparkles } from "lucide-react";
import { getSignatureInfo } from "../api/signRoute";
import { getDocumentResume } from "../api/fileRoute";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

export default function DocumentToSignDetail() {
    const { accessToken } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [summary, setSummary] = useState(null);
    const summaryAbortRef = useRef(null);

    // Cancela um resumo em andamento se o usuário sair da página antes dele terminar.
    useEffect(() => () => summaryAbortRef.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await getSignatureInfo(accessToken);
                if (!cancelled) setData(result);
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Link inválido ou expirado.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [accessToken]);

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getDocResume = async () => {
        const controller = new AbortController();
        summaryAbortRef.current = controller;

        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const result = await getDocumentResume(data.document.id, controller.signal);
            setSummary(result);
        } catch (err) {
            if (axios.isCancel(err)) return; // usuário saiu da página — ignora silenciosamente
            setSummaryError(err?.response?.data?.error || "Erro ao gerar resumo.");
        } finally {
            if (!controller.signal.aborted) setSummaryLoading(false);
        }
    };

    const isSigned = data?.signatory?.status === "SIGNED";

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
                            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                            style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                        >
                            <AlertCircle size={15} className="shrink-0" />
                            {error}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-5"
                        >
                            {/* Card único com todos os detalhes do documento */}
                            <div
                                className="flex flex-col gap-5 rounded-2xl px-5 py-5"
                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                            >
                                {/* Header do documento */}
                                <div className="flex flex-col items-center text-center gap-2">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                                        style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                                    >
                                        <FileText size={18} style={{ color: ACCENT }} />
                                    </div>
                                    <h1 className="text-xl font-semibold text-white">{data.document.title}</h1>

                                    <span
                                        className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
                                        style={{
                                            color: isSigned ? "#4ade80" : "#facc15",
                                            background: isSigned ? "rgba(74,222,128,0.1)" : "rgba(250,204,21,0.1)",
                                            border: `1px solid ${isSigned ? "rgba(74,222,128,0.3)" : "rgba(250,204,21,0.3)"}`,
                                        }}
                                    >
                                        {isSigned ? (
                                            <>
                                                <CheckCircle2 size={11} />
                                                Assinado por você
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={11} />
                                                Aguardando sua assinatura
                                            </>
                                        )}
                                    </span>
                                </div>

                                <div style={{ borderTop: `1px solid ${BORDER_SOFT}` }} />

                                {/* Informações do documento */}
                                <div className="flex flex-col gap-3.5">
                                    <div className="flex items-center gap-3">
                                        <User size={14} className="text-gray-500 shrink-0" />
                                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                            <p className="text-xs text-gray-500 shrink-0">Enviado por</p>
                                            <p className="text-sm text-white truncate text-right">{data.document.ownerName || "Usuário desconhecido"}</p>
                                        </div>
                                    </div>

                                    {data.document.createdAt && (
                                        <div className="flex items-center gap-3">
                                            <Clock size={14} className="text-gray-500 shrink-0" />
                                            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                                <p className="text-xs text-gray-500 shrink-0">Data de envio</p>
                                                <p className="text-sm text-white truncate text-right">{formatDate(data.document.createdAt)}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <Mail size={14} className="text-gray-500 shrink-0" />
                                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                            <p className="text-xs text-gray-500 shrink-0">Assinando como</p>
                                            <p className="text-sm text-white truncate text-right">{data.signatory.name} · {data.signatory.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderTop: `1px solid ${BORDER_SOFT}` }} />

                                {/* Resumo com IA */}
                                <div className="flex flex-col gap-2.5">
                                    <AnimatePresence mode="wait">
                                        {summaryLoading ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="flex flex-col gap-3 rounded-xl px-4 py-4"
                                                style={{ background: ACCENT_SOFT, border: `1px solid rgba(91,106,240,0.25)` }}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{ background: "rgba(91,106,240,0.2)" }}
                                                    >
                                                        <Sparkles size={14} style={{ color: ACCENT }} />
                                                    </motion.div>
                                                    <motion.p
                                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                                        className="text-sm font-medium"
                                                        style={{ color: ACCENT }}
                                                    >
                                                        Analisando documento...
                                                    </motion.p>
                                                </div>

                                                <div className="flex flex-col gap-1.5 pl-1">
                                                    {[92, 78, 60].map((w, i) => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ opacity: [0.15, 0.35, 0.15] }}
                                                            transition={{
                                                                duration: 1.4,
                                                                repeat: Infinity,
                                                                ease: "easeInOut",
                                                                delay: i * 0.15,
                                                            }}
                                                            className="h-2 rounded-full"
                                                            style={{ width: `${w}%`, background: "rgba(255,255,255,0.4)" }}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ) : summary ? (
                                            <motion.div
                                                key="summary"
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-xl px-4 py-3 text-sm text-gray-300"
                                                style={{ background: "rgba(91,106,240,0.06)", border: `1px solid ${BORDER_SOFT}` }}
                                            >
                                                <p className="text-xs flex items-center gap-1.5 mb-2" style={{ color: ACCENT }}>
                                                    <Sparkles size={11} />
                                                    Resumo gerado por IA
                                                </p>
                                                <div className="flex flex-col gap-1.5">
                                                    {summary.split('\n').filter(line => line.trim()).map((line, i) => (
                                                        <p key={i} className="leading-relaxed">
                                                            {line.trim()}
                                                        </p>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>

                                    {summaryError && (
                                        <p className="text-xs px-1" style={{ color: "#f87171" }}>{summaryError}</p>
                                    )}

                                    {!summaryLoading && (
                                        <button
                                            type="button"
                                            onClick={getDocResume}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: `1px solid ${BORDER_SOFT}`,
                                                color: ACCENT,
                                            }}
                                        >
                                            <Sparkles size={14} />
                                            {summary ? "Gerar novo resumo" : "Resumir documento com IA"}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* CTA — leva para a tela de confirmação da assinatura */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/sign/${accessToken}`)}
                                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white"
                                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`, boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)" }}
                            >
                                <PenLine size={16} />
                                {isSigned ? "Ver assinatura" : "Assinar documento"}
                            </motion.button>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
