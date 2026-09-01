import { QueryTypes } from 'sequelize';
import db from '../database/models/index.js';

const { sequelize } = db;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';
// Modelo de GERAÇÃO das respostas do RAG. Propositalmente separado do OLLAMA_MODEL
// (qwen2.5:7b, usado nos resumos): aqui o contexto já vem mastigado pelos chunks, então
// um modelo menor e mais rápido dá conta e evita disputar VRAM com o resumo.
const RAG_MODEL = process.env.OLLAMA_RAG_MODEL || 'llama3.2:3b';

// Tamanho aproximado dos pedaços, em PALAVRAS (não temos um tokenizer real
// disponível, então usamos contagem de palavras como aproximação razoável)
const CHUNK_SIZE_WORDS = 300;
const CHUNK_OVERLAP_WORDS = 50;

// Quantos chunks são recuperados por pergunta, por padrão
const DEFAULT_TOP_K = 5;

/**
 * Interruptor de produção: onde não há Ollama disponível, `ENABLE_AI_RAG=false` no .env
 * desliga indexação e consulta sem que nenhuma chamada chegue a ser tentada. O default é
 * HABILITADO (qualquer valor diferente de 'false' liga), pra não quebrar o ambiente de
 * desenvolvimento de quem não tem a variável setada.
 */
export function isRagEnabled() {
    return process.env.ENABLE_AI_RAG !== 'false';
}

/**
 * Divide um texto longo em pedaços menores, com sobreposição entre eles.
 * A sobreposição existe pra evitar que uma frase importante fique "cortada"
 * exatamente na fronteira entre dois pedaços, perdendo contexto.
 */
export function chunkText(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];

    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
        const chunk = words.slice(start, end).join(' ');
        chunks.push(chunk);

        if (end === words.length) break;
        start += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    }

    return chunks;
}

/**
 * Gera o embedding (vetor numérico) de um texto, via Ollama.
 */
export async function embedText(text) {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            prompt: text,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama embeddings respondeu ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.embedding; // array de floats, 768 posições
}

/**
 * Pipeline completo: apaga chunks antigos desse documento (se houver),
 * divide o texto novo em pedaços, gera embedding de cada um, e salva tudo.
 */
export async function ingestDocument(documentId, fullText) {
    if (!isRagEnabled()) {
        console.log(`[RagService] ENABLE_AI_RAG=false — indexação do documento ${documentId} pulada.`);
        return { chunksCreated: 0, skipped: true };
    }

    if (!fullText || fullText.trim().length < 20) {
        console.log(`[RagService] Texto insuficiente para indexar documento ${documentId}, pulando.`);
        return { chunksCreated: 0 };
    }

    // Remove indexação anterior, caso o documento esteja sendo reprocessado
    await sequelize.query(
        'DELETE FROM document_chunks WHERE document_id = :documentId',
        { replacements: { documentId } }
    );

    const chunks = chunkText(fullText);
    let created = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
            const embedding = await embedText(chunk);
            const vectorLiteral = `[${embedding.join(',')}]`;

            await sequelize.query(
                `INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, embedding, created_at, updated_at)
                 VALUES (gen_random_uuid(), :documentId, :chunkIndex, :chunkText, :embedding::vector, NOW(), NOW())`,
                {
                    replacements: {
                        documentId,
                        chunkIndex: i,
                        chunkText: chunk,
                        embedding: vectorLiteral,
                    },
                }
            );

            created++;
        } catch (err) {
            console.error(`[RagService.ingestDocument] Falha no chunk ${i} do documento ${documentId}:`, err);
            // continua tentando os próximos pedaços, mesmo se um falhar
        }
    }

    console.log(`[RagService] Documento ${documentId} indexado: ${created}/${chunks.length} chunks criados.`);
    return { chunksCreated: created, totalChunks: chunks.length };
}

