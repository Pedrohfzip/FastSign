import { handleUpload } from '../middlewares/uploadMiddleware.js';
import {
    createDocument,
    getDocumentFile,
    listDocuments,
    listCompletedDocuments,
    getDocumentById,
    generateDocumentSummary,
    getDocumentResume,
    getDocumentBuffer,
    deleteDocument,
    ingestDocumentForRag,
    askQuestionAboutDocument,
} from '../Service/DocumentService.js';
import {
    addSignatoriesToDocument,
    listSignatoriesForDocument,
    listPendingSignaturesForUser,
    listCompletedSignaturesForUser,
} from '../Service/SignatoryService.js';
import { isRagEnabled } from '../Service/RagService.js';


const DocController = {
    // Reindexação manual. A indexação normal acontece sozinha no upload (ver `upload`
    // abaixo) — esta rota fica como utilitário pra reprocessar um documento específico,
    // por exemplo depois de um período com o Ollama fora do ar.
    async ingestRag(req, res) {
        try {
            const { id } = req.params;
            const result = await ingestDocumentForRag(id, req.userId);
            return res.json({ message: 'Indexação concluída.', ...result });
        } catch (err) {
            console.error('[DocController.ingestRag]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao indexar documento.',
            });
        }
    },

    async askRag(req, res) {
        try {
            const { id } = req.params;
            const { question } = req.body;

            if (!question || typeof question !== 'string' || !question.trim()) {
                return res.status(400).json({ error: 'Envie uma pergunta.' });
            }

            const { answer, sources } = await askQuestionAboutDocument(id, req.userId, question.trim());
            return res.json({ answer, sources });
        } catch (err) {
            console.error('[DocController.askRag]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao consultar documento.',
            });
        }
    },
    async upload(req, res) {
        try {
            console.log(req.file.buffer);
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const userId = req.userId; // ⬅️ vem do requireAuth, não mais uuidv4()
            const { document, version } = await createDocument(req.file, userId);

            // Indexação RAG em background: sem `await` de propósito, porque extrair o texto
            // e gerar um embedding por chunk leva vários segundos e não pode segurar a
            // resposta do upload. O `.catch()` é obrigatório aqui — sem ele, uma falha do
            // Ollama viraria unhandled rejection e derrubaria o processo.
            if (isRagEnabled()) {
                ingestDocumentForRag(document.id, userId).catch((err) => {
                    console.error('[DocController.upload] falha ao indexar documento para RAG', err);
                });
            }

            return res.status(201).json({
                message: 'Documento criado com sucesso.',
                document: {
                    id: document.id,
                    title: document.title,
                    originalName: document.originalName,
                    status: document.status,
                    currentVersionId: document.currentVersionId,
                    createdAt: document.createdAt,
                },
                version: {
                    id: version.id,
                    versionNumber: version.versionNumber,
                    fileSize: version.fileSize,
                    checksum: version.checksum,
                },
            });
        } catch (err) {
            console.error('[DocumentController.upload]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro interno ao processar o documento.',
            });
        }
    },

    async getFile(req, res) {
        console.log('DocController.getFile called with id:', req.params.id);
        try {
            const { buffer, originalName } = await getDocumentFile(req.params.id, req.userId); // ⬅️ passa o userId

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            res.send(buffer);
        } catch (err) {
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao carregar arquivo.',
            });
        }
    },

    async list(req, res) {
        try {
            const documents = await listDocuments(req.userId, false); // ⬅️ passa o userId, sem completados
            return res.json(documents);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao buscar documentos.' });
        }
    },

    async addSignatories(req, res) {
        try {
            const { id: documentId } = req.params;
            const { signatories, requireDocument } = req.body;

            const created = await addSignatoriesToDocument(documentId, signatories, req.userId, Boolean(requireDocument));

            return res.status(201).json({
                message: 'Signatários adicionados com sucesso.',
                signatories: created.map((s) => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    status: s.status,
                    isSelf: s.userId === req.userId,
                    // link que você vai copiar/testar manualmente por enquanto
                    signLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinar/${s.accessToken}`,
                })),
            });
        } catch (err) {
            console.error('[DocController.addSignatories]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao adicionar signatários.',
            });
        }
    },

    async listSignatories(req, res) {
        try {
            const { id: documentId } = req.params;
            const signatories = await listSignatoriesForDocument(documentId, req.userId);
            return res.json(signatories);
        } catch (err) {
            console.error('[DocController.listSignatories]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar signatários.',
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            const document = await getDocumentById(id, req.userId);
            return res.json(document);
        } catch (err) {
            console.error('[DocController.getById]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar documento.',
            });
        }
    },

    async getResume(req, res) {
        const controller = new AbortController();
        const onClose = () => {
            // só cancela se a resposta ainda não terminou — não queremos abortar algo que já foi entregue
            if (!res.writableEnded) {
                controller.abort();
            }
        };
        req.on('close', onClose);

        try {
            const { id } = req.params;
            const buffer = await getDocumentBuffer(id);
            const summary = await getDocumentResume(id, req.userId, buffer, controller.signal);
            if (!res.writableEnded) {
                return res.json(summary);
            }
        } catch (err) {
            if (err?.name === 'AbortError') {
                console.log(`[DocController.getResume] cliente desconectou, resumo cancelado (doc ${req.params.id})`);
                return;
            }
            console.error('[DocController.getResume]', err);
            if (!res.writableEnded) {
                return res.status(err.statusCode || 500).json({
                    error: err.message || 'Erro ao gerar resumo do documento.',
                });
            }
        } finally {
            req.off('close', onClose);
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            await deleteDocument(id, req.userId);
            return res.status(204).send();
        } catch (err) {
            console.error('[DocController.remove]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao excluir documento.',
            });
        }
    },

    async listToSign(req, res) {
        try {
            const documents = await listPendingSignaturesForUser(req.userId, false);
            return res.json(documents);
        } catch (err) {
            console.error('[DocController.listToSign]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar documentos pendentes de assinatura.',
            });
        }
    },

    async listCompleted(req, res) {
        try {
            const [ownedDocs, signedDocs] = await Promise.all([
                listCompletedDocuments(req.userId),
                listCompletedSignaturesForUser(req.userId),
            ]);

            const ownerItems = ownedDocs.map((doc) => ({
                id: doc.id,
                title: doc.title,
                status: doc.status,
                createdAt: doc.createdAt,
                totalSignatories: doc.totalSignatories,
                signedCount: doc.signedCount,
                role: 'owner',
            }));

            const signatoryItems = signedDocs.map((item) => ({
                id: item.document.id,
                title: item.document.title,
                status: item.document.status,
                createdAt: item.document.createdAt,
                ownerName: item.document.ownerName,
                role: 'signatory',
            }));

            // Remove duplicatas por id — um documento pode aparecer nas duas listas
            // se o usuário for dono E signatário do mesmo documento. Nesse caso,
            // prioriza a versão 'owner' (processada por último, sempre sobrescreve).
            const byId = new Map();
            for (const item of [...signatoryItems, ...ownerItems]) {
                const existing = byId.get(item.id);
                if (!existing || item.role === 'owner') {
                    byId.set(item.id, item);
                }
            }

            const combined = Array.from(byId.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return res.json(combined);
        } catch (err) {
            console.error('[DocController.listCompleted]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar documentos finalizados.',
            });
        }
    },
};

export default DocController;