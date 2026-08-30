import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ArrowLeft, Loader2, Users, CheckCircle2, Search, X, PenLine, Clock, Trash2, AlertTriangle, ArrowUpDown } from "lucide-react";
import { getDocuments, getDocumentsToSign, getCompletedDocuments, deleteDocument } from "../api/fileRoute";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const STATUS_LABELS = {
    DRAFT: { label: "Rascunho", color: "#6b6b80" },
    PENDING: { label: "Aguardando assinaturas", color: "#facc15" },
    IN_PROGRESS: { label: "Em andamento", color: "#5b6af0" },
    COMPLETED: { label: "Concluído", color: "#4ade80" },
    CANCELLED: { label: "Cancelado", color: "#f87171" },
};

const TABS = {
    MINE: 'mine',
    TO_SIGN: 'to-sign',
    COMPLETED: 'completed',
};

const SORT_OPTIONS = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'oldest', label: 'Mais antigos' },
    { value: 'alphabetical', label: 'Ordem alfabética' },
];

// Reaproveitado pelas 3 abas — cada uma passa seus próprios acessores de data/título,
// já que a forma de cada item varia (doc.title vs item.document.title vs item.title).
function sortByCriteria(list, sortBy, getDate, getTitle) {
    const sorted = [...list];
    switch (sortBy) {
        case 'oldest':
            sorted.sort((a, b) => new Date(getDate(a)) - new Date(getDate(b)));
            break;
        case 'alphabetical':
            sorted.sort((a, b) => (getTitle(a) || '').localeCompare(getTitle(b) || '', 'pt-BR', { sensitivity: 'base' }));
            break;
        case 'recent':
        default:
            sorted.sort((a, b) => new Date(getDate(b)) - new Date(getDate(a)));
    }
    return sorted;
}

