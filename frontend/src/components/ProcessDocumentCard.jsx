// Ilustração animada da Home — o "documento" passa pelas 3 etapas do fluxo real
// (Enviar → Signatários → Assinar) num carrossel automático, puramente ilustrativo,
// dentro do mesmo card exibido antes (documento + badge no canto, com o leve flutuar em
// Y). A moldura do cartão (camada de sombra atrás, o card principal, as linhas de texto)
// fica FIXA entre as etapas — só a parte de baixo do card e o badge do canto trocam, pra
// passar a sensação de "o mesmo documento avançando no processo", não um recomeço do
// zero a cada troca. Mesmo padrão de carrossel automático (timer + AnimatePresence
// mode="wait" + dots) já usado em ProcessCarousel.jsx, na tela de upload.
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, UserPlus, User } from "lucide-react";

const ACCENT = "#5b6af0";
const ACCENT_2 = "#7c5cf6";
const GREEN = "#4ade80";

const STEPS = ["upload", "signatories", "sign"];
const SLIDE_DURATION_MS = 3300;

export default function ProcessDocumentCard() {
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStepIndex((prev) => (prev + 1) % STEPS.length);
        }, SLIDE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [stepIndex]);

    const step = STEPS[stepIndex];

    return (
        <div className="flex flex-col items-center gap-4">
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center"
                style={{ width: 260, height: 280 }}
            >
                {/* Doc shadow / back layer — fixo, não participa da troca de etapas */}
                <div
                    className="absolute rounded-2xl"
                    style={{
                        width: 190,
                        height: 220,
                        background: "rgba(91,106,240,0.08)",
                        border: "1px solid rgba(91,106,240,0.15)",
                        transform: "rotate(6deg) translateX(16px) translateY(8px)",
                    }}
                />

                {/* Main doc card */}
                <div
                    className="absolute rounded-2xl flex flex-col"
                    style={{
                        width: 190,
                        height: 220,
                        background: "linear-gradient(160deg, rgba(30,30,50,0.95) 0%, rgba(18,18,32,0.98) 100%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                        padding: "22px 20px",
                    }}
                >
                    {/* Linhas de texto — representam o "conteúdo" do documento, ficam
                        constantes entre as etapas */}
                    <div className="flex flex-col gap-2.5">
                        {[90, 75, 85, 60, 70].map((w, i) => (
                            <div
                                key={i}
                                style={{
                                    height: 5,
                                    width: `${w}%`,
                                    borderRadius: 99,
                                    background: i === 0 ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})` : "rgba(255,255,255,0.08)",
                                }}
                            />
                        ))}
                    </div>

                    {/* Parte de baixo do card — o que muda a cada etapa */}
                    <div style={{ marginTop: "auto", borderTop: "1px dashed rgba(255,255,255,0.12)", paddingTop: 12 }}>
                        <AnimatePresence mode="wait">
                            {step === "upload" && (
                                <motion.div
                                    key="upload"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                                        ENVIANDO
                                    </p>
                                    <div
                                        className="rounded-lg px-3 py-2.5"
                                        style={{ background: "rgba(91,106,240,0.08)", border: "1px solid rgba(91,106,240,0.2)" }}
                                    >
                                        {/* mesma linguagem visual da barra de progresso de upload em uploadFile.jsx */}
                                        <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                            <motion.div
                                                style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})` }}
                                                initial={{ width: "8%" }}
                                                animate={{ width: ["8%", "92%"] }}
                                                transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === "signatories" && (
                                <motion.div
                                    key="signatories"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                                        SIGNATÁRIOS
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {[0, 1].map((i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.4 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.15, type: "spring", stiffness: 320, damping: 18 }}
                                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                                style={{ background: "rgba(91,106,240,0.15)", border: `1px solid ${ACCENT}` }}
                                            >
                                                <User size={11} style={{ color: ACCENT }} />
                                            </motion.div>
                                        ))}
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.4 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, type: "spring", stiffness: 320, damping: 18 }}
                                            className="w-7 h-7 rounded-full flex items-center justify-center"
                                            style={{ border: `1px dashed ${ACCENT}` }}
                                        >
                                            <motion.span
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                                style={{ color: ACCENT, fontSize: 14, fontWeight: 600, lineHeight: 1 }}
                                            >
                                                +
                                            </motion.span>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {step === "sign" && (
                                <motion.div
                                    key="sign"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                                        ASSINATURA
                                    </p>
                                    <div
                                        className="rounded-lg px-3 py-2.5"
                                        style={{ background: "rgba(91,106,240,0.08)", border: "1px solid rgba(91,106,240,0.2)" }}
                                    >
                                        <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 20, color: "#c9cdfa" }}>
                                            - Ana Ribeiro
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Badge do canto — muda de conteúdo/cor junto com a etapa */}
                <AnimatePresence mode="wait">
                    {step === "upload" && (
                        <motion.div
                            key="badge-upload"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="absolute flex items-center gap-1.5 rounded-full px-3 py-1.5"
                            style={{
                                bottom: 10,
                                right: -6,
                                background: "rgba(91,106,240,0.12)",
                                border: "1px solid rgba(91,106,240,0.3)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <Upload size={11} style={{ color: ACCENT }} />
                            <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: "0.03em" }}>Enviando</span>
                        </motion.div>
                    )}

                    {step === "signatories" && (
                        <motion.div
                            key="badge-signatories"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="absolute flex items-center gap-1.5 rounded-full px-3 py-1.5"
                            style={{
                                bottom: 10,
                                right: -6,
                                background: "rgba(91,106,240,0.12)",
                                border: "1px solid rgba(91,106,240,0.3)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <UserPlus size={11} style={{ color: ACCENT }} />
                            <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: "0.03em" }}>Signatários</span>
                        </motion.div>
                    )}

                    {step === "sign" && (
                        <motion.div
                            key="badge-sign"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="absolute flex items-center gap-1.5 rounded-full px-3 py-1.5"
                            style={{
                                bottom: 10,
                                right: -6,
                                background: "rgba(74,222,128,0.12)",
                                border: "1px solid rgba(74,222,128,0.3)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 9 9" fill="none">
                                <circle cx="4.5" cy="4.5" r="4.5" fill="rgba(74,222,128,0.3)" />
                                <path d="M2.5 4.5l1.5 1.5 2.5-3" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span style={{ fontSize: 11, color: GREEN, fontWeight: 600, letterSpacing: "0.03em" }}>Válido</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* dots — indicativo da etapa mostrada no momento, mesmo padrão visual do
                carrossel da tela de upload (ProcessCarousel.jsx); não clicável de propósito */}
            <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                    <span
                        key={s}
                        className="rounded-full transition-colors duration-300"
                        style={{ width: 5, height: 5, background: i === stepIndex ? ACCENT : "rgba(255,255,255,0.2)" }}
                    />
                ))}
            </div>
        </div>
    );
}
