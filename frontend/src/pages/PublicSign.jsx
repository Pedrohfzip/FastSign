// Tela pública de assinatura — acessada via link com accessToken, sem necessidade de conta
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, PenLine, CheckCircle2, Loader2, AlertCircle, Check, User, MousePointerClick, IdCard } from "lucide-react";
import { getSignatureInfo, getSignatureFile, confirmSignature } from "../api/signRoute";
import PdfPositionPicker, { DEFAULT_STAMP_WIDTH_RATIO } from "../components/PdfPositionPicker";
import { useSignatureImage } from "../hooks/useSignatureImage";
import { formatCPF } from "../utils/formatDocument";

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const DOCUMENT_TYPE_OPTIONS = [
    { value: "CPF", label: "CPF" },
    { value: "RG", label: "RG" },
    { value: "OUTRO", label: "Outro" },
];

// Mesma curva de easing usada na troca de ROTA em routes/index.jsx (slideTransition) —
// reaproveitada aqui pra troca de STEP ter a mesma "sensação" do resto do app.
const STEP_EASE = [0.22, 1, 0.36, 1];

// "Virada de página": o conteúdo que sai desliza levemente pra cima enquanto desvanece,
// o que entra nasce um pouco abaixo da posição final e sobe até o lugar — mesma direção
// pros dois, só invertida entre entrada/saída, pra não parecer que o conteúdo "pulou".
const stepContentVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export default function PublicSign() {
    const { accessToken } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    // Erro de CARREGAMENTO do link (inválido/expirado) — troca a tela inteira pro step "error".
    const [error, setError] = useState(null);
    // Erro ao CONFIRMAR a assinatura — fica como aviso inline dentro do próprio formulário,
    // sem sair do step "form" (o link em si continua válido, só a tentativa falhou).
    const [confirmError, setConfirmError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);

    const [file, setFile] = useState(null);
    const [position, setPosition] = useState(null);
    const [positionConfirmed, setPositionConfirmed] = useState(false);
    const [signatureName, setSignatureName] = useState("");
    const [documentType, setDocumentType] = useState("CPF");
    const [documentNumber, setDocumentNumber] = useState("");

    const { imageDataUrl: signatureImage, loading: signatureLoading } = useSignatureImage(signatureName);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await getSignatureInfo(accessToken);
                if (cancelled) return;

                setData(result);
                const alreadySigned = result.signatory.status === "SIGNED";
                if (alreadySigned) setSigned(true);
                setSignatureName(result.signatory.name || "");

                // Pré-posiciona a assinatura no ponto sugerido pela heurística — o usuário
                // ainda pode tocar em outro lugar do documento pra sobrescrever.
                if (result.document.suggestedPosition) {
                    setPosition(result.document.suggestedPosition);
                }

                // Só busca o arquivo se ainda falta assinar — evita download desnecessário.
                if (!alreadySigned) {
                    getSignatureFile(accessToken)
                        .then((blob) => { if (!cancelled) setFile(blob); })
                        .catch(() => { /* o picker mostra seu próprio erro de carregamento */ });
                }
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.error || "Link inválido ou expirado.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [accessToken]);

    // Toda vez que a posição muda (o usuário tocou em outro lugar do documento, ou
    // arrastou o handle de redimensionar na borda da prévia), a confirmação anterior
    // deixa de valer — exige nova confirmação explícita. Preserva o `widthRatio`
    // atual quando a mudança vem de um clique de reposicionar (que não carrega esse
    // campo), pra não perder o tamanho já escolhido.
    const handlePositionChange = (newPosition) => {
        setPosition((prev) => ({
            ...newPosition,
            widthRatio: newPosition.widthRatio ?? prev?.widthRatio ?? DEFAULT_STAMP_WIDTH_RATIO,
        }));
        setPositionConfirmed(false);
        setConfirmError(null);
    };

    // Mesma lógica: editar o nome muda a imagem da assinatura, então a confirmação
    // anterior (que era sobre a assinatura antiga) deixa de valer.
    const handleNameChange = (e) => {
        setSignatureName(e.target.value);
        setPositionConfirmed(false);
        setConfirmError(null);
    };

    const handleDocumentNumberChange = (e) => {
        const value = documentType === "CPF" ? formatCPF(e.target.value) : e.target.value;
        setDocumentNumber(value);
        setConfirmError(null);
    };

    const requireDocument = Boolean(data?.document?.requireSignatoryDocument);
    const documentMissing = requireDocument && !documentNumber.trim();

    const handleConfirm = async () => {
        setSigning(true);
        setConfirmError(null);
        try {
            await confirmSignature(accessToken, {
                signatureImage,
                position,
                signatoryDocumentType: requireDocument ? documentType : undefined,
                signatoryDocumentNumber: requireDocument ? documentNumber.trim() : undefined,
            });
            setSigned(true);
        } catch (err) {
            setConfirmError(err?.response?.data?.error || "Erro ao confirmar assinatura.");
        } finally {
            setSigning(false);
        }
    };

    // Step atual — usado como `key` das animações. "loading" não tem o cabeçalho
    // persistente (ainda não sabemos se vai dar erro, formulário ou já está assinado);
    // os outros três (error/form/done) compartilham a mesma "moldura" de cabeçalho
    // (ícone + título + subtítulo), e é essa moldura que fica contínua entre eles.
    const step = loading ? "loading" : error ? "error" : signed ? "done" : "form";

    // Conteúdo do cabeçalho persistente por step — função (não objeto estático) porque
    // título/subtítulo dependem de dado carregado (nome do signatário, título do
    // documento, mensagem de erro).
    const getHeader = () => {
        if (step === "error") {
            return {
                Icon: AlertCircle,
                iconBg: "rgba(240,91,91,0.1)",
                iconBorder: "rgba(240,91,91,0.25)",
                iconColor: "#f87171",
                title: "Link inválido",
                subtitle: error,
            };
        }
        if (step === "done") {
            return {
                Icon: CheckCircle2,
                iconBg: "rgba(74,222,128,0.12)",
                iconBorder: "rgba(74,222,128,0.3)",
                iconColor: "#4ade80",
                title: "Assinatura confirmada!",
                subtitle: (
                    <>
                        Obrigado, {data?.signatory?.name}. Sua assinatura em <strong>{data?.document?.title}</strong> foi
                        registrada com sucesso.
                    </>
                ),
            };
        }
        // form
        return {
            Icon: FileText,
            iconBg: "rgba(91,106,240,0.12)",
            iconBorder: BORDER_SOFT,
            iconColor: ACCENT,
            title: "Você foi convidado a assinar",
            subtitle: (
                <>
                    Olá, <strong>{data?.signatory?.name}</strong>. O documento <strong>{data?.document?.title}</strong>{" "}
                    está pronto para sua assinatura.
                </>
            ),
        };
    };

    const header = step !== "loading" ? getHeader() : null;

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
                <div className="w-full max-w-lg flex flex-col items-center text-center gap-5 pb-10">
                    {step === "loading" && <Loader2 size={28} className="text-white animate-spin" />}

                    {/* Cabeçalho persistente (ícone + título + subtítulo) — compartilhado entre
                        error/form/done. Fica montado o tempo todo entre esses três (nunca
                        desmonta/remonta ao trocar de step), só o CONTEÚDO interno faz um
                        cross-fade. O ícone usa layoutId: é o mesmo elemento "vivendo" através
                        das trocas de step, então o Framer Motion anima suavemente qualquer
                        mudança de posição/tamanho dele em vez de cortar seco — aqui a caixa do
                        ícone não muda de lugar entre os steps, então o ganho visual do layoutId
                        é a CONTINUIDADE (o navegador nunca desmonta esse nó do DOM), enquanto o
                        glifo do ícone em si (que troca: alerta → documento → check) e o
                        título/subtítulo cross-fadeiam por dentro dessa caixa estável. */}
                    {header && (
                        <motion.div layout className="flex flex-col items-center gap-2">
                            <motion.div
                                layoutId="public-sign-icon"
                                transition={{ duration: 0.35, ease: STEP_EASE }}
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: header.iconBg, border: `1px solid ${header.iconBorder}` }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={step}
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.6 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center justify-center"
                                    >
                                        <header.Icon size={18} style={{ color: header.iconColor }} />
                                    </motion.span>
                                </AnimatePresence>
                            </motion.div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <h1 className="text-xl font-semibold text-white">{header.title}</h1>
                                    <p className="text-sm text-gray-400">{header.subtitle}</p>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* Conteúdo específico do step — "error" continua sendo só a moldura acima.
                        Troca com "virada de página": mode="wait" garante que o conteúdo antigo
                        termina de sair antes do novo começar a entrar, sem sobreposição confusa. */}
                    <AnimatePresence mode="wait">
                        {step === "done" && (
                            <motion.div
                                key="done"
                                variants={stepContentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3, ease: STEP_EASE }}
                                className="w-full flex flex-col items-center"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate("/")}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white mt-2"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                                >
                                    Ir para o início
                                </motion.button>
                            </motion.div>
                        )}

                        {step === "form" && (
                            <motion.div
                                key="form"
                                variants={stepContentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3, ease: STEP_EASE }}
                                className="w-full flex flex-col gap-5"
                            >
                                <div className="w-full flex flex-col gap-2 text-left">
                                    <label className="text-xs text-gray-500 px-1">Nome para a assinatura</label>
                                    <div
                                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                    >
                                        <User size={15} className="text-gray-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={signatureName}
                                            onChange={handleNameChange}
                                            placeholder="Seu nome completo"
                                            disabled={signing}
                                            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>

                                {/* Só aparece quando o dono exigiu documento de identificação ao
                                    adicionar os signatários (ver AddSignatories.jsx). Vira mais uma
                                    evidência gravada com a assinatura, não uma validação de
                                    autenticidade real — ver PdfStampService.appendSignatureCertificate. */}
                                {requireDocument && (
                                    <div className="w-full flex flex-col gap-2 text-left">
                                        <label className="text-xs text-gray-500 px-1">Documento de identificação</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={documentType}
                                                onChange={(e) => { setDocumentType(e.target.value); setDocumentNumber(""); }}
                                                disabled={signing}
                                                className="px-3 rounded-lg text-sm text-white outline-none shrink-0"
                                                style={{ background: "#14141f", border: `1px solid ${BORDER_SOFT}` }}
                                            >
                                                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <div
                                                className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                                            >
                                                <IdCard size={15} className="text-gray-500 shrink-0" />
                                                <input
                                                    type="text"
                                                    inputMode={documentType === "CPF" ? "numeric" : "text"}
                                                    value={documentNumber}
                                                    onChange={handleDocumentNumberChange}
                                                    placeholder={documentType === "CPF" ? "000.000.000-00" : "Número do documento"}
                                                    maxLength={documentType === "CPF" ? 14 : 32}
                                                    disabled={signing}
                                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="w-full flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-left"
                                    style={{ background: "rgba(91,106,240,0.06)", border: "1px solid rgba(91,106,240,0.2)" }}
                                >
                                    <MousePointerClick size={16} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Clique no lugar do documento onde você quer colocar sua assinatura. Você pode
                                        navegar entre as páginas e trocar de lugar quantas vezes quiser antes de confirmar.
                                    </p>
                                </div>

                                <div className="w-full">
                                    <PdfPositionPicker
                                        file={file}
                                        position={position}
                                        onPositionChange={handlePositionChange}
                                        disabled={signing}
                                        signatureImage={signatureImage}
                                        maxPage={data?.document?.contentPageCount}
                                        confirmed={positionConfirmed}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setPositionConfirmed((prev) => !prev)}
                                    disabled={signing || !signatureImage}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-60"
                                    style={{
                                        background: positionConfirmed ? "rgba(91,106,240,0.1)" : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${positionConfirmed ? "rgba(91,106,240,0.4)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <div
                                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                                        style={{
                                            background: positionConfirmed ? ACCENT : "transparent",
                                            border: `1.5px solid ${positionConfirmed ? ACCENT : "rgba(255,255,255,0.25)"}`,
                                        }}
                                    >
                                        <AnimatePresence>
                                            {positionConfirmed && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    <Check size={13} color="#fff" strokeWidth={3} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <span className="text-sm text-white font-medium">Confirmo minha assinatura e a posição selecionada</span>
                                </button>

                                {confirmError && (
                                    <div
                                        className="rounded-xl px-4 py-3 text-sm text-left"
                                        style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                                    >
                                        {confirmError}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: signing || !positionConfirmed || !signatureImage || documentMissing ? 1 : 1.03 }}
                                    whileTap={{ scale: signing || !positionConfirmed || !signatureImage || documentMissing ? 1 : 0.97 }}
                                    disabled={signing || !positionConfirmed || !signatureImage || signatureLoading || documentMissing}
                                    onClick={handleConfirm}
                                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 disabled:opacity-60"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`, boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)" }}
                                >
                                    {signing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Confirmando...
                                        </>
                                    ) : (
                                        <>
                                            <PenLine size={16} />
                                            Confirmar assinatura
                                        </>
                                    )}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
