import path from 'path';
import db from '../database/models/index.js';
import storageService from './StorageService.js';
import { extractTextFromPdf, summarizeText } from './AIService.js';
import { detectSignaturePosition } from './SignaturePositionService.js';
const { Document, DocumentVersion, Signatory, sequelize } = db;

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
    console.log(userId);
    try {
        const documents = await Document.findAll({
            where: { userId },
            include: [{ model: Signatory, as: 'signatories' }],
            order: [['createdAt', 'DESC']],
        });
        // Enriquece cada documento com contagem de assinaturas
        return documents.map((doc) => {
            const signatories = doc.signatories || [];
            const signedCount = signatories.filter((s) => s.status === 'SIGNED').length;

            return {
                id: doc.id,
                title: doc.title,
                originalName: doc.originalName,
                status: doc.status,
                createdAt: doc.createdAt,
                totalSignatories: signatories.length,
                signedCount,
                signatoryNames: signatories.map((s) => s.name),
                aiSummary: doc.aiSummary,
            };
        });
    } catch (err) {
        console.error('[DocumentService.listDocuments]', err);
        throw new Error('Erro ao buscar documentos.');
    }
}

export async function getDocumentById(documentId, userId) {
    const document = await Document.findByPk(documentId, {
        include: [{ model: Signatory, as: 'signatories' }],
    });

    if (!document) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    if (document.userId !== userId) {
        const err = new Error('Você não tem permissão para ver este documento.');
        err.statusCode = 403;
        throw err;
    }

    return {
        id: document.id,
        title: document.title,
        originalName: document.originalName,
        status: document.status,
        createdAt: document.createdAt,
        aiSummary: document.aiSummary,
        signatories: (document.signatories || []).map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            status: s.status,
            signedAt: s.signedAt,
        })),
    };
}
export async function getDocumentResume(documentId, userId, fileBuffer, signal) {
    const text = await extractTextFromPdf(fileBuffer, signal);
    const summary = await summarizeText(text, signal);
    return summary;
}
export async function generateDocumentSummary(documentId, fileBuffer) {
    try {
        const text = await extractTextFromPdf(fileBuffer);
        if (text) {
            const summary = await summarizeText(text);
            if (summary) {
                await Document.update({ aiSummary: summary }, { where: { id: documentId } });
                console.log(`[DocumentService] Resumo gerado para documento ${documentId}`);
            }
        }
    } catch (err) {
        console.error('[DocumentService.generateDocumentSummary]', err);
        // silencioso — resumo é um "nice to have", não pode derrubar nada
    }

    try {
        const { page: suggestedPage, x: suggestedX, y: suggestedY, source } = await detectSignaturePosition(fileBuffer);
        await Document.update(
            { suggestedPage, suggestedX, suggestedY },
            { where: { id: documentId } }
        );
        console.log(
            `[DocumentService] Posição de assinatura sugerida (${source}) para documento ${documentId}: página ${suggestedPage}, x=${suggestedX}, y=${suggestedY}`
        );
    } catch (err) {
        console.error('[DocumentService.generateDocumentSummary]', err);
        // silencioso — sugestão de posição é um "nice to have", não pode derrubar nada
    }
}

export async function deleteDocument(documentId, userId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    if (document.userId !== userId) {
        const err = new Error('Você não tem permissão para excluir este documento.');
        err.statusCode = 403;
        throw err;
    }

    // Remove o registro (e, em cascata no banco, versões e signatários) antes de apagar os arquivos.
    await document.destroy();
    await storageService.deleteDocumentDir(documentId).catch(() => { });
}

export async function getDocumentBuffer(documentId) {
    const document = await Document.findByPk(documentId, {
        include: [{ model: DocumentVersion, as: 'currentVersion' }],
    });

    if (!document || !document.currentVersion) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    const buffer = await storageService.readVersionFile(document.currentVersion.filePath);

    return buffer;
}

