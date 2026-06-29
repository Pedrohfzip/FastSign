import path from 'path';
import db from '../database/models/index.js'; // ajuste o caminho se seu index.js estiver em outro lugar
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
        // se o arquivo já tinha sido escrito mas o banco falhou, limpa o disco
        if (savedFile) {
            await storageService.deleteVersionFile(savedFile.filePath).catch(() => { });
        }
        throw err;
    }
}

export async function getDocumentFile(documentId) {
    const document = await Document.findByPk(documentId, {
        include: [{ model: DocumentVersion, as: 'currentVersion' }],
    });

    if (!document || !document.currentVersion) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    const buffer = await storageService.readVersionFile(document.currentVersion.filePath);

    return { buffer, originalName: document.originalName };
}

export async function listDocuments() {
    return Document.findAll({
        order: [['createdAt', 'DESC']],
    });
}