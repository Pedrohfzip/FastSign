// Tela de upload — layout novo (IA) + funcionalidade real de upload (sua tela original)
// Sem header/menu próprio (o app já tem um Header.jsx global) e full-bleed,
// ignorando a restrição de largura do #root (width: 80%) definida no index.css.
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, AlertCircle, PenLine, Loader2 } from "lucide-react";
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
    // cada item: { id, file, status, progress, error }
    const [items, setItems] = useState([]);
    const [submitting, setSubmitting] = useState(false); // novo
    const inputRef = useRef(null);
    const navigate = useNavigate()


    const addFiles = useCallback((fileList) => {
        const incoming = Array.from(fileList)
            .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
            .map((file) => ({ id: nextId++, file, status: STATUS.PENDING, progress: 0, error: null }));

        if (incoming.length === 0) return;

        setItems((prev) => [...prev, ...incoming]);
    }, []);

    const uploadItem = async (item) => {
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: STATUS.UPLOADING, error: null } : it)));

        try {
            await uploadDocument(item.file, (percent) => {
                setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: percent } : it)));
            });
            setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, status: STATUS.DONE, progress: 100 } : it))
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

    const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

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
            navigate('/sign', { state: { files: items.map((it) => it.file) } });
        }
    };

    const canSubmit = items.length > 0 && !submitting;

    return (
        <div
            className="w-full  overflow-hidden bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
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

            {/* Main — ocupa o resto da tela e centraliza o card, sem gerar scroll na página */}
            <main className="relative z-10 flex-1 min-h-0 overflow-hidden flex items-center justify-center px-6 py-6 scrollbar-hidden">
                <div className="w-full max-w-lg max-h-[640px] flex flex-col gap-3 scrollbar-hidden">
                    {/* Drop zone — mais compacta */}
                    <motion.div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        animate={{
                            borderColor: dragging ? "rgba(91,106,240,0.7)" : "rgba(255,255,255,0.1)",
                            backgroundColor: dragging ? "rgba(91,106,240,0.06)" : "rgba(255,255,255,0.02)",
                        }}
                        transition={{ duration: 0.2 }}
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

                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept={ACCEPTED.join(",")}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </motion.div>

                    {/* Lista de arquivos — scroll interno próprio, não empurra a página */}
                    <div className="flex-1 min-h-0 overflow-y-auto  scrollbar-hidden">
                        <AnimatePresence>
                            {items.length > 0 && (
                                <motion.ul
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-2"
                                >
                                    {items.map((item) => (
                                        <motion.li
                                            key={item.id}
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12 }}
                                            transition={{ duration: 0.22 }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.07)",
                                            }}
                                        >
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
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
                                                    <CheckCircle2 size={13} style={{ color: "#4ade80" }} />
                                                ) : item.status === STATUS.ERROR ? (
                                                    <AlertCircle size={13} style={{ color: "#f87171" }} />
                                                ) : (
                                                    <FileText size={13} style={{ color: "#5b6af0" }} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{item.file.name}</p>

                                                {item.status === STATUS.UPLOADING && (
                                                    <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
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
                                    ))}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {items.length > 0 && (
                                <div className="flex justify-center mt-3 pb-3 scrollbar-hidden">
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={
                                            canSubmit
                                                ? {
                                                    opacity: 1,
                                                    scale: 1,
                                                    boxShadow: [
                                                        "0 0 0 0 rgba(91,106,240,0.45)",
                                                        "0 0 0 8px rgba(91,106,240,0)",
                                                    ],
                                                }
                                                : { opacity: 1, scale: 1, boxShadow: "none" }
                                        }
                                        exit={{ opacity: 0, scale: 0.7 }}
                                        transition={
                                            canSubmit
                                                ? { boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeOut" } }
                                                : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
                                        }
                                        disabled={!canSubmit}
                                        onClick={handleSubmitAndContinue}
                                        title={submitting ? "Enviando..." : canSubmit ? "Enviar e continuar" : "Adicione arquivos"}
                                        className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-opacity shrink-0"
                                        style={{ background: "linear-gradient(360deg, #5b6af0 0%, #7c5cf6 100%)" }}
                                    >
                                        {submitting ? (
                                            <Loader2 size={17} className="text-white animate-spin" />
                                        ) : (
                                            <PenLine size={17} className="text-white" />
                                        )}
                                    </motion.button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* CTA — só habilita quando todos os uploads terminaram com sucesso */}

                </div>
            </main>
        </div >
    );
}