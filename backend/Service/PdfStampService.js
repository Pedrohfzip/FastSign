import { PDFDocument } from 'pdf-lib';

// Mesma proporção usada no frontend (frontend/src/components/PdfPositionPicker.jsx,
// `width: "28%"` na prévia) — precisa bater nos dois lados pra prévia e carimbo final
// ficarem do mesmo tamanho. Fração da LARGURA DA PÁGINA, não um valor fixo em pontos,
// pra funcionar em A4, Letter, etc.
const STAMP_WIDTH_RATIO = 0.28;

// Mesmo fallback usado em SignController.getByToken quando não há sugestão de posição.
const DEFAULT_POSITION = { page: null, x: 0.5, y: 0.8 };

function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
}

function decodeImageDataUrl(imageDataUrl) {
    const match = /^data:image\/png;base64,(.+)$/.exec(imageDataUrl || '');
    if (!match) {
        const err = new Error('Imagem de assinatura em formato inválido.');
        err.statusCode = 400;
        throw err;
    }
    return Buffer.from(match[1], 'base64');
}

/**
 * Carimba a imagem de assinatura (PNG, base64 data URL) no PDF, centralizada no
 * ponto indicado por `position` (coordenadas normalizadas 0-1, y=0 no topo da
 * página — mesma convenção de SignaturePositionService). Retorna o PDF resultante
 * como Buffer, pronto pra ser salvo como uma nova DocumentVersion.
 */
export async function stampSignatureImage(pdfBuffer, { imageDataUrl, position }) {
    const imageBytes = decodeImageDataUrl(imageDataUrl);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pngImage = await pdfDoc.embedPng(imageBytes);

    // Resolve a página alvo: usa a sugerida se for válida, senão cai pra última página
    // (mesmo fallback que o picker no frontend já usa quando a sugestão vem fora do intervalo).
    const requestedPage = position?.page;
    const pageIndex = requestedPage && requestedPage >= 1 && requestedPage <= pageCount
        ? requestedPage - 1
        : pageCount - 1;
    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const x = clamp01(position?.x ?? DEFAULT_POSITION.x);
    const y = clamp01(position?.y ?? DEFAULT_POSITION.y);

    const stampWidth = pageWidth * STAMP_WIDTH_RATIO;
    const stampHeight = stampWidth * (pngImage.height / pngImage.width);

    // Centraliza no ponto clicado. Eixo Y do PDF cresce de baixo pra cima — inverte
    // pra bater com a convenção de tela (y=0 no topo) usada em `position`.
    const centerXPdf = x * pageWidth;
    const centerYPdf = (1 - y) * pageHeight;

    let drawX = centerXPdf - stampWidth / 2;
    let drawY = centerYPdf - stampHeight / 2;

    // O clique no frontend só é clamped em [0,1] (não numa margem segura), então um
    // clique bem na borda não pode deixar o carimbo sair da página e ser cortado.
    drawX = Math.min(Math.max(drawX, 0), Math.max(pageWidth - stampWidth, 0));
    drawY = Math.min(Math.max(drawY, 0), Math.max(pageHeight - stampHeight, 0));

    page.drawImage(pngImage, { x: drawX, y: drawY, width: stampWidth, height: stampHeight });

    const stampedBytes = await pdfDoc.save();
    return { buffer: Buffer.from(stampedBytes), pageCount };
}
