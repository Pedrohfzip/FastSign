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
import React, { useState, useEffect, useRef } from "react";
import { PenLine } from "lucide-react";
import PdfViewer from "./PdfViewer";

const ACCENT = "#5b6af0";

// Espelhadas em backend/Service/PdfStampService.js (STAMP_WIDTH_RATIO /
// MIN_STAMP_WIDTH_RATIO) — precisam bater nos dois lados pra prévia aqui e o
// carimbo final no PDF ficarem do mesmo tamanho relativo à página. O usuário só
// pode DIMINUIR a assinatura a partir do padrão (arrastando o handle de resize),
// nunca aumentar além dele.
export const DEFAULT_STAMP_WIDTH_RATIO = 0.28;
export const MIN_STAMP_WIDTH_RATIO = 0.12;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export default function PdfPositionPicker({ file, position, onPositionChange, disabled, signatureImage, maxPage, confirmed }) {
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
    const widthRatio = position?.widthRatio ?? DEFAULT_STAMP_WIDTH_RATIO;

    // Referência de tamanho (em pixels) pro cálculo do arrasto de resize — este
    // wrapper ocupa exatamente a área renderizada do canvas do PdfViewer (mesmo
    // sistema de coordenadas que PdfViewer.handleClick já usa pro clique).
    const overlayRef = useRef(null);

    // Proporção real da imagem de assinatura (altura/largura), capturada quando ela
    // carrega — evita depender de uma constante hardcoded do tamanho do canvas em
    // useSignatureImage.js.
    const [imageAspect, setImageAspect] = useState(260 / 800);

    const showResizeHandle = markerOnThisPage && signatureImage && !confirmed && !disabled;

    const handleResizeStart = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const overlayWidthPx = overlayRef.current?.getBoundingClientRect().width || 1;
        const startX = e.clientX;
        const startRatio = widthRatio;

        // O navegador ainda dispara um `click` sintético ao soltar o botão sobre o
        // canvas depois de um arrasto — sem isso, um resize terminaria reposicionando
        // sem querer a assinatura (o PdfViewer trata clique como "mover pra cá").
        const suppressNextClick = (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
        };
        window.addEventListener("click", suppressNextClick, { capture: true, once: true });

        const handleMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            // Fator 2: a assinatura é centralizada no ponto clicado, então mudar a
            // largura desloca cada borda apenas pela metade do delta arrastado.
            const deltaRatio = (2 * deltaX) / overlayWidthPx;
            const nextRatio = clamp(startRatio + deltaRatio, MIN_STAMP_WIDTH_RATIO, DEFAULT_STAMP_WIDTH_RATIO);
            onPositionChange({ ...position, widthRatio: nextRatio });
        };

        const handleUp = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
    };

    return (
        <div className="flex flex-col gap-2.5">
            <PdfViewer
                pdfUrl={fileUrl}
                initialPage={position?.page}
                maxPage={maxPage}
                onPageChange={setCurrentPage}
                onCanvasClick={disabled ? undefined : onPositionChange}
            >
                <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
                    {markerOnThisPage && signatureImage && (
                        // Prévia WYSIWYG: mesma âncora (centralizada no ponto clicado) e
                        // mesma proporção de largura que o backend usa pra carimbar de verdade.
                        // Enquanto não confirmada, ganha uma borda tracejada + handle de resize;
                        // ao confirmar/colar, some tudo e fica só a imagem no tamanho escolhido.
                        <div
                            className="absolute"
                            style={{
                                left: `${position.x * 100}%`,
                                top: `${position.y * 100}%`,
                                width: `${widthRatio * 100}%`,
                                aspectRatio: `1 / ${imageAspect}`,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: showResizeHandle ? "auto" : "none",
                            }}
                        >
                            {!confirmed && !disabled && (
                                <div
                                    className="absolute inset-0 rounded-sm pointer-events-none"
                                    style={{ border: `1.5px dashed ${ACCENT}` }}
                                />
                            )}
                            <img
                                src={signatureImage}
                                alt="Assinatura"
                                draggable={false}
                                onLoad={(e) => {
                                    const { naturalWidth, naturalHeight } = e.target;
                                    if (naturalWidth && naturalHeight) setImageAspect(naturalHeight / naturalWidth);
                                }}
                                className="w-full h-full pointer-events-none select-none"
                            />
                            {showResizeHandle && (
                                <div
                                    onPointerDown={handleResizeStart}
                                    className="absolute rounded-full"
                                    style={{
                                        right: -6,
                                        bottom: -6,
                                        width: 14,
                                        height: 14,
                                        background: ACCENT,
                                        boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
                                        cursor: "nwse-resize",
                                        touchAction: "none",
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {markerOnThisPage && !signatureImage && (
                        <div
                            className="absolute flex flex-col items-center"
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
                </div>
            </PdfViewer>

            {/* Simplificação da extração: sem visibilidade sobre loading/error internos do
                PdfViewer aqui fora, então a dica considera só "já temos um arquivo pra mostrar". */}
            {!disabled && fileUrl && (
                <p className="text-xs text-gray-500 text-center">
                    Toque no documento para reposicionar sua assinatura, ou arraste o canto para
                    diminuir o tamanho.
                </p>
            )}
        </div>
    );
}
