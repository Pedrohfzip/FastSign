import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Mesma proporção usada no frontend (frontend/src/components/PdfPositionPicker.jsx,
// DEFAULT_STAMP_WIDTH_RATIO) — é o valor padrão (nenhum `position.widthRatio` no
// payload) E o teto máximo permitido: o usuário só pode DIMINUIR a assinatura na
// prévia, nunca aumentar além disso. Fração da LARGURA DA PÁGINA, não um valor fixo
// em pontos, pra funcionar em A4, Letter, etc.
const STAMP_WIDTH_RATIO = 0.28;

// Espelha MIN_STAMP_WIDTH_RATIO do frontend — piso de segurança pro tamanho do
// carimbo. Como `POST /sign/:token` é uma rota pública (signatário externo, sem
// login), o clamp aqui é obrigatório mesmo que o frontend já limite o arrasto:
// nada impede um cliente malicioso de mandar um `widthRatio` arbitrário.
const MIN_STAMP_WIDTH_RATIO = 0.12;

// Mesmo fallback usado em SignController.getByToken quando não há sugestão de posição.
const DEFAULT_POSITION = { page: null, x: 0.5, y: 0.8 };

function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
}

function clampRange(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return max;
    return Math.min(Math.max(num, min), max);
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

    // `widthRatio` vem da prévia no frontend (o quanto o usuário encolheu a
    // assinatura arrastando a borda) — clampado de novo aqui por segurança, com
    // fallback pro tamanho padrão de sempre quando o campo não vier no payload.
    const widthRatio = clampRange(position?.widthRatio ?? STAMP_WIDTH_RATIO, MIN_STAMP_WIDTH_RATIO, STAMP_WIDTH_RATIO);
    const stampWidth = pageWidth * widthRatio;
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

/** Número de páginas de um PDF, sem nenhuma outra transformação. */
export async function getPdfPageCount(pdfBuffer) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
}

/**
 * Remove as páginas finais além de `keepCount`. Usado pra tirar o(s) certificado(s)
 * de assinatura anexados numa rodada anterior antes de carimbar a nova assinatura e
 * gerar um certificado atualizado — sem isso, cada nova assinatura empilharia mais um
 * certificado por cima do anterior em vez de substituí-lo.
 */
export async function stripTrailingPages(pdfBuffer, keepCount) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const total = pdfDoc.getPageCount();
    for (let i = total - 1; i >= keepCount; i--) {
        pdfDoc.removePage(i);
    }
    return Buffer.from(await pdfDoc.save());
}

// ---------------------------------------------------------------------------
// Certificado de assinaturas
// ---------------------------------------------------------------------------

const CERT_MARGIN = 48;
const ACCENT_RGB = rgb(0.357, 0.416, 0.941); // #5b6af0
const ACCENT_DARK_RGB = rgb(0.204, 0.161, 0.749); // tom mais escuro do gradiente (#3429bf aprox)
const SUCCESS_RGB = rgb(0.29, 0.871, 0.502); // #4ade80
const TEXT_DARK_RGB = rgb(0.09, 0.09, 0.13);
const TEXT_MUTED_RGB = rgb(0.42, 0.42, 0.5);
const BORDER_RGB = rgb(0.85, 0.85, 0.9);
const CARD_BG_RGB = rgb(0.975, 0.975, 0.99);
const WHITE_RGB = rgb(1, 1, 1);

function formatDateTime(date) {
    const d = new Date(date);
    const datePart = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(d);
    return `${datePart} às ${timePart} (horário de Brasília)`;
}

const SIGNATURE_TYPE_LABELS = {
    TYPED: 'Assinatura digitada',
    DRAWN: 'Assinatura desenhada',
    UPLOADED: 'Assinatura enviada como imagem',
};

const DOCUMENT_TYPE_LABELS = {
    CPF: 'CPF',
    RG: 'RG',
    OUTRO: 'Documento',
};

// Código do primeiro caractere que a WinAnsiEncoding (usada pelas fontes padrão do
// PDF — Helvetica, Courier) já não sabe mais desenhar de forma confiável acima da
// faixa ASCII imprimível.
const WINANSI_SAFE_MAX_CODE = 0xff;

// Pontuação "tipográfica" comum (aspas curvas, travessão, meia-risca, reticências,
// marcador de lista) que a WinAnsiEncoding cobre através de posições especiais
// (0x80-0x9F do cp1252), mesmo tendo um code point Unicode bem acima de 0xFF — sem
// essa lista, esses caracteres (usados nos próprios textos fixos deste arquivo)
// cairiam no filtro genérico abaixo e virariam "?".
const WINANSI_EXTRA_CODEPOINTS = new Set([
    0x2013, // – en dash
    0x2014, // — em dash
    0x2018, // ' aspas simples esquerda
    0x2019, // ' aspas simples direita
    0x201c, // " aspas duplas esquerda
    0x201d, // " aspas duplas direita
    0x2022, // • marcador de lista
    0x2026, // … reticências
    0x20ac, // € euro
]);