/**
 * Busca semântica: transforma a pergunta em embedding e devolve os chunks do documento
 * mais próximos dela. `<=>` é o operador de distância de cosseno do pgvector — quanto
 * MENOR o valor, mais parecido o chunk é com a pergunta (0 = idêntico), por isso o
 * ORDER BY é crescente. `embedding IS NOT NULL` filtra chunks cuja geração de embedding
 * falhou em algum momento (a coluna é nullable), que senão poluiriam o ranking.
 */
export async function retrieveRelevantChunks(documentId, question, topK = DEFAULT_TOP_K) {
    const questionEmbedding = await embedText(question);
    const vectorLiteral = `[${questionEmbedding.join(',')}]`;

    const rows = await sequelize.query(
        `SELECT chunk_text, chunk_index, embedding <=> :embedding::vector AS distance
           FROM document_chunks
          WHERE document_id = :documentId
            AND embedding IS NOT NULL
       ORDER BY embedding <=> :embedding::vector
          LIMIT :topK`,
        {
            replacements: { documentId, embedding: vectorLiteral, topK },
            type: QueryTypes.SELECT,
        }
    );

    return rows.map((row) => ({
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        distance: Number(row.distance),
    }));
}

/**
 * Gera a resposta em linguagem natural a partir dos trechos recuperados.
 * Segue o mesmo contrato de falha silenciosa do AIService: retorna null se o Ollama
 * estiver fora do ar / demorar demais, pra quem chamou decidir o fallback.
 */
export async function generateAnswerFromChunks(question, chunks) {
    const context = chunks
        .map((chunk, i) => `[Trecho ${i + 1}]\n${chunk.chunkText}`)
        .join('\n\n');

    const prompt = `Você é um assistente que responde perguntas sobre documentos jurídicos e contratuais em português do Brasil.

Responda à pergunta do usuário usando SOMENTE as informações contidas nos trechos abaixo, extraídos do documento.

Regras obrigatórias:
- Não use conhecimento externo, nem suponha nada que não esteja escrito nos trechos.
- Se a resposta não estiver nos trechos, responda exatamente: "Não encontrei essa informação no documento."
- Seja direto e objetivo, em no máximo 6 linhas.
- Responda em português do Brasil.

TRECHOS DO DOCUMENTO:
"""
${context}
"""

PERGUNTA: ${question}

RESPOSTA:`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: RAG_MODEL,
                prompt,
                stream: false,
                options: {
                    temperature: 0.2, // baixa de propósito: queremos extração fiel, não criatividade
                    num_predict: 500,
                    num_ctx: 4096,
                    num_thread: 8,
                },
                keep_alive: '10m',
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama respondeu ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.response?.trim() || null;
    } catch (err) {
        console.error('[RagService.generateAnswerFromChunks]', err);
        return null;
    }
}

/**
 * Orquestra o fluxo completo de pergunta e resposta sobre um documento.
 * Nunca lança por causa da IA: todo caminho de falha (RAG desligado, documento ainda não
 * indexado, Ollama indisponível) vira uma resposta em texto explicando o que aconteceu —
 * mesma filosofia do resto do projeto, onde IA fora do ar não derruba o fluxo do produto.
 */
export async function askDocument(documentId, question) {
    if (!isRagEnabled()) {
        return {
            answer: 'A busca por IA está desativada neste ambiente.',
            sources: [],
        };
    }

    let chunks;
    try {
        chunks = await retrieveRelevantChunks(documentId, question);
    } catch (err) {
        console.error('[RagService.askDocument]', err);
        return {
            answer: 'Não foi possível consultar o documento agora. Tente novamente em instantes.',
            sources: [],
        };
    }

    if (chunks.length === 0) {
        return {
            answer: 'Este documento ainda não foi indexado para busca por IA, então não há trechos para consultar.',
            sources: [],
        };
    }

    const answer = await generateAnswerFromChunks(question, chunks);

    if (!answer) {
        return {
            answer: 'Não foi possível gerar a resposta agora. Tente novamente em instantes.',
            sources: chunks,
        };
    }

    return { answer, sources: chunks };
}