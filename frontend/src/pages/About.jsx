// Tela institucional "Sobre o FastSign" — estática, sem backend. Acessível pelo menu
// do Header. "Voltar" usa histórico (navigate(-1)) pelo mesmo motivo de Help.jsx: essa
// tela é aberta a partir de qualquer página via o menu global, sem um "pai" fixo.
import React from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
    Info,
    ArrowLeft,
    Upload,
    Users,
    PenLine,
    FileCheck2,
    Fingerprint,
    Clock,
    MapPin,
    Sparkles,
} from "lucide-react";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const STEPS = [
    { icon: Upload, title: "Enviar", text: "Suba o PDF que precisa ser assinado." },
    { icon: Users, title: "Signatários", text: "Diga quem precisa assinar — você, outras pessoas, ou os dois." },
    { icon: PenLine, title: "Assinar", text: "Cada um assina pelo próprio link, no seu tempo." },
];

const EVIDENCE = [
    { icon: Fingerprint, title: "Hash SHA-256", text: "Impressão digital do documento no exato momento da assinatura." },
    { icon: MapPin, title: "Endereço IP", text: "Registrado junto com cada assinatura confirmada." },
    { icon: Clock, title: "Data e hora", text: "Timestamp de cada assinatura, no fuso de São Paulo." },
    { icon: FileCheck2, title: "Certificado anexado", text: "Página final do PDF com o resumo de tudo isso, por signatário." },
];

export default function About() {
    const navigate = useNavigate();

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
                <div className="w-full max-w-lg flex flex-col gap-6 pb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center text-center gap-3"
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`,
                                boxShadow: "0 8px 24px rgba(91, 106, 240, 0.35)",
                            }}
                        >
                            <PenLine size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-white">FastSign</h1>
                            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                                Assinatura eletrônica de documentos, sem fricção: envie um PDF, diga quem precisa
                                assinar, e pronto.
                            </p>
                        </div>
                    </motion.div>

                    {/* Como funciona */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                        className="flex flex-col gap-3 rounded-2xl px-5 py-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-0.5">
                            Como funciona
                        </h2>
                        <div className="flex flex-col gap-3.5 mt-1">
                            {STEPS.map((step, i) => {
                                const StepIcon = step.icon;
                                return (
                                    <div key={step.title} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center shrink-0">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{ background: ACCENT_SOFT, border: `1px solid rgba(91,106,240,0.35)` }}
                                            >
                                                <StepIcon size={14} style={{ color: ACCENT }} />
                                            </div>
                                            {i < STEPS.length - 1 && (
                                                <div className="w-px flex-1 my-1" style={{ background: BORDER_SOFT, minHeight: 14 }} />
                                            )}
                                        </div>
                                        <div className="pb-1">
                                            <p className="text-sm font-medium text-white">{step.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Segurança e evidências */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="flex flex-col gap-3.5 rounded-2xl px-5 py-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-0.5">
                            Segurança e evidências
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Cada assinatura confirmada gera um conjunto de evidências, anexado como certificado no
                            próprio PDF:
                        </p>
                        <div className="grid grid-cols-2 gap-2.5 mt-1">
                            {EVIDENCE.map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="flex flex-col gap-1.5 px-3.5 py-3 rounded-xl"
                                        style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER_SOFT}` }}
                                    >
                                        <ItemIcon size={14} style={{ color: ACCENT }} />
                                        <p className="text-xs font-medium text-white">{item.title}</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">{item.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Validade jurídica */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                        className="flex items-start gap-3 px-4 py-4 rounded-xl"
                        style={{ background: ACCENT_SOFT, border: "1px solid rgba(91,106,240,0.25)" }}
                    >
                        <FileCheck2 size={16} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium text-white">Validade jurídica</p>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                As assinaturas geradas no FastSign são "assinaturas eletrônicas simples", reconhecidas
                                pela legislação brasileira (MP 2.200-2/2001 e Lei 14.063/2020) para acordos entre
                                partes que consentem com esse meio, sem exigir certificado digital ICP-Brasil.
                            </p>
                        </div>
                    </motion.div>

                    {/* Sobre o projeto */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="flex flex-col gap-2 rounded-2xl px-5 py-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} style={{ color: ACCENT }} />
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Sobre o projeto
                            </h2>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mt-1">
                            FastSign é um projeto pessoal, construído para explorar um fluxo de assinatura eletrônica
                            rápido e simples de ponta a ponta — do upload do PDF ao certificado final. Feito com
                            React, Node.js e PostgreSQL, com um resumo de documentos gerado por IA rodando localmente.
                        </p>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
