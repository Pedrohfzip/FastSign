import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { FileText, ShieldCheck, Zap, ArrowRight, CircleDot } from "lucide-react";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const pills = [
    { icon: ShieldCheck, label: "Validade jurídica" },
    { icon: Zap, label: "Em segundos" },
    { icon: FileText, label: "100% gratuito" },
];

export default function App() {
    const navigate = useNavigate();

    // /upload é uma rota protegida (ver ProtectedRoute.jsx) — sem conta, ela manda o
    // usuário de volta pra essa mesma tela. Por isso o CTA leva pro cadastro primeiro;
    // depois de criar a conta, o fluxo normal já cai direto em /upload.
    const handleNavigate = () => {
        navigate("/sign-up");
    };

    // "Como funciona" é uma seção dentro de About.jsx — não existe uma versão dedicada
    // aqui na Home, então o botão secundário só leva pra lá.
    const handleHowItWorks = () => {
        navigate("/about");
    };

    return (
        <div
            className="w-full h-full overflow-y-auto bg-[#0b0b12] text-white scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            {/* Ambient glow — posicionado relativo ao container, não à viewport */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 2xl:py-12 flex flex-col lg:flex-row items-center justify-center gap-10 2xl:gap-16 min-h-full">
                {/* Coluna de texto */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 2xl:gap-5 max-w-xl"
                >
                    {/* text-6xl fica só a partir de 2xl (≥1536px de largura) — na prática,
                        os notebooks 1366x768/1280x720 caem no lg e ficam no 5xl, senão o
                        headline sozinho já estourava a altura da viewport nessas telas mais
                        baixas, forçando scroll (ver ajuste pedido no Home.jsx) */}
                    <h1 className="text-5xl 2xl:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
                        Assine
                        <br />
                        documentos
                        <br />
                        de <span style={{ color: ACCENT }}>graça.</span>
                    </h1>

                    <p className="text-gray-400 text-base lg:text-lg leading-relaxed max-w-md">
                        Envie seu PDF, adicione quem precisa assinar e pronto — assinatura com validade jurídica
                        em minutos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            animate={{
                                boxShadow: [
                                    "0 8px 24px rgba(91,106,240,0.35)",
                                    "0 8px 32px rgba(91,106,240,0.5)",
                                    "0 8px 24px rgba(91,106,240,0.35)",
                                ],
                            }}
                            transition={{
                                boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                                scale: { duration: 0.15 },
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white"
                            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                            onClick={handleNavigate}
                        >
                            Enviar meu primeiro documento
                            <ArrowRight size={16} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-semibold text-white"
                            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SOFT}` }}
                            onClick={handleHowItWorks}
                        >
                            Ver como funciona
                        </motion.button>
                    </div>

                    {/* Pills de confiança — reforça o gancho abaixo do CTA */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-1">
                        {pills.map(({ icon: Icon, label }) => (
                            <span
                                key={label}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-300"
                                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SOFT}` }}
                            >
                                <Icon size={11} style={{ color: ACCENT }} />
                                {label}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Ilustração do documento assinado — escondida no mobile (hidden), só
                    aparece a partir do lg: além de ser peso visual sem espaço sobrando
                    numa tela de celular, remover ela de vez (não só encolher) foi um
                    pedido explícito, então "hidden" tira do layout por completo, não é
                    só um efeito visual */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.15 }}
                    className="hidden lg:flex flex-1 items-center justify-center w-full"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="relative flex items-center justify-center"
                        style={{ width: 260, height: 280 }}
                    >
                        {/* Doc shadow / back layer */}
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
                            {/* Lines */}
                            <div className="flex flex-col gap-2.5">
                                {[90, 75, 85, 60, 70].map((w, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            height: 5,
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
                                    borderTop: "1px dashed rgba(255,255,255,0.12)",
                                    paddingTop: 12,
                                }}
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
                            </div>
                        </div>

                        {/* Badge de verificado — canto inferior direito */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 1, type: "spring", stiffness: 300 }}
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
                                <path d="M2.5 4.5l1.5 1.5 2.5-3" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, letterSpacing: "0.03em" }}>Válido</span>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
