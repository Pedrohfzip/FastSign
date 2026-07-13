import crypto from 'crypto';
import db from '../database/models/index.js';
import storageService from './StorageService.js';
import { generateToken } from '../utils/generateToken.js';

const { Document, DocumentVersion, Signatory, Signature, User } = db;

export async function addSignatoriesToDocument(documentId, signatoriesData, requestingUserId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    if (document.userId !== requestingUserId) {
        const err = new Error('Você não tem permissão para editar este documento.');
        err.statusCode = 403;
        throw err;
    }

    if (!Array.isArray(signatoriesData) || signatoriesData.length === 0) {
        const err = new Error('Informe ao menos um signatário.');
        err.statusCode = 400;
        throw err;
    }

    const requestingUser = await User.findByPk(requestingUserId);

    const created = await Promise.all(
        signatoriesData.map(({ name, email }) => {
            const isSelf =
                requestingUser && email.trim().toLowerCase() === requestingUser.email.trim().toLowerCase();

            return Signatory.create({
                documentId,
                name,
                email,
                accessToken: generateToken(),
                status: 'PENDING',
                userId: isSelf ? requestingUserId : null,
            });
        })
    );

    if (document.status === 'DRAFT') {
        document.status = 'PENDING';
        await document.save();
    }

    return created;
}

export async function listSignatoriesForDocument(documentId, requestingUserId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    if (document.userId !== requestingUserId) {
        const err = new Error('Você não tem permissão para ver este documento.');
        err.statusCode = 403;
        throw err;
    }

    return Signatory.findAll({
        where: { documentId },
        order: [['createdAt', 'ASC']],
    });
}

export async function getSignatoryByToken(accessToken) {
    const signatory = await Signatory.findOne({
        where: { accessToken },
        include: [{ model: Document, as: 'document' }],
    });

    if (!signatory) {
        const err = new Error('Link de assinatura inválido.');
        err.statusCode = 404;
        throw err;
    }

    return signatory;
}

export async function signDocument(accessToken, { signatureImage, signatureType }, requestMeta) {
    const signatory = await Signatory.findOne({ where: { accessToken } });

    if (!signatory) {
        const err = new Error('Link de assinatura inválido.');
        err.statusCode = 404;
        throw err;
    }

    if (signatory.status !== 'PENDING') {
        const err = new Error('Este documento já foi assinado ou recusado por você.');
        err.statusCode = 409;
        throw err;
    }

    const document = await Document.findByPk(signatory.documentId, {
        include: [{ model: DocumentVersion, as: 'currentVersion' }],
    });

    if (!document || !document.currentVersion) {
        const err = new Error('Documento não encontrado.');
        err.statusCode = 404;
        throw err;
    }

    // hash do arquivo no momento exato da assinatura — prova de integridade
    const fileBuffer = await storageService.readVersionFile(document.currentVersion.filePath);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    await Signature.create({
        signatoryId: signatory.id,
        documentVersionId: document.currentVersionId,
        signatureImage: signatureImage || null,
        signatureType: signatureType || 'DRAWN',
        documentHash,
        ipAddress: requestMeta.ip,
        userAgent: requestMeta.userAgent,
    });

    signatory.status = 'SIGNED';
    signatory.signedAt = new Date();
    await signatory.save();

    // verifica se todos os signatários já assinaram
    const allSignatories = await Signatory.findAll({ where: { documentId: document.id } });
    const allSigned = allSignatories.every((s) => s.status === 'SIGNED');

    if (allSigned) {
        document.status = 'COMPLETED';
        await document.save();
    }

    return signatory;
}