/**
 * As fontes padrão do PDF só sabem desenhar caracteres cobertos pela WinAnsiEncoding
 * (ASCII + Latin-1 + a pontuação tipográfica listada acima) — qualquer coisa fora
 * disso (emoji, CJK, ou até caracteres de controle vindos de um nome de arquivo com
 * encoding corrompido) faz `drawText` lançar exceção. Como o certificado é gerado
 * DENTRO da transação de assinatura, um erro aqui bloquearia a assinatura inteira —
 * por isso todo texto vindo de dado do usuário (título do documento, nome, e-mail)
 * passa por aqui antes de ser desenhado. Percorre por code point (não por regex) pra
 * não depender de nenhuma classe de caracteres Unicode escrita à mão.
 */
function sanitizePdfText(value) {
    const str = String(value ?? '');
    let out = '';
    for (const ch of str) {
        const code = ch.codePointAt(0);
        // Caracteres de controle (C0 e C1) não têm glifo — melhor remover que
        // desenhar um "?" no lugar de algo que nem deveria aparecer.
        if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
        out += (code <= WINANSI_SAFE_MAX_CODE || WINANSI_EXTRA_CODEPOINTS.has(code)) ? ch : '?';
    }
    return out;
}

function wrapText(text, font, size, maxWidth) {
    const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
}

/**
 * Desenha um ícone simples de "check" dentro de um círculo verde — sem depender de
 * nenhuma fonte de ícones/emoji (nem sempre disponível nas fontes padrão do PDF).
 */
function drawCheckBadge(page, { x, y, radius = 9 }) {
    page.drawCircle({ x, y, size: radius, color: SUCCESS_RGB });
    page.drawLine({
        start: { x: x - radius * 0.45, y: y - radius * 0.05 },
        end: { x: x - radius * 0.1, y: y - radius * 0.4 },
        thickness: 1.6,
        color: WHITE_RGB,
    });
    page.drawLine({
        start: { x: x - radius * 0.1, y: y - radius * 0.4 },
        end: { x: x + radius * 0.5, y: y + radius * 0.35 },
        thickness: 1.6,
        color: WHITE_RGB,
    });
}

/**
 * Desenha um ícone simples de cadeado (segurança/integridade) usado no rodapé.
 */
function drawLockIcon(page, { x, y, size = 8, color = ACCENT_RGB }) {
    page.drawRectangle({
        x: x - size / 2,
        y: y - size * 0.55,
        width: size,
        height: size * 0.75,
        color,
    });
    page.drawEllipse({
        x,
        y: y + size * 0.2,
        xScale: size * 0.32,
        yScale: size * 0.32,
        borderColor: color,
        borderWidth: 1.4,
    });
}

/**
 * Anexa ao final do PDF uma ou mais páginas de "Certificado de Assinaturas": lista
 * cada signatário com nome, e-mail, data/hora, tipo de assinatura, IP e o hash
 * SHA-256 do documento no exato momento em que ele assinou — a mesma hash já
 * registrada em `Signature.documentHash`, que serve de prova de integridade (qualquer
 * alteração no conteúdo do documento depois desse instante muda a hash).
 *
 * Só deve ser chamada quando `entries` tem pelo menos 1 assinatura — chamar sem
 * nenhuma seria adicionar um certificado vazio, sem sentido.
 */
