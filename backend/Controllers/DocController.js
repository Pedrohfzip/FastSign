import { handleUpload } from '../middlewares/uploadMiddleware.js';
import {
    createDocument,
} from '../Service/DocumentService.js';

const DocController = {
    async upload(req, res) {
        try {
            await handleUpload(req, res);

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            // TODO: substituir por req.user.id quando auth estiver implementado
            const userId = req.body.userId || 'temp-user-id';

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
};

export default DocController;