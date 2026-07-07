import { handleUpload } from '../middlewares/uploadMiddleware.js';
import {
    createDocument,
    getDocumentFile,
    listDocuments,
} from '../Service/DocumentService.js';
import {
    addSignatoriesToDocument,
    listSignatoriesForDocument,
} from '../Service/SignatoryService.js';

const DocController = {
    async upload(req, res) {
        console.log('DocController.upload called');
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const userId = req.userId; // ⬅️ vem do requireAuth, não mais uuidv4()
            const { document, version } = await createDocument(req.file, userId);

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
            const documents = await listDocuments(req.userId); // ⬅️ passa o userId
            return res.json(documents);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao buscar documentos.' });
        }
    },

    async addSignatories(req, res) {
        try {
            const { id: documentId } = req.params;
            const { signatories } = req.body;

            const created = await addSignatoriesToDocument(documentId, signatories, req.userId);

            return res.status(201).json({
                message: 'Signatários adicionados com sucesso.',
                signatories: created.map((s) => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    status: s.status,
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

};

export default DocController;