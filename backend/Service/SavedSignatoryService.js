import db from '../database/models/index.js';
const { SavedSignatory } = db;

/** Lista os contatos salvos pelo dono, em ordem alfabética. */
export async function listSavedSignatories(userId) {
    return SavedSignatory.findAll({ where: { userId }, order: [['name', 'ASC']] });
}

/**
 * Salva (ou atualiza) um contato do dono. Idempotente por e-mail normalizado — reenviar
 * o mesmo contato nunca duplica, só atualiza o nome se ele tiver mudado. Chamada tanto
 * pelo fluxo de adicionar signatários (SignatoryService.addSignatoriesToDocument, quando
 * `saveContact` vem marcado numa linha) quanto, no futuro, por qualquer outro lugar que
 * precise salvar um contato.
 */
export async function upsertSavedSignatory(userId, { name, email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const [contact] = await SavedSignatory.findOrCreate({
        where: { userId, email: normalizedEmail },
        defaults: { userId, name: normalizedName, email: normalizedEmail },
    });

    if (contact.name !== normalizedName) {
        contact.name = normalizedName;
        await contact.save();
    }

    return contact;
}

/** Remove um contato salvo — só se ele pertencer ao usuário que está pedindo. */
export async function deleteSavedSignatory(id, userId) {
    const contact = await SavedSignatory.findOne({ where: { id, userId } });
    if (!contact) {
        const err = new Error('Contato não encontrado.');
        err.statusCode = 404;
        throw err;
    }
    await contact.destroy();
}
