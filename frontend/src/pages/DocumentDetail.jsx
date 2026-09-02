import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FileText, ArrowLeft, Loader2, CheckCircle2, Clock, Mail, Sparkles, User, Download, MessageCircleQuestion, Send, ChevronDown } from "lucide-react";
import { getDocumentDetail, getDocumentResume, downloadDocumentFile, askDocumentQuestion } from "../api/fileRoute";
import useViewportMode from "../hooks/useViewportMode";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const CARD_STYLE = { background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` };

// Separador entre as seções do card — reaproveitado nas duas composições (empilhada
// no mobile, em duas colunas no desktop).
function Divider() {
    return <div style={{ borderTop: `1px solid ${BORDER_SOFT}` }} />;
}

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
    const isDesktop = useViewportMode();

    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [summary, setSummary] = useState(null);
    const summaryAbortRef = useRef(null);

    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // Pergunte sobre o documento (RAG)
    const [question, setQuestion] = useState("");
    const [askLoading, setAskLoading] = useState(false);
    const [askError, setAskError] = useState(null);
    const [answer, setAnswer] = useState(null);
    const [sources, setSources] = useState([]);
    const [showSources, setShowSources] = useState(false);

    // Cancela um resumo em andamento se o usuário sair da página antes dele terminar.
    useEffect(() => () => summaryAbortRef.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getDocumentDetail(id);
                console.log(data);
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
    const getDocResume = async () => {
        const controller = new AbortController();
        summaryAbortRef.current = controller;

        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const result = await getDocumentResume(id, controller.signal);
            setSummary(result);
        } catch (err) {
            if (axios.isCancel(err)) return; // usuário saiu da página — ignora silenciosamente
            setSummaryError(err?.response?.data?.error || "Erro ao gerar resumo.");
        } finally {
            if (!controller.signal.aborted) setSummaryLoading(false);
        }
    }

    const handleDownload = async () => {
        setDownloading(true);
        setDownloadError(null);
        try {
            const blob = await downloadDocumentFile(id);
            const url = URL.createObjectURL(blob);
            // `document` aqui dentro do componente é o STATE (dados do documento), não o
            // DOM global — por isso `window.document` explícito pra criar o link de download.
            const link = window.document.createElement("a");
            link.href = url;
            link.download = `${document.title || "documento"}.pdf`;
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setDownloadError(err?.response?.data?.error || "Erro ao baixar documento.");
        } finally {
            setDownloading(false);
        }
    };

    const handleAsk = async (e) => {
        e?.preventDefault();
        const trimmed = question.trim();
        if (!trimmed || askLoading) return;

        setAskLoading(true);
        setAskError(null);
        setAnswer(null);
        setSources([]);
        setShowSources(false);
        try {
            const result = await askDocumentQuestion(id, trimmed);
            setAnswer(result.answer);
            setSources(result.sources || []);
        } catch (err) {
            setAskError(err?.response?.data?.error || "Erro ao consultar o documento.");
        } finally {
            setAskLoading(false);
        }
    };

    // Cada seção do documento é montada UMA vez e depois composta de formas diferentes
    // conforme o modo: no mobile tudo empilhado dentro de um card único (exatamente
    // como era), no desktop em duas colunas — o documento em si (dados, download e
    // resumo) à esquerda, e o que é conversa/acompanhamento (perguntas à IA e lista de
    // signatários) à direita, em vez de esticar a mesma coluna estreita numa tela larga.
    const sections = document && {
        header: (
            // Header do documento
            <div className="flex flex-col items-center text-center gap-2">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
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
        ),
        info: (
            // Informações do documento
            <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                    <User size={14} className="text-gray-500 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 shrink-0">Enviado por</p>
                        <p className="text-sm text-white truncate text-right">Você</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Clock size={14} className="text-gray-500 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 shrink-0">Data de envio</p>
                        <p className="text-sm text-white truncate text-right">{formatDateTime(document.createdAt)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <FileText size={14} className="text-gray-500 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 shrink-0">Arquivo</p>
                        <p className="text-sm text-white truncate text-right">{document.originalName}</p>
                    </div>
                </div>
            </div>
        ),
        download: (
            <>
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{
                        background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`,
                        boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)",
                    }}
                >
                    {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    {downloading
                        ? "Baixando..."
                        : document.status === "COMPLETED"
                            ? "Baixar documento assinado"
                            : "Baixar documento"}
                </button>
                {downloadError && (
                    <p className="text-xs -mt-2" style={{ color: "#f87171" }}>{downloadError}</p>
                )}
            </>
        ),
        summary: (
            // Resumo com IA
            <div className="flex flex-col gap-2.5">
                <AnimatePresence mode="wait">
                    {summaryLoading ? (
                        // Estado de loading — ícone animado + skeleton do texto
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

                            {/* Skeleton — linhas de texto "fantasma" pulsando, sugerindo que o resumo está sendo escrito */}
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

                {/* {!summaryLoading && (
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
                )} */}
            </div>
        ),
        ask: (
            // Pergunte sobre o documento (RAG)
            <div className="flex flex-col gap-2.5">
                <p className="text-xs flex items-center gap-1.5" style={{ color: ACCENT }}>
                    <MessageCircleQuestion size={12} />
                    Pergunte sobre o documento
                </p>

                <form onSubmit={handleAsk} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={askLoading}
                        placeholder="Ex: qual é o prazo de vigência?"
                        className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-white/20 disabled:opacity-60"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    />
                    <button
                        type="submit"
                        disabled={askLoading || !question.trim()}
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40"
                        style={{
                            background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`,
                            boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)",
                        }}
                    >
                        {askLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                </form>

                <AnimatePresence mode="wait">
                    {askLoading ? (
                        // Mesmo padrão de loading do resumo — ícone girando + skeleton
                        <motion.div
                            key="ask-loading"
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
                                    Procurando no documento...
                                </motion.p>
                            </div>

                            <div className="flex flex-col gap-1.5 pl-1">
                                {[88, 70].map((w, i) => (
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
                    ) : answer ? (
                        <motion.div
                            key="ask-answer"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl px-4 py-3 text-sm text-gray-300"
                            style={{ background: "rgba(91,106,240,0.06)", border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <p className="text-xs flex items-center gap-1.5 mb-2" style={{ color: ACCENT }}>
                                <Sparkles size={11} />
                                Resposta gerada por IA
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {answer.split('\n').filter(line => line.trim()).map((line, i) => (
                                    <p key={i} className="leading-relaxed">
                                        {line.trim()}
                                    </p>
                                ))}
                            </div>

                            {sources.length > 0 && (
                                <div className="mt-3" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowSources((v) => !v)}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors pt-2.5"
                                    >
                                        <ChevronDown
                                            size={12}
                                            className="transition-transform"
                                            style={{ transform: showSources ? "rotate(180deg)" : "none" }}
                                        />
                                        {showSources ? "Ocultar trechos usados" : `Ver trechos usados (${sources.length})`}
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {showSources && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex flex-col gap-2 pt-2.5">
                                                    {sources.map((src) => (
                                                        <p
                                                            key={src.chunkIndex}
                                                            className="text-xs text-gray-500 leading-relaxed rounded-lg px-3 py-2"
                                                            style={{ background: "rgba(255,255,255,0.03)" }}
                                                        >
                                                            {src.chunkText}
                                                        </p>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {askError && (
                    <p className="text-xs px-1" style={{ color: "#f87171" }}>{askError}</p>
                )}
            </div>
        ),
        signatories: (
            // Lista de signatários
            <div className="flex flex-col gap-3.5">
                <p className="text-xs text-gray-500">
                    {document.signatories.length} signatário(s)
                </p>

                {document.signatories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">
                        Nenhum signatário adicionado ainda.
                    </p>
                ) : (
                    document.signatories.map((sig) => {
                        const isSigned = sig.status === "SIGNED";
                        return (
                            <div key={sig.id} className="flex items-center gap-3">
                                {isSigned ? (
                                    <CheckCircle2 size={14} className="shrink-0" style={{ color: "#4ade80" }} />
                                ) : (
                                    <Clock size={14} className="shrink-0" style={{ color: "#facc15" }} />
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{sig.name}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                        <Mail size={11} className="shrink-0" />
                                        {sig.email}
                                    </p>
                                </div>

                                <span
                                    className="text-xs font-medium shrink-0"
                                    style={{ color: isSigned ? "#4ade80" : "#facc15" }}
                                >
                                    {isSigned ? "Assinado" : "Pendente"}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        ),
    };

    return (
        <div
            className="w-full h-full overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto scrollbar-hidden">
                <div className={`w-full flex flex-col gap-5 pb-10 ${isDesktop ? "max-w-5xl" : "max-w-lg"}`}>
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
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-5"
                        >
                            {isDesktop ? (
                                /* Duas colunas: documento à esquerda, acompanhamento à direita */
                                <div className="grid grid-cols-2 gap-5 items-start">
                                    <div className="min-w-0 flex flex-col gap-5 rounded-2xl px-5 py-5" style={CARD_STYLE}>
                                        {sections.header}
                                        <Divider />
                                        {sections.info}
                                        {sections.download}
                                        <Divider />
                                        {sections.summary}
                                    </div>

                                    <div className="min-w-0 flex flex-col gap-5 rounded-2xl px-5 py-5" style={CARD_STYLE}>
                                        {sections.ask}
                                        <Divider />
                                        {sections.signatories}
                                    </div>
                                </div>
                            ) : (
                                /* Card único com todos os detalhes do documento */
                                <div className="flex flex-col gap-5 rounded-2xl px-5 py-5" style={CARD_STYLE}>
                                    {sections.header}
                                    <Divider />
                                    {sections.info}
                                    {sections.download}
                                    <Divider />
                                    {sections.summary}
                                    <Divider />
                                    {sections.ask}
                                    <Divider />
                                    {sections.signatories}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
