import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

const MAX_TEXT_LENGTH = 6000;

export async function extractTextFromPdf(buffer) {
    try {
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (err) {
        console.error('[AIService.extractTextFromPdf]', err);
        return '';
    }
}

export async function summarizeText(text) {
    if (!text || text.trim().length < 20) {
        return null;
    }

    const truncated = text.slice(0, MAX_TEXT_LENGTH);

    const prompt = `Você é um assistente que resume documentos em português do Brasil.
Leia o texto abaixo e escreva um resumo objetivo de 20 a 30 frases, capturando do que se trata o documento.
Não invente informações que não estejam no texto. Responda APENAS com o resumo, sem introduções como "Este documento trata de".

TEXTO:
"""
${truncated}
"""

RESUMO:`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama respondeu ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.response?.trim() || null;
    } catch (err) {
        console.error('[AIService.summarizeText]', err);
        return null;
    }
}