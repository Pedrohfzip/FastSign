// Tela de upload — layout novo (IA) + funcionalidade real de upload (sua tela original)
// Sem header/menu próprio (o app já tem um Header.jsx global) e full-bleed,
// ignorando a restrição de largura do #root (width: 80%) definida no index.css.
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, AlertCircle, PenLine, Loader2, Plus } from "lucide-react";
import { uploadDocument } from "../api/fileRoute";
import { useNavigate } from 'react-router'


// Só PDF, igual ao input original (o backend/iframe só sabe exibir PDF)
const ACCEPTED = [".pdf"];

// Estados possíveis de cada arquivo na fila de upload
const STATUS = {
    PENDING: "pending",
    UPLOADING: "uploading",
    DONE: "done",
    ERROR: "error",
};

let nextId = 0;

export default function UploadScreen({ onContinue }) {
    const [dragging, setDragging] = useState(false);
    // cada item: { id, file, status, progress, error, documentId }
    const [items, setItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [selectedId, setSelectedId] = useState(null); // ⬅️ qual item está sendo pré-visualizado
    const inputRef = useRef(null);
    const navigate = useNavigate()

    const hasItems = items.length > 0;
    const selectedItem = items.find((it) => it.id === selectedId) || null;

    // Gera a URL do blob UMA VEZ por item selecionado, não a cada render
    const previewUrl = useMemo(() => {
        if (!selectedItem) return null;
        return URL.createObjectURL(selectedItem.file);
    }, [selectedItem]);

    useEffect(() => {
        // limpa a URL temporária da memória sempre que o preview muda ou o componente desmonta
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);


    const addFiles = useCallback((fileList) => {
        const incoming = Array.from(fileList)
            .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
            .map((file) => ({ id: nextId++, file, status: STATUS.PENDING, progress: 0, error: null, documentId: null }));

        if (incoming.length === 0) return;

        setItems((prev) => [...prev, ...incoming]);

        // seleciona automaticamente o primeiro arquivo novo, se nada estiver selecionado ainda
        setSelectedId((prevSelected) => prevSelected ?? incoming[0].id);
    }, []);

    const uploadItem = async (item) => {
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: STATUS.UPLOADING, error: null } : it)));

        try {
            const response = await uploadDocument(item.file, (percent) => {
                setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: percent } : it)));
            });
            setItems((prev) =>
                prev.map((it) =>
                    it.id === item.id
                        ? { ...it, status: STATUS.DONE, progress: 100, documentId: response.document.id }
                        : it
                )
            );
            return true;
        } catch (err) {
            const message = err.response?.data?.error || err.message || "Erro ao enviar documento.";
            setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, status: STATUS.ERROR, error: message } : it))
            );
            return false;
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const handleFileChange = (e) => {
        if (e.target.files) addFiles(e.target.files);
        if (inputRef.current) inputRef.current.value = "";
    };

    const removeItem = (id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        setSelectedId((prevSelected) => {
            if (prevSelected !== id) return prevSelected;
            const remaining = items.filter((it) => it.id !== id);
            return remaining[0]?.id ?? null;
        });
    };

    const retryItem = (id) => {
        const item = items.find((it) => it.id === id);
        if (item) uploadItem(item);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmitAndContinue = async () => {
        if (items.length === 0 || submitting) return;

        setSubmitting(true);

        // sobe só quem ainda não terminou (PENDING ou ERROR, permitindo retry automático)
        const targets = items.filter((it) => it.status !== STATUS.DONE);
        const results = await Promise.all(targets.map(uploadItem));

        setSubmitting(false);

        const allOk = results.every(Boolean);
        if (allOk) {
            setItems((prev) => {
                const firstDocumentId = prev[0]?.documentId;
                if (firstDocumentId) {
                    navigate(`/documents/${firstDocumentId}/signatories`);
                }
                return prev;
            });
        }
    };

    const canSubmit = items.length > 0 && !submitting;

    return (
        <div
            className="w-full h-full overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            {/* Ambient gradient */}
            <div
                className=" scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            {/* Main — centraliza o drop zone quando vazio; com itens, cresce naturalmente com o conteúdo */}
            <main className="relative z-10 flex-1 flex items-start justify-center px-6 py-6 scrollbar-hidden">
                <div className="w-full max-w-lg flex flex-col gap-3 scrollbar-hidden pb-24 ">
                    {/* pb-24 dá espaço embaixo pro botão flutuante não cobrir o fim do conteúdo */}
                    <h3 className="text-[#262626] font-bold">Upload your files</h3>
                    {/* Drop zone — só aparece antes de qualquer arquivo ser adicionado */}
                    <AnimatePresence>
                        {!hasItems && (
                            <motion.div
                                key="dropzone"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                                style={{
                                    borderColor: dragging ? "rgba(91,106,240,0.7)" : "rgba(255,255,255,0.1)",
                                    backgroundColor: dragging ? "rgba(91,106,240,0.06)" : "rgba(255,255,255,0.02)",
                                }}
                                className="relative cursor-pointer rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 py-6 px-6 select-none shrink-0 scrollbar-hidden"
                            >
                                <motion.div
                                    animate={{ scale: dragging ? 1.08 : 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: dragging ? "rgba(91,106,240,0.2)" : "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <Upload size={18} style={{ color: dragging ? "#5b6af0" : "#6b6b80" }} />
                                </motion.div>

                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">
                                        {dragging ? "Solte aqui" : "Arraste seus arquivos"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        ou{" "}
                                        <span className="text-[#8b93f7] underline underline-offset-2 cursor-pointer">
                                            clique para selecionar
                                        </span>
                                    </p>
                                </div>

                                <div className="flex gap-1.5 flex-wrap justify-center">
                                    {ACCEPTED.map((ext) => (
                                        <span
                                            key={ext}
                                            className="text-[10px] font-medium px-2 py-0.5 rounded-md uppercase"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                color: "#6b6b80",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                letterSpacing: "0.06em",
                                            }}
                                        >
                                            {ext.replace(".", "")}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input de arquivo — fica fora do drop zone pra continuar acessível mesmo depois dele sumir */}
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED.join(",")}
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Lista de arquivos — compacta, some junto com o drop zone quando não há itens */}
                    <AnimatePresence>
                        {hasItems && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-1.5 shrink-0"
                            >
                                <ul className="flex flex-col gap-1.5">
                                    {items.map((item) => {
                                        const isSelected = item.id === selectedId;
                                        return (
                                            <motion.li
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 12 }}
                                                transition={{ duration: 0.22 }}
                                                onClick={() => setSelectedId(item.id)}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                                                style={{
                                                    background: isSelected ? "rgba(91,106,240,0.08)" : "rgba(255,255,255,0.03)",
                                                    border: isSelected ? "1px solid rgba(91,106,240,0.4)" : "1px solid rgba(255,255,255,0.07)",
                                                }}
                                            >
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{
                                                        background:
                                                            item.status === STATUS.ERROR
                                                                ? "rgba(240,91,91,0.12)"
                                                                : item.status === STATUS.DONE
                                                                    ? "rgba(91,240,150,0.12)"
                                                                    : "rgba(91,106,240,0.12)",
                                                    }}
                                                >
                                                    {item.status === STATUS.DONE ? (
                                                        <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                                                    ) : item.status === STATUS.ERROR ? (
                                                        <AlertCircle size={12} style={{ color: "#f87171" }} />
                                                    ) : (
                                                        <FileText size={12} style={{ color: "#5b6af0" }} />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{item.file.name}</p>

                                                    {item.status === STATUS.UPLOADING && (
                                                        <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                                                            <div
                                                                className="h-1 rounded-full transition-all"
                                                                style={{ width: `${item.progress}%`, background: "#5b6af0" }}
                                                            />
                                                        </div>
                                                    )}

                                                    {item.status === STATUS.ERROR ? (
                                                        <p className="text-xs mt-0.5" style={{ color: "#f87171" }}>
                                                            {item.error}{" "}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); retryItem(item.id); }}
                                                                className="underline underline-offset-2"
                                                            >
                                                                Tentar novamente
                                                            </button>
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400">
                                                            {item.status === STATUS.UPLOADING
                                                                ? `Enviando... ${item.progress}%`
                                                                : formatSize(item.file.size)}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                                    className="text-gray-400 hover:text-white transition-colors ml-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </motion.li>
                                        );
                                    })}
                                </ul>

                                {/* Botão discreto pra adicionar mais arquivos, já que o drop zone grande sumiu */}
                                <button
                                    onClick={() => inputRef.current?.click()}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
                                    style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
                                >
                                    <Plus size={12} />
                                    Adicionar outro arquivo
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Preview inline do PDF — altura generosa fixa, a PÁGINA rola pra revelar o resto */}
                    <AnimatePresence mode="wait">
                        {selectedItem && (
                            <motion.div
                                key={selectedItem.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                                style={{ background: "#14141f", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <iframe
                                    src={previewUrl}
                                    title={selectedItem.file.name}
                                    className="w-full block"
                                    style={{ background: "#fff", height: "80vh", border: "none" }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Botão de enviar — flutuante, sempre visível independente do scroll da página */}
            <AnimatePresence>
                {hasItems && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-50"
                        style={{ bottom: "24px", right: "24px" }}
                    >
                        <motion.button
                            animate={
                                canSubmit
                                    ? {
                                        boxShadow: [
                                            "0 0 0 0 rgba(91,106,240,0.45)",
                                            "0 0 0 10px rgba(91,106,240,0)",
                                        ],
                                    }
                                    : { boxShadow: "none" }
                            }
                            transition={
                                canSubmit
                                    ? { boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeOut" } }
                                    : { duration: 0.25 }
                            }
                            whileHover={canSubmit ? { scale: 1.05 } : {}}
                            whileTap={canSubmit ? { scale: 0.95 } : {}}
                            disabled={!canSubmit}
                            onClick={handleSubmitAndContinue}
                            title={submitting ? "Enviando..." : canSubmit ? "Enviar e continuar" : "Adicione arquivos"}
                            className="w-13 h-13 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                            style={{
                                width: 52,
                                height: 52,
                                background: "linear-gradient(360deg, #5b6af0 0%, #7c5cf6 100%)",
                                boxShadow: "0 8px 24px rgba(91,106,240,0.35)",
                            }}
                        >
                            {submitting ? (
                                <Loader2 size={19} className="text-white animate-spin" />
                            ) : (
                                <PenLine size={19} className="text-white" />
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}