// Indicador de progresso do fluxo principal do dono do documento: Enviar (UploadFile.jsx)
// → Signatários (AddSignatories.jsx) → Assinar (SignScreen.jsx). De propósito NÃO aparece
// em PublicSign.jsx — um signatário externo que chega direto pelo link do e-mail não
// passou pelas etapas de enviar/adicionar signatários, então mostrar esse passo a passo
// pra ele seria enganoso.
//
// Renderizado UMA VEZ, fora do slide de página, em routes/index.jsx — ou seja, essa
// instância NÃO desmonta/remonta ao navegar entre as 3 telas do fluxo (só o `current`
// muda). Por causa disso, esse componente precisa lidar com dois momentos diferentes:
//
//   1) primeiro mount (chegando no fluxo vindo de fora, ex: Home → Upload): os círculos e
//      linhas "constroem" a barra em sequência da esquerda pra direita, como se
//      estivesse avançando até o passo atual.
//   2) troca de step com o componente já montado (Enviar → Signatários, Signatários →
//      Assinar): não há stagger por índice aqui — cada elemento já está na tela, só
//      transiciona suavemente do estado antigo pro novo (cor de fundo, borda, opacidade
//      do preenchimento em gradiente), dando a sensação de "a mesma barra avançando",
//      não uma reconstrução do zero.
//
// Cores em gradiente (o preenchimento do passo ativo) não interpolam suavemente via
// Framer Motion, só cores sólidas — por isso o gradiente vive numa camada separada
// (`overlay`) que só tem sua OPACIDADE animada (0↔1), sobre uma base de cor sólida que
// essa sim anima normalmente entre os estados "concluído"/"futuro".
import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Users, PenLine, Check } from "lucide-react";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const STEPS = [
    { key: "upload", label: "Enviar", icon: Upload },
    { key: "signatories", label: "Signatários", icon: Users },
    { key: "sign", label: "Assinar", icon: PenLine },
];

const FIRST_MOUNT_BASE_DELAY = 0.05;
const FIRST_MOUNT_STEP_GAP = 0.16;
const UPDATE_DURATION = 0.32;
const EASE = [0.22, 1, 0.36, 1];

export default function FlowSteps({ current }) {
    const currentIndex = STEPS.findIndex((step) => step.key === current);

    // true só durante o primeiríssimo render desse componente; depois disso (o efeito
    // roda uma vez, logo após o primeiro paint) fica false pro resto da vida da instância.
    // Lido diretamente durante a renderização de propósito — é assim que decidimos, a
    // cada render, se ainda estamos no "reveal" inicial ou já numa troca de step normal.
    const isFirstRenderRef = useRef(true);
    useEffect(() => {
        isFirstRenderRef.current = false;
    }, []);
    const isFirstRender = isFirstRenderRef.current;

    return (
        <div className="flex items-center w-full">
            {STEPS.map((step, i) => {
                const isDone = i < currentIndex;
                const isActive = i === currentIndex;
                const isTraveled = i <= currentIndex;
                const StepIcon = step.icon;

                const delay = isFirstRender ? FIRST_MOUNT_BASE_DELAY + i * FIRST_MOUNT_STEP_GAP : 0;
                const circleTransition = isFirstRender
                    ? { delay, type: "spring", stiffness: 380, damping: 18 }
                    : { delay, duration: UPDATE_DURATION, ease: EASE };

                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1.5">
                            <motion.div
                                className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                                initial={isFirstRender && isTraveled ? { scale: 0.4, opacity: 0 } : false}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    backgroundColor: isDone ? "rgba(91,106,240,0.15)" : "rgba(255,255,255,0.04)",
                                    borderColor: isActive ? "rgba(0,0,0,0)" : isDone ? "rgba(91,106,240,0.4)" : BORDER_SOFT,
                                }}
                                transition={circleTransition}
                                style={{ borderWidth: 1, borderStyle: "solid" }}
                            >
                                {/* Camada do preenchimento em gradiente do passo ATIVO — só a
                                    opacidade dela anima (gradiente não interpola). */}
                                <motion.div
                                    className="absolute inset-0"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                                    animate={{ opacity: isActive ? 1 : 0 }}
                                    transition={{ delay, duration: UPDATE_DURATION, ease: EASE }}
                                />

                                <span className="relative z-10 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {isDone ? (
                                            <motion.span
                                                key="done"
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                transition={{ duration: 0.18 }}
                                                className="flex items-center justify-center"
                                            >
                                                <Check size={14} style={{ color: ACCENT }} />
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="pending"
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                transition={{ duration: 0.18 }}
                                                className="flex items-center justify-center"
                                            >
                                                <StepIcon size={14} color={isActive ? "#fff" : "#6b6b80"} />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </span>
                            </motion.div>

                            <motion.span
                                className="text-[10px] font-medium whitespace-nowrap"
                                initial={isFirstRender && isTraveled ? { opacity: 0 } : false}
                                animate={{ color: isActive ? "#ffffff" : isDone ? ACCENT : "#6b6b80", opacity: 1 }}
                                transition={circleTransition}
                            >
                                {step.label}
                            </motion.span>
                        </div>

                        {i < STEPS.length - 1 && (
                            <motion.div
                                className="flex-1 h-px mx-1.5"
                                initial={isFirstRender && i < currentIndex ? { scaleX: 0 } : false}
                                animate={{
                                    scaleX: 1,
                                    backgroundColor: i < currentIndex ? "rgba(91,106,240,0.4)" : BORDER_SOFT,
                                }}
                                transition={{
                                    delay: isFirstRender ? FIRST_MOUNT_BASE_DELAY + i * FIRST_MOUNT_STEP_GAP + FIRST_MOUNT_STEP_GAP / 2 : 0,
                                    duration: UPDATE_DURATION,
                                    ease: EASE,
                                }}
                                style={{ transformOrigin: "left", marginBottom: 14 }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
