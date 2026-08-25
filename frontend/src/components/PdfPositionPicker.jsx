// Composição sobre o PdfViewer genérico: adiciona a lógica de ESCOLHER onde a
// assinatura deve ficar no documento — clique/toque pra marcar a posição e o
// overlay do marcador. Renderização do PDF e navegação de página ficam por
// conta do PdfViewer; aqui só cuidamos do que é específico do fluxo de assinatura.
// Começa pré-posicionado na sugestão vinda do backend (heurística de palavras-
// chave), mas o usuário pode sobrescrever a qualquer momento. `maxPage` (quando
// vem preenchido — ver `document.contentPageCount` em SignScreen.jsx/PublicSign.jsx)
// trunca a navegação do PdfViewer antes de qualquer página de certificado de
// assinatura já anexada por uma rodada anterior, então nem dá pra chegar nela
// pra clicar — o backend (SignatoryService.signDocument) já clampava a posição
// nesse caso, isso aqui só evita a UX confusa de deixar escolher ali primeiro.
import React, { useState, useEffect } from "react";
import { PenLine } from "lucide-react";
import PdfViewer from "./PdfViewer";

const ACCENT = "#5b6af0";

// Mesma proporção usada no backend (backend/Service/PdfStampService.js,
// STAMP_WIDTH_RATIO) — precisa bater nos dois lados pra prévia aqui e o carimbo
// final no PDF ficarem do mesmo tamanho relativo à página.
const STAMP_WIDTH_PERCENT = "28%";

export default function PdfPositionPicker({ file, position, onPositionChange, disabled, signatureImage, maxPage }) {
    // O PdfViewer trabalha com URL, não com o Blob em si — gera uma blob: URL
    // pro arquivo recebido e revoga a anterior sempre que o arquivo mudar/desmontar.
    const [fileUrl, setFileUrl] = useState(null);
    useEffect(() => {
        if (!file) {
            setFileUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Espelha a página atual exibida pelo PdfViewer, só pra saber se o marcador
    // de posição deve aparecer (ele só faz sentido na página em que foi colocado).
    const [currentPage, setCurrentPage] = useState(position?.page || 1);

    const markerOnThisPage = position?.page === currentPage;

    return (
        <div className="flex flex-col gap-2.5">
            <PdfViewer
                pdfUrl={fileUrl}
                initialPage={position?.page}
                maxPage={maxPage}
                onPageChange={setCurrentPage}
                onCanvasClick={disabled ? undefined : onPositionChange}
            >
                {markerOnThisPage && signatureImage && (
                    // Prévia WYSIWYG: mesma âncora (centralizada no ponto clicado) e
                    // mesma proporção de largura que o backend usa pra carimbar de verdade.
                    <img
                        src={signatureImage}
                        alt="Assinatura"
                        className="absolute pointer-events-none"
                        style={{
                            left: `${position.x * 100}%`,
                            top: `${position.y * 100}%`,
                            width: STAMP_WIDTH_PERCENT,
                            transform: "translate(-50%, -50%)",
                        }}
                    />
                )}

                {markerOnThisPage && !signatureImage && (
                    <div
                        className="absolute flex flex-col items-center pointer-events-none"
                        style={{
                            left: `${position.x * 100}%`,
                            top: `${position.y * 100}%`,
                            transform: "translate(-50%, -100%)",
                        }}
                    >
                        <div
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white whitespace-nowrap"
                            style={{ background: ACCENT, boxShadow: "0 4px 12px rgba(91,106,240,0.4)" }}
                        >
                            <PenLine size={11} />
                            Assinatura
                        </div>
                        <div
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: "5px solid transparent",
                                borderRight: "5px solid transparent",
                                borderTop: `6px solid ${ACCENT}`,
                            }}
                        />
                    </div>
                )}
            </PdfViewer>

            {/* Simplificação da extração: sem visibilidade sobre loading/error internos do
                PdfViewer aqui fora, então a dica considera só "já temos um arquivo pra mostrar". */}
            {!disabled && fileUrl && (
                <p className="text-xs text-gray-500 text-center">
                    Toque no documento para reposicionar sua assinatura, se preferir.
                </p>
            )}
        </div>
    );
}
