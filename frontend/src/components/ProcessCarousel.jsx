// Carrossel ilustrativo do processo do FastSign (Enviar → Signatários → Assinar) —
// puramente decorativo: toca em loop automático, independente do passo REAL em que o
// usuário está (isso continua sendo responsabilidade exclusiva do FlowSteps.jsx, que lê
// a rota via `current`). Esse componente não lê nem influencia esse estado, é só uma
// "vitrine" animada do fluxo completo.
//
// Vive só em UploadFile.jsx, no espaço vazio acima da dropzone — AddSignatories.jsx e
// SignScreen.jsx/PublicSign.jsx já são telas densas (formulário / PdfPositionPicker
// ocupando a maior parte da área), sem sobra vertical pra um elemento só ilustrativo.
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#5b6af0";
const ACCENT_2 = "#7c5cf6";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

// Quanto tempo cada ilustração fica visível antes do carrossel avançar sozinho.
const SLIDE_DURATION_MS = 3200;
const SLIDE_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

// "Enviar documento" — documento flutuando + seta subindo, metáfora de upload.
function UploadArt() {
    return (
        <svg viewBox="0 0 200 120" width="180" height="108" fill="none">
            <defs>
                <linearGradient id="pcUploadLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={ACCENT} />
                    <stop offset="100%" stopColor={ACCENT_2} />
                </linearGradient>
            </defs>

            {/* dois chevrons subindo em sequência, como um indicador de progresso ascendendo
                em direção ao documento */}
            {[0, 0.45].map((delay, i) => (
                <motion.path
                    key={i}
                    d="M90,112 L100,100 L110,112"
                    stroke={ACCENT}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: [0, 1, 0], y: [10, -8, -8] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut", delay }}
                />
            ))}

            {/* documento flutuando suavemente, mesmo espírito do card animado da Home.jsx */}
            <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
                <rect x="62" y="20" width="76" height="76" rx="10" fill="#14141f" stroke={BORDER_SOFT} />
                <rect x="74" y="36" width="52" height="5" rx="2.5" fill="url(#pcUploadLine)" />
                <rect x="74" y="48" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
                <rect x="74" y="60" width="46" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
                <rect x="74" y="72" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
            </motion.g>
        </svg>
    );
}

// "Escolher signatários" — silhuetas surgindo em sequência + selo de "adicionar" pulsando,
// reaproveitando o conceito visual dos ícones Users/UserPlus já usados em AddSignatories.jsx.
function SignatoriesArt() {
    const people = [
        { x: 58, delay: 0 },
        { x: 100, delay: 0.16 },
        { x: 142, delay: 0.32 },
    ];
    return (
        <svg viewBox="0 0 200 120" width="180" height="108" fill="none">
            {people.map((p, i) => (
                <motion.g
                    key={i}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: p.delay, type: "spring", stiffness: 300, damping: 18 }}
                >
                    <circle cx={p.x} cy="52" r="10" fill="rgba(91,106,240,0.15)" stroke={ACCENT} strokeWidth="1.4" />
                    <path
                        d={`M${p.x - 17},86 C${p.x - 17},68 ${p.x + 17},68 ${p.x + 17},86 Z`}
                        fill="rgba(91,106,240,0.15)"
                        stroke={ACCENT}
                        strokeWidth="1.4"
                    />
                </motion.g>
            ))}

            {/* selo de "adicionar" com anel pulsando — mesma linguagem do pulso do botão
                flutuante de enviar em UploadFile.jsx */}
            <motion.circle
                cx="152"
                cy="34"
                r="9"
                fill={ACCENT}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 320, damping: 16 }}
            />
            <motion.circle
                cx="152"
                cy="34"
                r="9"
                fill="none"
                stroke={ACCENT}
                strokeWidth="1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0], scale: [1, 1.7, 1.7] }}
                transition={{ delay: 0.6, duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.path
                d="M152,30 L152,38 M148,34 L156,34"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.2 }}
            />
        </svg>
    );
}

// "Assinar" — traço de assinatura desenhado via motion.path + pathLength (a técnica pedida
// no briefing), numa versão compacta e ilustrativa; a assinatura REAL do usuário é gerada
// à parte, em useSignatureImage.js, via canvas com a fonte Dancing Script.
function SignArt() {
    return (
        <svg viewBox="0 0 200 120" width="180" height="108" fill="none">
            <defs>
                <linearGradient id="pcSignStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={ACCENT} />
                    <stop offset="100%" stopColor={ACCENT_2} />
                </linearGradient>
            </defs>

            <rect x="46" y="10" width="108" height="66" rx="10" fill="#14141f" stroke={BORDER_SOFT} />
            <rect x="58" y="24" width="50" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
            <rect x="58" y="36" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
            <line x1="58" y1="56" x2="142" y2="56" stroke={BORDER_SOFT} strokeDasharray="3 3" />

            {/* desenha o traço, some e desenha de novo — em loop enquanto esse slide estiver
                visível */}
            <motion.path
                d="M56,66 C62,58 66,58 70,64 C74,70 78,70 82,60 C86,50 92,68 98,64 C104,60 108,52 114,62 C118,68 124,66 128,60 C132,55 138,62 144,58"
                stroke="url(#pcSignStroke)"
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", repeatDelay: 0.7 }}
            />

            {/* selo de confirmação, aparece depois do traço terminar de ser desenhado */}
            <motion.g
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5] }}
                transition={{ duration: 3.8, times: [0, 0.32, 0.5, 0.6], repeat: Infinity }}
            >
                <circle cx="150" cy="92" r="10" fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="1.3" />
                <path d="M146,92 l3,3 l6,-7" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </motion.g>
        </svg>
    );
}

const SLIDES = [
    { key: "upload", label: "Enviar documento", Art: UploadArt },
    { key: "signatories", label: "Escolher signatários", Art: SignatoriesArt },
    { key: "sign", label: "Assinar", Art: SignArt },
];

export default function ProcessCarousel() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIndex((prev) => (prev + 1) % SLIDES.length);
        }, SLIDE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [index]);

    const { key, Art } = SLIDES[index];

    return (
        <div className="flex flex-col items-center gap-2.5 shrink-0 select-none">
            <div
                className="w-full rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER_SOFT}`, height: 132 }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={key}
                        initial={{ opacity: 0, x: 16, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -16, scale: 0.97 }}
                        transition={SLIDE_TRANSITION}
                        className="flex items-center justify-center"
                    >
                        <Art />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* dots — só indicativo, não clicável de propósito (a navegação é 100% automática) */}
            <div className="flex items-center gap-1.5">
                {SLIDES.map((s, i) => (
                    <span
                        key={s.key}
                        title={s.label}
                        aria-label={s.label}
                        className="rounded-full transition-colors duration-300"
                        style={{ width: 5, height: 5, background: i === index ? ACCENT : "rgba(255,255,255,0.2)" }}
                    />
                ))}
            </div>
        </div>
    );
}
