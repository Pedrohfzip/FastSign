import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { FileText, ShieldCheck, Zap, ArrowRight } from "lucide-react";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const pills = [
    { icon: ShieldCheck, label: "Validade jurídica" },
    { icon: Zap, label: "Em segundos" },
    { icon: FileText, label: "100% gratuito" },
];

export default function App() {
    const navigate = useNavigate();

    const handleNavigate = () => {
        navigate("/upload");
    };
    return (
        <div
            className="w-full bg-[#0b0b12] text-white flex flex-col overflow-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", minHeight: "calc(100vh - 52px)" }}
        >
            {/* Ambient glow — posicionado relativo ao container, não à viewport */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(91,106,240,0.2) 0%, transparent 65%)",
                }}
            />



            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center  max-w-md w-full mx-auto px-6 gap-4">

                {/* Floating document icon */}
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex items-center justify-center"
                    style={{ width: 200, height: 200 }}
                >
                    {/* Glow orb */}
                    <div
                        className="absolute rounded-full blur-3xl"
                        style={{
                            width: 160,
                            height: 160,
                            background: "radial-gradient(circle, rgba(91,106,240,0.45) 0%, rgba(124,92,246,0.2) 60%, transparent 100%)",
                        }}
                    />

                    {/* Doc shadow / back layer */}
                    <div
                        className="absolute rounded-2xl"
                        style={{
                            width: 110,
                            height: 140,
                            background: "rgba(91,106,240,0.08)",
                            border: "1px solid rgba(91,106,240,0.15)",
                            transform: "rotate(6deg) translateX(10px) translateY(6px)",
                        }}
                    />

                    {/* Main doc card */}
                    <div
                        className="absolute rounded-2xl flex flex-col"
                        style={{
                            width: 100,
                            height: 138,
                            background: "linear-gradient(160deg, rgba(30,30,50,0.95) 0%, rgba(18,18,32,0.98) 100%)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                            padding: "16px 14px",
                        }}
                    >
                        {/* Doc top fold corner */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: 22,
                                height: 22,
                                background: "rgba(91,106,240,0.2)",
                                borderLeft: "1px solid rgba(255,255,255,0.08)",
                                borderBottom: "1px solid rgba(255,255,255,0.08)",
                                borderBottomLeftRadius: 6,
                                borderTopRightRadius: 16,
                            }}
                        />

                        {/* Lines */}
                        <div className="flex flex-col gap-2 mt-1">
                            {[90, 75, 85, 60].map((w, i) => (
                                <div
                                    key={i}
                                    style={{
                                        height: 3,
                                        width: `${w}%`,
                                        borderRadius: 99,
                                        background: i === 0
                                            ? "linear-gradient(90deg, #5b6af0, #7c5cf6)"
                                            : "rgba(255,255,255,0.08)",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Signature area */}
                        <div
                            style={{
                                marginTop: "auto",
                                borderTop: "1px dashed rgba(255,255,255,0.1)",
                                paddingTop: 8,
                            }}
                        >
                            <p style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", marginBottom: 4, letterSpacing: "0.05em" }}>
                                ASSINATURA
                            </p>
                            {/* Animated SVG signature path */}
                            <svg width="60" height="22" viewBox="0 0 88 22" fill="none">
                                <motion.path
                                    d="M4 14 C10 6, 16 18, 22 10 C28 2, 32 18, 40 12 C46 8, 50 16, 58 10 C64 6, 70 14, 78 8 C82 5, 84 10, 86 9"
                                    stroke="#5b6af0"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Badge de verificado — canto inferior direito */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
                        className="absolute flex items-center gap-1 rounded-full px-2 py-1"
                        style={{
                            bottom: 20,
                            right: 10,
                            background: "rgba(74,222,128,0.12)",
                            border: "1px solid rgba(74,222,128,0.3)",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <circle cx="4.5" cy="4.5" r="4.5" fill="rgba(74,222,128,0.3)" />
                            <path d="M2.5 4.5l1.5 1.5 2.5-3" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 600, letterSpacing: "0.03em" }}>Válido</span>
                    </motion.div>
                </motion.div>


                {/* Headline + sub */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.55 }}
                    className="flex flex-col gap-1 mb-1"
                >
                    <h1
                        className="text-4xl font-semibold tracking-tight text-white leading-[1.15]"
                    >
                        Assine documentos
                        <br />
                        <span style={{ color: ACCENT }}>sem pagar nada.</span>
                    </h1>
                    <p className="text-gray-400 text-base leading-relaxed">
                        Crie sua conta gratuitamente, envie seu PDF e assine com
                        validade jurídica — em segundos, direto do navegador.
                    </p>
                </motion.div>



                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-col items-center  w-full"
                >
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}

                        transition={{
                            boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" },
                            scale: { duration: 0.15 },
                        }}
                        className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white"
                        style={{
                            background: "linear-gradient(135deg, #282d5900 0%, #7a5dee00 100%)",
                        }}
                        onClick={handleNavigate}
                    >
                        Crie sua Conta
                        <ArrowRight size={16} />
                    </motion.button>

                </motion.div>

            </div>
        </div>
    );
}
