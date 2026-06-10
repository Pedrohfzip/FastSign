import { handleUpload } from '../middlewares/uploadMiddleware.js';
const DocController = {
    async upload(req, res) {
        try {
            const { name, content } = req.body;
            // Lógica para criar um documento (exemplo: salvar no banco de dados)
            const newDocument = { id: Date.now(), name, content }; // Exemplo de documento criado
            // Retornar o documento criado como resposta
            res.status(201).json(newDocument);
        } catch (error) {
            console.error('Erro ao criar documento:', error);
            res.status(500).json({ error: 'Erro ao criar documento' });
        }
    }
};

export default DocController;