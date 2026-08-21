// Central de ajuda — FAQ estático (sem backend), com busca client-side e acordeões.
// Acessível pelo menu do Header (ícone hamburguer → "Ajuda"). "Voltar" usa histórico
// (navigate(-1)) de propósito: essa tela é aberta a partir de QUALQUER página via o menu
// global, então não existe um "pai" fixo na hierarquia — diferente de MyDocuments.jsx,
// que é sempre um hub e por isso tem destino fixo pro Voltar.
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
    HelpCircle,
    Search,
    ArrowLeft,
    ChevronDown,
    Upload,
    Users,
    PenLine,
    ShieldCheck,
    Mail,
} from "lucide-react";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

const CATEGORIES = [
    {
        key: "sending",
        label: "Enviando documentos",
        icon: Upload,
        items: [
            {
                q: "Como envio um documento para assinatura?",
                a: 'No menu, vá em "Meus documentos" e depois em "Enviar" (ou acesse diretamente a tela de upload). Arraste o PDF ou clique para selecionar, confirme o envio e você já cai direto na etapa de adicionar signatários.',
            },
            {
                q: "Que tipo de arquivo eu posso enviar?",
                a: "Só arquivos em PDF, por enquanto. É o formato que garante que o documento fique com a mesma aparência pra todo mundo que for assinar, independente do dispositivo.",
            },
            {
                q: "Quem pode assinar um documento que eu enviei?",
                a: 'Qualquer pessoa que você adicionar como signatário na etapa "Quem precisa assinar?" — basta o nome e o e-mail. Se o e-mail bater com a sua própria conta, você também entra automaticamente como signatário.',
            },
            {
                q: "Dá pra editar o documento depois de enviado?",
                a: "O conteúdo do PDF em si não é editável pela plataforma — a ideia é que o arquivo enviado já seja a versão final. Você pode, porém, reposicionar onde cada assinatura vai ser carimbada antes de confirmar.",
            },
        ],
    },
    {
        key: "signing",
        label: "Assinando documentos",
        icon: PenLine,
        items: [
            {
                q: "Como um signatário recebe o link para assinar?",
                a: "Por e-mail, assim que você adiciona os signatários. O link é único para cada pessoa e leva direto para a tela de assinatura daquele documento específico — não precisa criar conta para assinar.",
            },
            {
                q: "Como eu escolho onde a assinatura aparece no documento?",
                a: "A plataforma já sugere um local (geralmente perto de onde o documento pede uma assinatura), mas você pode navegar pelas páginas e tocar em qualquer outro ponto do PDF para reposicionar — a prévia mostra exatamente como vai ficar.",
            },
            {
                q: "Posso assinar meu próprio documento?",
                a: 'Sim. Ao adicionar signatários, marque "Eu também vou assinar" — você aparece na lista como mais um signatário, do jeito que os outros.',
            },
            {
                q: "Não recebi o e-mail com o link de assinatura. O que eu faço?",
                a: "Confira a caixa de spam primeiro. Se ainda assim não aparecer, peça para quem enviou o documento reenviar o link — ele consegue encontrá-lo na tela de detalhes do documento.",
            },
            {
                q: "O que acontece depois que todo mundo assina?",
                a: 'O documento muda automaticamente para "Concluído" e passa a aparecer na aba "Finalizados", com a versão final já carimbada com todas as assinaturas disponível para download.',
            },
        ],
    },
    {
        key: "security",
        label: "Segurança e validade",
        icon: ShieldCheck,
        items: [
            {
                q: "A assinatura eletrônica do FastSign tem validade jurídica?",
                a: 'Funciona como uma "assinatura eletrônica simples", reconhecida pela legislação brasileira (MP 2.200-2/2001 e Lei 14.063/2020) para acordos entre partes que consentem com esse meio — sem exigir certificado digital ICP-Brasil. Não é o mesmo nível de uma assinatura digital certificada, então para documentos que exigem certificação oficial, procure uma solução com certificado ICP-Brasil.',
            },
            {
                q: "O que é o certificado de assinaturas anexado ao final do PDF?",
                a: "É uma página extra que a plataforma adiciona automaticamente ao documento assim que a primeira pessoa assina, listando nome, e-mail, data/hora, IP e o hash de integridade de cada signatário — a prova de que aquele PDF específico foi mesmo assinado por aquelas pessoas.",
            },
            {
                q: "O que é esse hash que aparece no certificado?",
                a: "Uma impressão digital (SHA-256) calculada sobre o conteúdo exato do documento no momento em que cada pessoa assinou. Se o arquivo for alterado depois, o hash não bate mais — é assim que dá para verificar que nada foi modificado.",
            },
            {
                q: "Meus documentos ficam visíveis para outras pessoas?",
                a: "Não. Só você (dono do documento) e os signatários que você adicionou têm acesso, cada um pelo seu link único. Documentos excluídos saem das suas listagens, mas os registros de assinatura já confirmados são preservados como evidência.",
            },
        ],
    },
];

