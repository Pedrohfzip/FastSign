// Tela onde o dono do documento adiciona quem precisa assinar
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Mail, User, ArrowRight, ArrowLeft, Loader2, Link2, Check } from "lucide-react";
import { addSignatories } from "../api/fileRoute";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

let nextId = 0;

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AddSignatories() {
    const { id: documentId } = useParams();
    const navigate = useNavigate();

    const [rows, setRows] = useState([{ id: nextId++, name: "", email: "" }]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [createdLinks, setCreatedLinks] = useState(null); // resultado após sucesso

    const addRow = () => {
        setRows((prev) => [...prev, { id: nextId++, name: "", email: "" }]);
    };

    const removeRow = (id) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
        setErrors((prev) => ({ ...prev, [id]: null }));
    };

    const validate = () => {
        const newErrors = {};
        rows.forEach((row) => {
            const rowErrors = {};
            if (!row.name.trim()) rowErrors.name = "Nome obrigatório.";
            if (!row.email.trim()) rowErrors.email = "E-mail obrigatório.";
            else if (!isValidEmail(row.email)) rowErrors.email = "E-mail inválido.";
            if (Object.keys(rowErrors).length > 0) newErrors[row.id] = rowErrors;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            const payload = rows.map(({ name, email }) => ({ name, email }));
            const result = await addSignatories(documentId, payload);
            setCreatedLinks(result.signatories);
        } catch (err) {
            setApiError(err?.response?.data?.error || "Erro ao adicionar signatários.");
        } finally {
            setSubmitting(false);
        }
    };

    // Tela de sucesso — mostra os links gerados (já que ainda não enviamos e-mail automaticamente)
    if (createdLinks) {
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
                <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 scrollbar-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-lg flex flex-col gap-5"
                    >
                        <div className="flex flex-col items-center text-center gap-2 mb-2">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}
                            >
                                <Check size={18} style={{ color: "#4ade80" }} />
                            </div>
                            <h1 className="text-2xl font-semibold text-white">Signatários adicionados!</h1>
                            <p className="text-sm text-gray-400">
                                Copie os links abaixo e envie para cada signatário (envio automático por e-mail ainda não configurado).
                            </p>
                        </div>

                        <ul className="flex flex-col gap-2">
                            {createdLinks.map((s) => (
                                <li
                                    key={s.id}
                                    className="flex flex-col gap-2 px-4 py-3 rounded-xl"
                                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">{s.name}</p>
                                            <p className="text-xs text-gray-400">{s.email}</p>
                                        </div>
                                    </div>
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-300 break-all"
                                        style={{ background: "rgba(0,0,0,0.3)" }}
                                    >
                                        <Link2 size={13} className="shrink-0" style={{ color: ACCENT }} />
                                        <span className="truncate">{s.signLink}</span>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(s.signLink)}
                                            className="ml-auto shrink-0 underline underline-offset-2"
                                            style={{ color: ACCENT }}
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate("/upload")}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mt-2"
                            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                        >
                            Concluir
                            <ArrowRight size={16} />
                        </motion.button>
                    </motion.div>
                </main>
            </div>
        );
    }

    // Formulário de adição de signatários
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

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto scrollbar-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-full max-w-lg flex flex-col gap-5 pb-10"
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    <div className="flex flex-col items-center text-center mb-1">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <UserPlus size={18} style={{ color: ACCENT }} />
                        </div>
                        <h2 className="text-2xl font-semibold text-white">Quem precisa assinar?</h2>
                    </div>

                    {apiError && (
                        <div
                            className="rounded-xl px-4 py-3 text-sm"
                            style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                        >
                            {apiError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <AnimatePresence>
                            {rows.map((row, index) => (
                                <motion.div
                                    key={row.id}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col gap-2 p-3 rounded-xl"
                                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER_SOFT}` }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Signatário {index + 1}</span>
                                        {rows.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: `1px solid ${errors[row.id]?.name ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                        }}
                                    >
                                        <User size={15} className="text-gray-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => updateRow(row.id, "name", e.target.value)}
                                            placeholder="Nome completo"
                                            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                        />
                                    </div>
                                    {errors[row.id]?.name && (
                                        <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors[row.id].name}</p>
                                    )}

                                    <div
                                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: `1px solid ${errors[row.id]?.email ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                        }}
                                    >
                                        <Mail size={15} className="text-gray-500 shrink-0" />
                                        <input
                                            type="email"
                                            value={row.email}
                                            onChange={(e) => updateRow(row.id, "email", e.target.value)}
                                            placeholder="email@exemplo.com"
                                            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                        />
                                    </div>
                                    {errors[row.id]?.email && (
                                        <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors[row.id].email}</p>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                            style={{ border: `1px dashed ${BORDER_SOFT}` }}
                        >
                            <UserPlus size={14} />
                            Adicionar outro signatário
                        </button>

                        <motion.button
                            type="submit"
                            disabled={submitting}
                            whileHover={{ scale: submitting ? 1 : 1.02 }}
                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`, boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)" }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    Enviar para assinatura
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </main>
        </div>
    );
}