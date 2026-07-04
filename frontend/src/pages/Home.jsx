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
                    animate={{
                        y: [0, -10, 0],
                        rotate: [-1.5, 1.5, -1.5],
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                >
                    {/* Glow halo */}
                    <div
                        className="absolute inset-0 rounded-full blur-3xl"
                        style={{
                            background: "rgba(91,106,240,0.28)",
                            transform: "scale(2)",
                        }}
                    />
                    <div
                        className="relative w-20 h-20 rounded-2xl border flex items-center justify-center"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            borderColor: BORDER_SOFT,
                        }}
                    >
                        {/* Linhas decorativas de documento */}
                        <div className="absolute top-4 left-4 right-4 space-y-1.5">
                            {[100, 80, 65].map((w, i) => (
                                <div
                                    key={i}
                                    className="h-[2px] rounded-full"
                                    style={{
                                        width: `${w}%`,
                                        background: i === 0 ? ACCENT : "rgba(255,255,255,0.1)",
                                    }}
                                />
                            ))}
                        </div>
                        <FileText size={28} style={{ color: ACCENT, marginTop: 20 }} />
                    </div>
                </motion.div>


                {/* Headline + sub */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.55 }}
                    className="flex flex-col gap-1 mb-2"
                >
                    <h1
                        className="text-4xl font-semibold tracking-tight text-white leading-[1.15]"
                    >
                        Assine documentos
                        <br />
                        <span style={{ color: ACCENT }}>sem pagar nada.</span>
                    </h1>
                    <p className="text-gray-400 text-base leading-relaxed">
                        Envie seu PDF, crie sua conta gratuitamente e assine com
                        validade jurídica — em segundos, direto do navegador.
                    </p>
                </motion.div>



                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-col items-center gap-3 w-full"
                >
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        animate={{
                            boxShadow: [
                                "0 0 0 0 rgba(91,106,240,0.5)",
                                "0 0 0 10px rgba(91,106,240,0)",
                            ],
                        }}
                        transition={{
                            boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" },
                            scale: { duration: 0.15 },
                        }}
                        className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white"
                        style={{
                            background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)",
                        }}
                        onClick={handleNavigate}
                    >
                        Criar conta grátis
                        <ArrowRight size={16} />
                    </motion.button>

                </motion.div>

            </div>
        </div>
    );
}
