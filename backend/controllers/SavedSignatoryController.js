import { listSavedSignatories, deleteSavedSignatory } from '../Service/SavedSignatoryService.js';

const SavedSignatoryController = {
    async list(req, res) {
        try {
            const contacts = await listSavedSignatories(req.userId);
            return res.json(contacts.map((c) => ({ id: c.id, name: c.name, email: c.email })));
        } catch (err) {
            console.error('[SavedSignatoryController.list]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao buscar contatos.',
            });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            await deleteSavedSignatory(id, req.userId);
            return res.status(204).send();
        } catch (err) {
            console.error('[SavedSignatoryController.remove]', err);
            return res.status(err.statusCode || 500).json({
                error: err.message || 'Erro ao remover contato.',
            });
        }
    },
};

export default SavedSignatoryController;
