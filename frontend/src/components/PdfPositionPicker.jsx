// Mostra o PDF (renderizado via pdfjs-dist) e permite clicar/tocar pra escolher
// onde a assinatura deve ficar. Começa pré-posicionado na sugestão vinda do backend
// (heurística de palavras-chave), mas o usuário pode sobrescrever a qualquer momento.
import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, PenLine } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ACCENT = "#5b6af0";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
}

export default function PdfPositionPicker({ file, position, onPositionChange, disabled }) {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rendering, setRendering] = useState(false);

    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);

    // Carrega o PDF a partir do blob recebido
    useEffect(() => {
        if (!file) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                if (cancelled) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                // Começa na página sugerida (ou na última, se a sugestão vier fora do intervalo)
                const startPage = position?.page && position.page >= 1 && position.page <= pdf.numPages
                    ? position.page
                    : pdf.numPages;
                setCurrentPage(startPage);
            } catch (err) {
                console.error('[PdfPositionPicker.load]', err);
                if (!cancelled) setError("Não foi possível carregar o documento.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    // Renderiza a página atual no canvas
    useEffect(() => {
        if (!pdfDoc || !currentPage) return;
        let cancelled = false;

        async function render() {
            setRendering(true);
            try {
                const page = await pdfDoc.getPage(currentPage);
                const unscaledViewport = page.getViewport({ scale: 1 });
                const containerWidth = wrapperRef.current?.clientWidth || 480;
                const scale = containerWidth / unscaledViewport.width;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext("2d");
                await page.render({ canvasContext: ctx, viewport }).promise;
            } catch (err) {
                console.error('[PdfPositionPicker.render]', err);
                if (!cancelled) setError("Não foi possível exibir a página do documento.");
            } finally {
                if (!cancelled) setRendering(false);
            }
        }

        render();
        return () => { cancelled = true; };
    }, [pdfDoc, currentPage]);

    const handlePick = (e) => {
        if (disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clamp01((clientX - rect.left) / rect.width);
        const y = clamp01((clientY - rect.top) / rect.height);

        onPositionChange({ page: currentPage, x, y });
    };

    const goToPage = (delta) => {
        setCurrentPage((prev) => Math.min(Math.max(prev + delta, 1), numPages));
    };

    const markerOnThisPage = position?.page === currentPage;

    return (
        <div className="flex flex-col gap-2.5">
            <div
                ref={wrapperRef}
                className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER_SOFT}`, minHeight: 240 }}
            >
                {loading ? (
                    <Loader2 size={22} className="text-white animate-spin my-16" />
                ) : error ? (
                    <div className="flex flex-col items-center gap-2 text-center px-4 py-12">
                        <AlertCircle size={18} style={{ color: "#f87171" }} />
                        <p className="text-xs text-gray-400">{error}</p>
                    </div>
                ) : (
                    <div
                        className="relative"
                        onClick={handlePick}
                        onTouchEnd={handlePick}
                        style={{ cursor: disabled ? "default" : "crosshair", touchAction: "manipulation" }}
                    >
                        <canvas ref={canvasRef} className="block w-full h-auto" />

                        {rendering && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(11,11,18,0.5)" }}>
                                <Loader2 size={18} className="text-white animate-spin" />
                            </div>
                        )}

                        {markerOnThisPage && !rendering && (
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
                    </div>
                )}
            </div>

            {!loading && !error && numPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => goToPage(-1)}
                        disabled={currentPage <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        style={{ border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-gray-500">
                        Página {currentPage} de {numPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => goToPage(1)}
                        disabled={currentPage >= numPages}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        style={{ border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {!loading && !error && !disabled && (
                <p className="text-xs text-gray-500 text-center">
                    Toque no documento para reposicionar sua assinatura, se preferir.
                </p>
            )}
        </div>
    );
}
