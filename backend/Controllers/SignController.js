import { getSignatoryByToken, getDocumentFileByToken, signDocument } from '../Service/SignatoryService.js';

const SignController = {
    async getByToken(req, res) {
        try {
            const { accessToken } = req.params;
            const signatory = await getSignatoryByToken(accessToken);

            return res.json({
                signatory: {
                    name: signatory.name,
                    email: signatory.email,
                    status: signatory.status,
                },
                document: {
                    id: signatory.document.id,
                    title: signatory.document.title,
                    originalName: signatory.document.originalName,
                    status: signatory.document.status,
                    createdAt: signatory.document.createdAt,
                    ownerName: signatory.document.owner?.name || null,
                    suggestedPosition: {
                        page: signatory.document.suggestedPage || 1,
                        x: signatory.document.suggestedX ?? 0.5,
                        y: signatory.document.suggestedY ?? 0.8,
                    },
                },
            });
        } catch (err) {
            console.error('[SignController.getByToken]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar dados da assinatura.',
            });
        }
    },

    async getFile(req, res) {
        try {
            const { accessToken } = req.params;
            const { buffer, originalName } = await getDocumentFileByToken(accessToken);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            res.send(buffer);
        } catch (err) {
            console.error('[SignController.getFile]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao carregar arquivo.',
            });
        }
    },

    async sign(req, res) {
        try {
            const { accessToken } = req.params;
            const { signatureImage, signatureType, position } = req.body;

            const requestMeta = {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            };

            const signatory = await signDocument(accessToken, { signatureImage, signatureType, position }, requestMeta);

            return res.json({
                message: 'Documento assinado com sucesso.',
                signatory: {
                    name: signatory.name,
                    status: signatory.status,
                    signedAt: signatory.signedAt,
                },
            });
        } catch (err) {
            console.error('[SignController.sign]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao assinar documento.',
            });
        }
    },
};

export default SignController;