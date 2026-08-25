import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Padrão mais forte de todos: uma linha de sublinhado é literalmente o campo em
// branco pra assinar, não só uma menção à palavra "assinatura" em algum lugar do
// texto — checado à parte dos demais pra ter prioridade sobre eles (ver o loop
// principal de detectSignaturePosition abaixo).
const UNDERSCORE_PATTERN = /_{5,}/;

// Padrões mais fracos: só indicam que o trecho FALA sobre assinatura, não que
// SEJA o campo de assinatura em si — por isso servem de fallback quando nenhuma
// linha de sublinhado é encontrada na página.
const SIGNATURE_KEYWORDS = [
    /assinatura/i,
    /assinado/i,
    /local\s*e\s*data/i,
    /^nome:/i,
    /^data:/i,
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

        // Coleta TODOS os trechos que batem com algum padrão — em vez de retornar no
        // primeiro match (de cima pra baixo), que pega o primeiro lugar onde a palavra
        // "assinatura" aparece em QUALQUER frase do contrato (ex: "vigência a partir de
        // sua assinatura"), não necessariamente o campo de assinatura de verdade.
        const underscoreMatches = [];
        const keywordMatches = [];

        for (const item of textContent.items) {
            const text = item.str?.trim();
            if (!text) continue;

            if (UNDERSCORE_PATTERN.test(text)) {
                underscoreMatches.push(item);
            } else if (SIGNATURE_KEYWORDS.some((pattern) => pattern.test(text))) {
                keywordMatches.push(item);
            }
        }

        // Linha de sublinhado é o sinal mais forte (é o campo em branco em si) — só cai
        // pras palavras-chave genéricas se a página não tiver nenhuma. Dentro de cada
        // grupo, prefere o match mais próximo do RODAPÉ da página (maior pdfY invertido):
        // campo de assinatura real costuma ser o último, não o primeiro, trecho da
        // página a mencionar assinatura.
        const candidates = underscoreMatches.length > 0 ? underscoreMatches : keywordMatches;
        if (candidates.length === 0) {
            return fallbackPosition(lastPageNum);
        }

        const best = candidates.reduce((lowest, item) =>
            item.transform[5] < lowest.transform[5] ? item : lowest
        );

        const pdfX = best.transform[4];
        const pdfY = best.transform[5];

        // Eixo Y do PDF cresce de baixo pra cima — inverte pra bater com coordenadas de tela (topo = 0).
        const normalizedX = clamp(pdfX / viewport.width, MIN_COORD, MAX_COORD);
        const normalizedY = clamp(1 - pdfY / viewport.height, MIN_COORD, MAX_COORD);

        return { page: lastPageNum, x: normalizedX, y: normalizedY, source: 'heuristic' };
    } catch (err) {
        console.error('[SignaturePositionService.detectSignaturePosition]', err);
        return { page: 1, x: 0.5, y: 0.8, source: 'error-fallback' };
    }
}