export default function Help() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [openKey, setOpenKey] = useState(null);

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return CATEGORIES;

        return CATEGORIES.map((cat) => ({
            ...cat,
            items: cat.items.filter(
                (item) => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)
            ),
        })).filter((cat) => cat.items.length > 0);
    }, [search]);

    const toggleItem = (itemKey) => {
        setOpenKey((prev) => (prev === itemKey ? null : itemKey));
    };

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
                <div className="w-full max-w-lg flex flex-col gap-5 pb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    <div className="flex flex-col items-center text-center gap-2 mb-1">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <HelpCircle size={18} style={{ color: ACCENT }} />
                        </div>
                        <h1 className="text-2xl font-semibold text-white">Central de ajuda</h1>
                        <p className="text-sm text-gray-400 max-w-sm">
                            Dúvidas comuns sobre enviar, assinar e proteger seus documentos no FastSign.
                        </p>
                    </div>

                    <div
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <Search size={16} className="text-gray-500 shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por uma dúvida..."
                            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                        />
                    </div>

                    {filteredCategories.length === 0 ? (
                        <div
                            className="rounded-xl px-6 py-10 text-center text-sm text-gray-400"
                            style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER_SOFT}` }}
                        >
                            Nenhuma pergunta encontrada para "{search}".
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {filteredCategories.map((cat) => {
                                const CatIcon = cat.icon;
                                return (
                                    <div key={cat.key} className="flex flex-col gap-2.5">
                                        <div className="flex items-center gap-2 px-1">
                                            <CatIcon size={14} style={{ color: ACCENT }} />
                                            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                {cat.label}
                                            </h2>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {cat.items.map((item, i) => {
                                                const itemKey = `${cat.key}-${i}`;
                                                const isOpen = openKey === itemKey;
                                                return (
                                                    <div
                                                        key={itemKey}
                                                        className="rounded-xl overflow-hidden"
                                                        style={{
                                                            background: "rgba(255,255,255,0.03)",
                                                            border: `1px solid ${isOpen ? "rgba(91,106,240,0.35)" : BORDER_SOFT}`,
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleItem(itemKey)}
                                                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                                                        >
                                                            <span className="text-sm font-medium text-white">{item.q}</span>
                                                            <motion.span
                                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="shrink-0"
                                                            >
                                                                <ChevronDown size={15} className="text-gray-500" />
                                                            </motion.span>
                                                        </button>

                                                        <AnimatePresence initial={false}>
                                                            {isOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                                                    style={{ overflow: "hidden" }}
                                                                >
                                                                    <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">
                                                                        {item.a}
                                                                    </p>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div
                        className="flex items-start gap-3 px-4 py-4 rounded-xl mt-2"
                        style={{ background: ACCENT_SOFT, border: "1px solid rgba(91,106,240,0.25)" }}
                    >
                        <Mail size={16} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-medium text-white">Não encontrou o que precisava?</p>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                O FastSign é um projeto pessoal em evolução constante — sinta-se à vontade para
                                explorar a plataforma e reportar qualquer coisa estranha que encontrar pelo caminho.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
