// Gera uma imagem de assinatura (PNG, data URL) a partir de um nome, usando a fonte
// cursiva "Dancing Script" (importada em main.jsx). Roda tudo num <canvas> fora do
// DOM — nada é montado na tela, só o data URL resultante é exposto.
import { useState, useEffect, useRef } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 260;
const FONT_FAMILY = 'Dancing Script';
const INK_COLOR = '#1a1a1a';
const FONT_LOAD_TIMEOUT_MS = 1500;
const DEBOUNCE_MS = 250;
const MAX_FONT_SIZE = 120;
const MIN_FONT_SIZE = 24;

function drawSignature(name, fontFamily) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d');
    // Fundo TRANSPARENTE de propósito (sem fillRect) — só o traço da assinatura fica
    // opaco, pra "colar" no PDF como tinta, não como uma caixa branca por cima.
    ctx.fillStyle = INK_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Encolhe a fonte até o nome caber com uma margem, evitando corte pra nomes longos.
    const maxTextWidth = CANVAS_WIDTH * 0.9;
    let fontSize = MAX_FONT_SIZE;
    ctx.font = `700 ${fontSize}px "${fontFamily}", cursive`;
    while (ctx.measureText(name).width > maxTextWidth && fontSize > MIN_FONT_SIZE) {
        fontSize -= 4;
        ctx.font = `700 ${fontSize}px "${fontFamily}", cursive`;
    }

    ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return canvas.toDataURL('image/png');
}

// Espera a fonte carregar de verdade antes de desenhar — sem isso, o canvas
// silenciosamente cai pra fonte padrão na primeira renderização (pegadinha clássica
// de canvas + webfont). Com timeout curto: se não carregar a tempo, segue com uma
// fonte cursiva genérica em vez de travar a geração da assinatura por causa disso.
async function waitForFont() {
    try {
        const spec = `700 64px "${FONT_FAMILY}"`;
        const timeout = new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS));
        await Promise.race([document.fonts.load(spec).then(() => document.fonts.ready), timeout]);
        return document.fonts.check(spec);
    } catch {
        return false;
    }
}

export function useSignatureImage(name) {
    const [imageDataUrl, setImageDataUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            setImageDataUrl(null);
            setLoading(false);
            setError(null);
            return;
        }

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        const timer = setTimeout(async () => {
            try {
                const fontReady = await waitForFont();
                if (requestId !== requestIdRef.current) return; // nome mudou de novo enquanto esperava

                const dataUrl = drawSignature(trimmed, fontReady ? FONT_FAMILY : 'cursive');
                if (requestId !== requestIdRef.current) return;

                setImageDataUrl(dataUrl);
            } catch (err) {
                console.error('[useSignatureImage]', err);
                if (requestId === requestIdRef.current) setError('Não foi possível gerar a assinatura.');
            } finally {
                if (requestId === requestIdRef.current) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [name]);

    return { imageDataUrl, loading, error };
}

export default useSignatureImage;
