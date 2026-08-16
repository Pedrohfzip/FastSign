// Visualizador de PDF genérico — renderiza a página atual via pdfjs-dist num
// <canvas>, com navegação por botões (anterior/próxima). Sem NENHUMA lógica de
// assinatura: quem precisar de overlays por cima do documento (ex: o marcador
// de posição de assinatura em PdfPositionPicker.jsx) compõe usando `children`
// (renderizado sobre o canvas) + `onCanvasClick` (clique/toque no documento) +
// `onPageChange` (avisa a página atual pra quem estiver controlando o overlay).
// Sem esses callbacks, o componente já funciona só-leitura por padrão.
import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BORDER_SOFT = "rgba(255,255,255,0.07)";

function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
}

export default function PdfViewer({ pdfUrl, initialPage, onPageChange, onCanvasClick, children }) {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rendering, setRendering] = useState(false);

    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);

    // Carrega o PDF a partir da URL recebida (pode ser um blob: URL local ou uma URL http)
    useEffect(() => {
        if (!pdfUrl) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
                if (cancelled) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                // Começa na página sugerida (ou na última, se a sugestão vier fora do intervalo)
                const startPage = initialPage && initialPage >= 1 && initialPage <= pdf.numPages
                    ? initialPage
                    : pdf.numPages;
                setCurrentPage(startPage);
            } catch (err) {
                console.error('[PdfViewer.load]', err);
                if (!cancelled) setError("Não foi possível carregar o documento.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfUrl]);

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
                console.error('[PdfViewer.render]', err);
                if (!cancelled) setError("Não foi possível exibir a página do documento.");
            } finally {
                if (!cancelled) setRendering(false);
            }
        }

        render();
        return () => { cancelled = true; };
    }, [pdfDoc, currentPage]);

    // Avisa quem estiver escutando toda vez que a página exibida muda (inclusive no load inicial)
    useEffect(() => {
        onPageChange?.(currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Só fica clicável se alguém estiver de fato escutando o clique — é isso que
    // faz o viewer ser "só-leitura" por padrão (ex: preview no upload), sem
    // precisar de nenhuma prop extra tipo `readOnly`.
    const clickable = Boolean(onCanvasClick);

    const handleClick = (e) => {
        if (!onCanvasClick) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clamp01((clientX - rect.left) / rect.width);
        const y = clamp01((clientY - rect.top) / rect.height);

        onCanvasClick({ page: currentPage, x, y });
    };

    const goToPage = (delta) => {
        setCurrentPage((prev) => Math.min(Math.max(prev + delta, 1), numPages));
    };

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
                        onClick={handleClick}
                        onTouchEnd={handleClick}
                        style={{ cursor: clickable ? "crosshair" : "default", touchAction: "manipulation" }}
                    >
                        <canvas ref={canvasRef} className="block w-full h-auto" />

                        {rendering && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(11,11,18,0.5)" }}>
                                <Loader2 size={18} className="text-white animate-spin" />
                            </div>
                        )}

                        {!rendering && children}
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
                        title="Página anterior"
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
                        title="Próxima página"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
