import { v4 as uuidv4 } from 'uuid';
import { handleUpload } from '../middlewares/uploadMiddleware.js';
import {
    createDocument,
    getDocumentFile,
    listDocuments,
} from '../Service/DocumentService.js';

const DocController = {
    async upload(req, res) {
        console.log('DocController.upload called');
        try {
            await handleUpload(req, res);

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const userId = uuidv4();

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
            const { buffer, originalName } = await getDocumentFile(req.params.id);

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
            const documents = await listDocuments();
            return res.json(documents);
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao buscar documentos.' });
        }
    },

};

export default DocController;