export async function appendSignatureCertificate(pdfBuffer, { documentTitle, documentId, entries, totalSignatories }) {
    if (!entries || entries.length === 0) {
        throw new Error('appendSignatureCertificate chamado sem nenhuma assinatura.');
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const referenceSize = pdfDoc.getPage(0).getSize();
    const pageWidth = referenceSize.width;
    const pageHeight = Math.max(referenceSize.height, 700); // nunca uma página baixa demais pra caber o layout

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const contentWidth = pageWidth - CERT_MARGIN * 2;
    const generatedAt = formatDateTime(new Date());
    const verificationCode = (documentId || '').replace(/-/g, '').slice(0, 12).toUpperCase();
    const safeDocumentTitle = sanitizePdfText(documentTitle);

    let page;
    let cursorY;
    let pageNumber = 0;
    const embeddedImageCache = new Map();

    function drawHeader({ continuation }) {
        pageNumber += 1;
        page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Faixa de topo com a cor de marca do FastSign.
        page.drawRectangle({ x: 0, y: pageHeight - 86, width: pageWidth, height: 86, color: ACCENT_DARK_RGB });
        page.drawRectangle({ x: 0, y: pageHeight - 86, width: pageWidth, height: 6, color: ACCENT_RGB });

        page.drawText(continuation ? 'Certificado de Assinaturas (continuação)' : 'Certificado de Assinaturas', {
            x: CERT_MARGIN,
            y: pageHeight - 42,
            size: 18,
            font: fontBold,
            color: WHITE_RGB,
        });
        page.drawText('Documento assinado eletronicamente através da plataforma FastSign', {
            x: CERT_MARGIN,
            y: pageHeight - 62,
            size: 9.5,
            font,
            color: rgb(0.88, 0.89, 1),
        });

        cursorY = pageHeight - 86 - 26;

        if (!continuation) {
            const titleLines = wrapText(`Documento: ${safeDocumentTitle}`, fontBold, 12, contentWidth);
            for (const line of titleLines) {
                page.drawText(line, { x: CERT_MARGIN, y: cursorY, size: 12, font: fontBold, color: TEXT_DARK_RGB });
                cursorY -= 16;
            }

            page.drawText(`Código de verificação: ${verificationCode}`, {
                x: CERT_MARGIN,
                y: cursorY,
                size: 9.5,
                font: fontMono,
                color: TEXT_MUTED_RGB,
            });
            cursorY -= 14;

            page.drawText(`${entries.length} de ${totalSignatories} signatário(s) confirmaram a assinatura.`, {
                x: CERT_MARGIN,
                y: cursorY,
                size: 9.5,
                font,
                color: TEXT_MUTED_RGB,
            });
            cursorY -= 22;

            const introLines = wrapText(
                'Cada assinatura abaixo está vinculada ao hash criptográfico (SHA-256) do conteúdo exato do documento ' +
                'no instante da confirmação. Qualquer alteração posterior ao arquivo muda essa hash — o que torna ' +
                'possível verificar, a qualquer momento, que o conteúdo assinado por cada pessoa não foi modificado.',
                font,
                9,
                contentWidth
            );
            for (const line of introLines) {
                page.drawText(line, { x: CERT_MARGIN, y: cursorY, size: 9, font, color: TEXT_MUTED_RGB });
                cursorY -= 12.5;
            }
            cursorY -= 8;
        } else {
            cursorY -= 6;
        }

        // O rodapé é fixo (linha 40-27pt a partir da base) e independe do cursor de
        // conteúdo — desenhado aqui pra garantir que TODA página do certificado tenha um,
        // não só a primeira.
        drawFooter();
    }

    function drawFooter() {
        page.drawLine({
            start: { x: CERT_MARGIN, y: 40 },
            end: { x: pageWidth - CERT_MARGIN, y: 40 },
            thickness: 0.75,
            color: BORDER_RGB,
        });
        drawLockIcon(page, { x: CERT_MARGIN + 6, y: 27 });
        page.drawText(`Certificado gerado automaticamente em ${generatedAt}`, {
            x: CERT_MARGIN + 18,
            y: 23,
            size: 8,
            font,
            color: TEXT_MUTED_RGB,
        });
        const pageLabel = `Página ${pageNumber}`;
        page.drawText(pageLabel, {
            x: pageWidth - CERT_MARGIN - font.widthOfTextAtSize(pageLabel, 8),
            y: 23,
            size: 8,
            font,
            color: TEXT_MUTED_RGB,
        });
    }

    async function embedEntryImage(imageDataUrl) {
        if (!imageDataUrl) return null;
        if (embeddedImageCache.has(imageDataUrl)) return embeddedImageCache.get(imageDataUrl);
        const match = /^data:image\/png;base64,(.+)$/.exec(imageDataUrl);
        if (!match) return null;
        const bytes = Buffer.from(match[1], 'base64');
        try {
            const image = await pdfDoc.embedPng(bytes);
            embeddedImageCache.set(imageDataUrl, image);
            return image;
        } catch {
            return null;
        }
    }

    drawHeader({ continuation: false });

    const CARD_PADDING = 14;
    const IMAGE_MAX_WIDTH = 130;
    const IMAGE_MAX_HEIGHT = 42;
    const BOTTOM_LIMIT = 64;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const hashLine1 = sanitizePdfText(entry.documentHash || '');
        const nameLine = sanitizePdfText(entry.name || 'Signatário');
        const emailLine = sanitizePdfText(entry.email || '');
        const ipLine = sanitizePdfText(entry.ipAddress || 'não disponível');
        const typeLabel = SIGNATURE_TYPE_LABELS[entry.signatureType] || SIGNATURE_TYPE_LABELS.TYPED;
        // Só presente quando o dono exigiu documento de identificação pro documento
        // (Document.requireSignatoryDocument) — linha extra opcional no card.
        const documentLine = entry.signatoryDocumentNumber
            ? `${DOCUMENT_TYPE_LABELS[entry.signatoryDocumentType] || DOCUMENT_TYPE_LABELS.OUTRO}: ${sanitizePdfText(entry.signatoryDocumentNumber)}`
            : null;
        const image = await embedEntryImage(entry.signatureImage);

        let imageDrawWidth = 0;
        let imageDrawHeight = 0;
        if (image) {
            const ratio = image.width / image.height;
            imageDrawWidth = Math.min(IMAGE_MAX_WIDTH, image.width);
            imageDrawHeight = imageDrawWidth / ratio;
            if (imageDrawHeight > IMAGE_MAX_HEIGHT) {
                imageDrawHeight = IMAGE_MAX_HEIGHT;
                imageDrawWidth = imageDrawHeight * ratio;
            }
        }

        // Estima a altura do card antes de desenhar, pra decidir se precisa de nova página.
        const estimatedCardHeight = CARD_PADDING * 2 + 16 /*nome*/ + 13 /*email*/ + 13 /*data*/ + 13 /*tipo+ip*/ + (documentLine ? 13 : 0) + 12 /*hash label*/ + 12 /*hash*/ + Math.max(imageDrawHeight, 0) + 10;

        if (cursorY - estimatedCardHeight < BOTTOM_LIMIT) {
            drawHeader({ continuation: true });
        }

        const cardTop = cursorY;
        const cardHeight = estimatedCardHeight;
        const cardBottom = cardTop - cardHeight;

        page.drawRectangle({
            x: CERT_MARGIN,
            y: cardBottom,
            width: contentWidth,
            height: cardHeight,
            color: CARD_BG_RGB,
            borderColor: BORDER_RGB,
            borderWidth: 1,
        });

        drawCheckBadge(page, { x: CERT_MARGIN + 18, y: cardTop - CARD_PADDING - 5, radius: 8 });

        let textX = CERT_MARGIN + 34;
        let textY = cardTop - CARD_PADDING;

        page.drawText(`${i + 1}. ${nameLine}`, { x: textX, y: textY - 4, size: 11.5, font: fontBold, color: TEXT_DARK_RGB });
        textY -= 17;
        if (emailLine) {
            page.drawText(emailLine, { x: textX, y: textY, size: 9, font, color: TEXT_MUTED_RGB });
            textY -= 13;
        }
        page.drawText(`Assinado em ${formatDateTime(entry.signedAt)}`, { x: textX, y: textY, size: 9, font, color: TEXT_DARK_RGB });
        textY -= 13;
        page.drawText(`${typeLabel} · IP registrado: ${ipLine}`, {
            x: textX,
            y: textY,
            size: 9,
            font,
            color: TEXT_MUTED_RGB,
        });
        textY -= 13;
        if (documentLine) {
            page.drawText(`Documento apresentado: ${documentLine}`, {
                x: textX,
                y: textY,
                size: 9,
                font,
                color: TEXT_MUTED_RGB,
            });
            textY -= 13;
        }
        textY -= 1;
        page.drawText('Hash SHA-256 do documento no momento desta assinatura:', {
            x: textX,
            y: textY,
            size: 8,
            font,
            color: TEXT_MUTED_RGB,
        });
        textY -= 11;
        page.drawText(hashLine1, { x: textX, y: textY, size: 8, font: fontMono, color: TEXT_DARK_RGB });

        if (image) {
            const imageX = CERT_MARGIN + contentWidth - imageDrawWidth - CARD_PADDING;
            const imageY = cardBottom + (cardHeight - imageDrawHeight) / 2;
            page.drawRectangle({
                x: imageX - 6,
                y: imageY - 4,
                width: imageDrawWidth + 12,
                height: imageDrawHeight + 8,
                color: WHITE_RGB,
                borderColor: BORDER_RGB,
                borderWidth: 1,
            });
            page.drawImage(image, { x: imageX, y: imageY, width: imageDrawWidth, height: imageDrawHeight });
        }

        cursorY = cardBottom - 12;
    }

    const closingLines = wrapText(
        'Este certificado é parte integrante deste documento e não deve ser removido. Para validar a autenticidade ' +
        'de uma assinatura, recalcule a hash SHA-256 do documento no estado em que ele se encontrava e compare com o ' +
        'valor registrado acima para o signatário correspondente.',
        font,
        8.5,
        contentWidth
    );
    if (cursorY - closingLines.length * 12 < BOTTOM_LIMIT) {
        drawHeader({ continuation: true });
    }
    cursorY -= 6;
    for (const line of closingLines) {
        page.drawText(line, { x: CERT_MARGIN, y: cursorY, size: 8.5, font, color: TEXT_MUTED_RGB });
        cursorY -= 12;
    }

    const finalBytes = await pdfDoc.save();
    return { buffer: Buffer.from(finalBytes), pageCount: pdfDoc.getPageCount() };
}
