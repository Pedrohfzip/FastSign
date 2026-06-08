import Router from 'express';

const docRouter = Router();

docRouter.post('/', (req, res) => {
    try {
        const { name, content } = req.body;
        console.log('Recebido documento:', { name, content });
        res.status(201).json({ message: 'Documento criado com sucesso', document: { name, content } });
    } catch (error) {
        console.error('Erro ao processar documento:', error);
        return res.status(500).json({ message: 'Erro interno ao criar documento.' });
    }

});


export default docRouter;