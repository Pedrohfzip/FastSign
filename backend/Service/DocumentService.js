import path from 'path';
import db from '../database/models/index.js';
import storageService from './StorageService.js';

const { Document, DocumentVersion, sequelize } = db;

export async function createDocument(file, userId) {
    const title = path.parse(file.originalname).name;
    let savedFile;

    try {
        return await sequelize.transaction(async (t) => {
            const document = await Document.create(
                {
                    userId,
                    title,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    status: 'DRAFT',
                },
                { transaction: t }
            );

            savedFile = await storageService.saveVersionFile(
                document.id,
                1,
                file.buffer,
                file.mimetype
            );

            const version = await DocumentVersion.create(
                {
                    documentId: document.id,
                    versionNumber: 1,
                    filePath: savedFile.filePath,
                    fileSize: file.size,
                    checksum: savedFile.checksum,
                    uploadedBy: userId,
                },
                { transaction: t }
            );

            document.currentVersionId = version.id;
            await document.save({ transaction: t });

            return { document, version };
        });
    } catch (err) {
        if (savedFile) {
            await storageService.deleteVersionFile(savedFile.filePath).catch(() => { });
        }
        throw err;
    }
}

export async function getDocumentFile(documentId, userId) {
    const document = await Document.findByPk(documentId, {
        include: [{ model: DocumentVersion, as: 'currentVersion' }],
    });

    if (!document || !document.currentVersion) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    // ⬇️ novo: garante que só o dono acessa o arquivo
    if (document.userId !== userId) {
        const err = new Error('Você não tem permissão para acessar este documento.');
        err.statusCode = 403;
        throw err;
    }

    const buffer = await storageService.readVersionFile(document.currentVersion.filePath);

    return { buffer, originalName: document.originalName };
}

export async function listDocuments(userId) {
    return Document.findAll({
        where: { userId }, // ⬅️ novo: só retorna documentos do usuário logado
        order: [['createdAt', 'DESC']],
    });
}