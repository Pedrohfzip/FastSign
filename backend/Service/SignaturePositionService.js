import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Padrões de texto que costumam aparecer perto de onde a assinatura deveria ir.
const SIGNATURE_KEYWORDS = [
    /assinatura/i,
    /assinado/i,
    /local\s*e\s*data/i,
    /^nome:/i,
    /^data:/i,
    /_{5,}/, // linha de sublinhado (campo em branco pra preencher/assinar)
];

const MIN_COORD = 0.1;
const MAX_COORD = 0.9;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Fallback usado quando não encontramos nenhuma pista de posição na última página.
function fallbackPosition(page) {
    return { page, x: 0.5, y: 0.8, source: 'fallback' };
}

/**
 * Detecta, via heurística de palavras-chave sobre o texto extraído do PDF (sem IA),
 * uma posição sugerida para a assinatura na última página do documento.
 */
export async function detectSignaturePosition(buffer) {
    try {
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        const lastPageNum = pdf.numPages;
        const page = await pdf.getPage(lastPageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
            const text = item.str?.trim();
            if (!text) continue;

            const matched = SIGNATURE_KEYWORDS.some((pattern) => pattern.test(text));
            if (!matched) continue;

            const pdfX = item.transform[4];
            const pdfY = item.transform[5];

            // Eixo Y do PDF cresce de baixo pra cima — inverte pra bater com coordenadas de tela (topo = 0).
            const normalizedX = clamp(pdfX / viewport.width, MIN_COORD, MAX_COORD);
            const normalizedY = clamp(1 - pdfY / viewport.height, MIN_COORD, MAX_COORD);

            return { page: lastPageNum, x: normalizedX, y: normalizedY, source: 'heuristic' };
        }

        return fallbackPosition(lastPageNum);
    } catch (err) {
        console.error('[SignaturePositionService.detectSignaturePosition]', err);
        return { page: 1, x: 0.5, y: 0.8, source: 'error-fallback' };
    }
}
