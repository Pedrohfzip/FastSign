import { getSignatoryByToken, signDocument } from '../Service/SignatoryService.js';

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
                },
            });
        } catch (err) {
            console.error('[SignController.getByToken]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar dados da assinatura.',
            });
        }
    },

    async sign(req, res) {
        try {
            const { accessToken } = req.params;
            const { signatureImage, signatureType } = req.body;

            const requestMeta = {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            };

            const signatory = await signDocument(accessToken, { signatureImage, signatureType }, requestMeta);

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