export default function MyDocuments() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState(TABS.MINE);

    const [documents, setDocuments] = useState([]);
    const [toSignDocuments, setToSignDocuments] = useState([]);
    const [completedDocuments, setCompletedDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState('recent');

    const [docToDelete, setDocToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [mine, toSign, completed] = await Promise.all([
                    getDocuments(),
                    getDocumentsToSign(),
                    getCompletedDocuments(),
                ]);
                if (!cancelled) {
                    setDocuments(mine);
                    setToSignDocuments(toSign);
                    setCompletedDocuments(completed);
                }
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Erro ao carregar documentos.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    const filteredDocuments = useMemo(() => {
        const term = search.trim().toLowerCase();
        const base = !term
            ? documents
            : documents.filter((doc) => {
                const titleMatch = doc.title?.toLowerCase().includes(term);
                const signatoryMatch = doc.signatoryNames?.some((name) => name.toLowerCase().includes(term));
                return titleMatch || signatoryMatch;
            });
        return sortByCriteria(base, sortBy, (doc) => doc.createdAt, (doc) => doc.title);
    }, [documents, search, sortBy]);

    const filteredToSign = useMemo(() => {
        const term = search.trim().toLowerCase();
        const base = !term
            ? toSignDocuments
            : toSignDocuments.filter((item) => {
                const titleMatch = item.document.title?.toLowerCase().includes(term);
                const ownerMatch = item.document.ownerName?.toLowerCase().includes(term);
                return titleMatch || ownerMatch;
            });
        return sortByCriteria(base, sortBy, (item) => item.document.createdAt, (item) => item.document.title);
    }, [toSignDocuments, search, sortBy]);

    const filteredCompleted = useMemo(() => {
        const term = search.trim().toLowerCase();
        const base = !term
            ? completedDocuments
            : completedDocuments.filter((item) => {
                const titleMatch = item.title?.toLowerCase().includes(term);
                const ownerMatch = item.ownerName?.toLowerCase().includes(term);
                return titleMatch || ownerMatch;
            });
        return sortByCriteria(base, sortBy, (item) => item.createdAt, (item) => item.title);
    }, [completedDocuments, search, sortBy]);

    const pendingToSignCount = toSignDocuments.filter((item) => item.signatoryStatus === 'PENDING').length;

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
        const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        return `${datePart} às ${timePart}`;
    };

    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteDocument(docToDelete.id);
            // O documento excluído pode estar na aba "Meus documentos" OU na aba
            // "Finalizados" (que também lista documentos que o usuário é dono, além dos
            // que ele só assinou) — remove das duas listas, a que não tiver o id não muda nada.
            setDocuments((prev) => prev.filter((doc) => doc.id !== docToDelete.id));
            setCompletedDocuments((prev) => prev.filter((doc) => doc.id !== docToDelete.id));
            setDocToDelete(null);
        } catch (err) {
            setDeleteError(err?.response?.data?.error || "Erro ao excluir documento.");
        } finally {
            setDeleting(false);
        }
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
                <div className="w-full max-w-2xl flex flex-col gap-5 pb-10">
                    {/* "Meus documentos" é um hub acessado de vários lugares (menu, redirects,
                        fluxos de assinatura) — em vez de depender do histórico do navegador
                        (`navigate(-1)`, frágil aqui: DocumentDetail.jsx empurra um novo
                        /documents com `navigate("/documents")` em vez de voltar de verdade,
                        deixando a entrada antiga de /documents/:id "presa" logo atrás na pilha
                        e fazendo o Voltar daqui cair de volta nela), sempre volta pra tela
                        inicial fixa do fluxo (Enviar/Upload). */}
                    <button
                        onClick={() => navigate("/upload")}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    <div className="flex flex-col gap-1 mb-1">
                        <h1 className="text-2xl font-semibold text-white">Documentos</h1>
                        <p className="text-sm text-gray-400">Acompanhe seus envios e o que você precisa assinar.</p>
                    </div>

                    {/* Abas */}
                    <div className="-mx-6 px-6 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hidden">
                        <div
                            className="flex gap-1 p-1 rounded-xl w-fit"
                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <button
                                onClick={() => setActiveTab(TABS.MINE)}
                                className="px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap shrink-0"
                                style={{
                                    color: activeTab === TABS.MINE ? "#fff" : "#8b8b9a",
                                }}
                            >
                                {activeTab === TABS.MINE && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: ACCENT }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                                <span className="relative z-10">Meus documentos</span>
                            </button>

                            <button
                                onClick={() => setActiveTab(TABS.TO_SIGN)}
                                className="px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                style={{
                                    color: activeTab === TABS.TO_SIGN ? "#fff" : "#8b8b9a",
                                }}
                            >
                                {activeTab === TABS.TO_SIGN && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: ACCENT }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                                <span className="relative z-10 sm:hidden">Para assinar</span>
                                <span className="relative z-10 hidden sm:inline">Documentos para assinar</span>
                                {pendingToSignCount > 0 && (
                                    <span
                                        className="relative z-10 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                        style={{
                                            background: activeTab === TABS.TO_SIGN ? "rgba(255,255,255,0.25)" : "#f87171",
                                            color: "#fff",
                                        }}
                                    >
                                        {pendingToSignCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab(TABS.COMPLETED)}
                                className="px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap shrink-0"
                                style={{
                                    color: activeTab === TABS.COMPLETED ? "#fff" : "#8b8b9a",
                                }}
                            >
                                {activeTab === TABS.COMPLETED && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-lg"
                                        style={{ background: ACCENT }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                                <span className="relative z-10">Finalizados</span>
                            </button>
                        </div>
                    </div>

                    {/* Campo de busca + ordenação */}
                    {!loading && !error && (documents.length > 0 || toSignDocuments.length > 0 || completedDocuments.length > 0) && (
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-1 min-w-0"
                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                            >
                                <Search size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={
                                        activeTab === TABS.MINE
                                            ? "Buscar por nome do documento ou signatário..."
                                            : "Buscar por nome do documento ou remetente..."
                                    }
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                                {search && (
                                    <button onClick={() => setSearch("")} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl shrink-0"
                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                            >
                                <ArrowUpDown size={14} className="text-gray-500 shrink-0" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent outline-none text-sm text-gray-300"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value} style={{ background: "#14141f" }}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

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
                        <AnimatePresence mode="wait">
                            {activeTab === TABS.MINE ? (
                                <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {documents.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Você ainda não enviou nenhum documento.
                                        </div>
                                    ) : filteredDocuments.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Nenhum documento encontrado para "{search}".
                                        </div>
                                    ) : (
                                        <ul className="flex flex-col gap-2.5">
                                            {filteredDocuments.map((doc) => {
                                                const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.DRAFT;
                                                const allSigned = doc.totalSignatories > 0 && doc.signedCount === doc.totalSignatories;

                                                return (
                                                    <motion.li
                                                        key={doc.id}
                                                        layout
                                                        whileHover={{ scale: 1.005 }}
                                                        onClick={() => navigate(`/documents/${doc.id}`)}
                                                        className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors"
                                                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                                                            <div
                                                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                                style={{ background: "rgba(91,106,240,0.12)" }}
                                                            >
                                                                <FileText size={16} style={{ color: ACCENT }} />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
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
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-2 pl-12 sm:pl-0 shrink-0">
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

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteError(null);
                                                                    setDocToDelete(doc);
                                                                }}
                                                                title="Excluir documento"
                                                                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </motion.li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </motion.div>
                            ) : activeTab === TABS.TO_SIGN ? (
                                <motion.div key="to-sign" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {toSignDocuments.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Nenhum documento aguardando sua assinatura.
                                        </div>
                                    ) : filteredToSign.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Nenhum documento encontrado para "{search}".
                                        </div>
                                    ) : (
                                        <ul className="flex flex-col gap-2.5">
                                            {filteredToSign.map((item) => {
                                                const isSigned = item.signatoryStatus === 'SIGNED';

                                                return (
                                                    <motion.li
                                                        key={item.signatoryId}
                                                        layout
                                                        whileHover={{ scale: 1.005 }}
                                                        onClick={() => navigate(`/documents/to-sign/${item.accessToken}`)}
                                                        className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors"
                                                        style={{
                                                            background: isSigned ? "rgba(255,255,255,0.03)" : "rgba(91,106,240,0.06)",
                                                            border: isSigned ? `1px solid ${BORDER_SOFT}` : "1px solid rgba(91,106,240,0.3)",
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                                                            <div
                                                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                                style={{
                                                                    background: isSigned ? "rgba(74,222,128,0.12)" : "rgba(91,106,240,0.15)",
                                                                }}
                                                            >
                                                                {isSigned ? (
                                                                    <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
                                                                ) : (
                                                                    <PenLine size={16} style={{ color: ACCENT }} />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{item.document.title}</p>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                                                    <span className="text-xs text-gray-500">{formatDate(item.document.createdAt)}</span>
                                                                    <span className="text-xs text-gray-400 truncate">
                                                                        Enviado por {item.document.ownerName}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className="ml-12 sm:ml-0 self-start sm:self-auto text-xs font-medium px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                                                            style={{
                                                                color: isSigned ? "#4ade80" : "#facc15",
                                                                background: isSigned ? "rgba(74,222,128,0.1)" : "rgba(250,204,21,0.1)",
                                                                border: `1px solid ${isSigned ? "rgba(74,222,128,0.3)" : "rgba(250,204,21,0.3)"}`,
                                                            }}
                                                        >
                                                            {isSigned ? (
                                                                <>
                                                                    <CheckCircle2 size={11} />
                                                                    Assinado
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock size={11} />
                                                                    Aguardando você
                                                                </>
                                                            )}
                                                        </span>
                                                    </motion.li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {completedDocuments.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Nenhum documento finalizado ainda.
                                        </div>
                                    ) : filteredCompleted.length === 0 ? (
                                        <div
                                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                                        >
                                            Nenhum documento encontrado para "{search}".
                                        </div>
                                    ) : (
                                        <ul className="flex flex-col gap-2.5">
                                            {filteredCompleted.map((item) => (
                                                <motion.li
                                                    key={item.id}
                                                    layout
                                                    whileHover={{ scale: 1.005 }}
                                                    onClick={() => navigate(`/documents/${item.id}`)}
                                                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors"
                                                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                                                        <div
                                                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ background: "rgba(91,106,240,0.12)" }}
                                                        >
                                                            <FileText size={16} style={{ color: ACCENT }} />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{item.title}</p>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                                                <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                                                                {item.role === 'signatory' ? (
                                                                    <span className="text-xs text-gray-400 truncate">
                                                                        Enviado por {item.ownerName}
                                                                    </span>
                                                                ) : (
                                                                    item.totalSignatories > 0 && (
                                                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                            <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                                                                            {item.signedCount}/{item.totalSignatories} assinaram
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-2 ml-12 sm:ml-0 shrink-0">
                                                        <span
                                                            className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                                                            style={{
                                                                color: "#4ade80",
                                                                background: "rgba(74,222,128,0.1)",
                                                                border: "1px solid rgba(74,222,128,0.3)",
                                                            }}
                                                        >
                                                            <CheckCircle2 size={11} />
                                                            Concluído
                                                        </span>

                                                        {/* Excluir só é oferecido pro dono do documento — quem é só signatário
                                                            não tem permissão (o backend também bloqueia isso com 403). */}
                                                        {item.role === 'owner' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteError(null);
                                                                    setDocToDelete(item);
                                                                }}
                                                                title="Excluir documento"
                                                                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {docToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-20 flex items-center justify-center px-6"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                        onClick={() => !deleting && setDocToDelete(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4"
                            style={{ background: "#15151f", border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(248,113,113,0.12)" }}
                                >
                                    <AlertTriangle size={16} style={{ color: "#f87171" }} />
                                </div>
                                <div className="flex flex-col gap-1 min-w-0">
                                    <h2 className="text-sm font-semibold text-white">Excluir documento</h2>
                                    <p className="text-sm text-gray-400">
                                        Tem certeza que deseja excluir{" "}
                                        <span className="text-gray-200 font-medium">"{docToDelete.title}"</span>?
                                        Essa ação não pode ser desfeita.
                                    </p>
                                </div>
                            </div>

                            {deleteError && (
                                <div
                                    className="rounded-lg px-3 py-2 text-xs"
                                    style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                                >
                                    {deleteError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 mt-1">
                                <button
                                    onClick={() => setDocToDelete(null)}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={deleting}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
                                    style={{ background: "#f87171" }}
                                >
                                    {deleting && <Loader2 size={14} className="animate-spin" />}
                                    {deleting ? "Excluindo..." : "Excluir"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}