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

    const prompt = `Você é um assistente que resume documentos jurídicos e contratuais em português do Brasil.

Leia o texto abaixo e escreva um resumo estruturado, com aproximadamente 10 a 15 linhas curtas, organizado em tópicos.
Para cada cláusula ou seção relevante do documento, escreva 1 a 2 linhas resumindo o ponto principal.
Use marcadores (traço "-") no início de cada linha. Explique oque cada linha esta resumindo, mas não invente informações que não estejam no texto.
Não invente informações que não estejam no texto. Não escreva introduções nem conclusões, apenas os tópicos.

TEXTO:
"""
${truncated}
"""

RESUMO EM TÓPICOS:`;

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
                    num_predict: 900,   // ⬅️ espaço suficiente pra ~30 linhas de texto
                    num_ctx: 4096,
                    num_thread: 8,
                },
                keep_alive: "10m",
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