import crypto from 'crypto';
import db from '../database/models/index.js';
import storageService from './StorageService.js';
import { generateToken } from '../utils/generateToken.js';
import { sendSignatureInvite } from './EmailService.js';
import { stampSignatureImage } from './PdfStampService.js';
const { Document, DocumentVersion, Signatory, Signature, User, sequelize } = db;

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const created = await Promise.all(
        signatoriesData.map(async ({ name, email }) => {
            const isSelf =
                requestingUser && email.trim().toLowerCase() === requestingUser.email.trim().toLowerCase();

            const signatory = await Signatory.create({
                documentId,
                name,
                email,
                accessToken: generateToken(),
                status: 'PENDING',
                userId: isSelf ? requestingUserId : null,
            });

            // Não envia e-mail pro próprio dono — ele já tem o CTA "Assinar agora" direto no app
            if (!isSelf) {
                const signLink = `${frontendUrl}/assinar/${signatory.accessToken}`;
                await sendSignatureInvite({
                    to: email,
                    signatoryName: name,
                    documentTitle: document.title,
                    signLink,
                });
            }

            return signatory;
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
        include: [
            {
                model: Document,
                as: 'document',
                include: [{ model: User, as: 'owner' }],
            },
        ],
    });

    if (!signatory) {
        const err = new Error('Link de assinatura inválido.');
        err.statusCode = 404;
        throw err;
    }

    return signatory;
}

export async function getDocumentFileByToken(accessToken) {
    const signatory = await Signatory.findOne({
        where: { accessToken },
        include: [
            {
                model: Document,
                as: 'document',
                include: [{ model: DocumentVersion, as: 'currentVersion' }],
            },
        ],
    });

    if (!signatory || !signatory.document || !signatory.document.currentVersion) {
        const err = new Error('Link de assinatura inválido.');
        err.statusCode = 404;
        throw err;
    }

    const buffer = await storageService.readVersionFile(signatory.document.currentVersion.filePath);

    return { buffer, originalName: signatory.document.originalName };
}

export async function signDocument(accessToken, { signatureImage, signatureType, position }, requestMeta) {
    // Assinar sem carimbar seria um bug silencioso de integridade — a imagem é obrigatória.
    if (!signatureImage) {
        const err = new Error('Imagem de assinatura é obrigatória.');
        err.statusCode = 400;
        throw err;
    }

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

    // O PDF carimbado é salvo em disco fora da transação (não é transacional por natureza);
    // se qualquer escrita no banco falhar depois, o catch abaixo apaga o arquivo órfão —
    // mesmo contrato de limpeza usado em DocumentService.createDocument.
    let savedFile;
    try {
        return await sequelize.transaction(async (t) => {
            // Trava a linha do Document — serializa qualquer assinatura concorrente NESSE
            // documento (entre signatários diferentes também), evitando colisão no índice
            // único (document_id, version_number) se duas pessoas assinarem quase ao mesmo
            // tempo. NÃO usar `include` aqui: currentVersionId é nullable, e o Postgres não
            // permite FOR UPDATE do lado nullable de um LEFT JOIN — por isso a versão atual
            // é buscada numa segunda query, separada.
            const document = await Document.findByPk(signatory.documentId, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!document) {
                const err = new Error('Documento não encontrado.');
                err.statusCode = 404;
                throw err;
            }

            const currentVersion = document.currentVersionId
                ? await DocumentVersion.findByPk(document.currentVersionId, { transaction: t })
                : null;

            if (!currentVersion) {
                const err = new Error('Documento não encontrado.');
                err.statusCode = 404;
                throw err;
            }

            // Reconfirma sob o lock — protege contra double-submit concorrente do mesmo signatário.
            const freshSignatory = await Signatory.findByPk(signatory.id, { transaction: t });
            if (freshSignatory.status !== 'PENDING') {
                const err = new Error('Este documento já foi assinado ou recusado por você.');
                err.statusCode = 409;
                throw err;
            }

            // hash do arquivo ANTES do carimbo — prova do que o signatário efetivamente revisou/assinou
            const preStampBuffer = await storageService.readVersionFile(currentVersion.filePath);
            const documentHash = crypto.createHash('sha256').update(preStampBuffer).digest('hex');
            const preStampVersionId = currentVersion.id;

            const { buffer: stampedBuffer, pageCount } = await stampSignatureImage(preStampBuffer, {
                imageDataUrl: signatureImage,
                position,
            });

            const newVersionNumber = currentVersion.versionNumber + 1;
            savedFile = await storageService.saveVersionFile(document.id, newVersionNumber, stampedBuffer, 'application/pdf');

            const newVersion = await DocumentVersion.create({
                documentId: document.id,
                versionNumber: newVersionNumber,
                filePath: savedFile.filePath,
                fileSize: stampedBuffer.length,
                checksum: savedFile.checksum,
                uploadedBy: document.userId,
                pageCount,
            }, { transaction: t });

            // Aponta pra versão PRÉ-carimbo (não a nova) — mantém consistência com o
            // documentHash acima, que também foi calculado sobre o arquivo pré-carimbo:
            // é a prova do que esse signatário efetivamente revisou e assinou, não do
            // artefato composto que o sistema produziu depois.
            await Signature.create({
                signatoryId: freshSignatory.id,
                documentVersionId: preStampVersionId,
                signatureImage,
                signatureType: signatureType || 'TYPED',
                documentHash,
                ipAddress: requestMeta.ip,
                userAgent: requestMeta.userAgent,
            }, { transaction: t });

            document.currentVersionId = newVersion.id;
            await document.save({ transaction: t });

            freshSignatory.status = 'SIGNED';
            freshSignatory.signedAt = new Date();
            await freshSignatory.save({ transaction: t });

            // verifica se todos os signatários já assinaram
            const allSignatories = await Signatory.findAll({ where: { documentId: document.id }, transaction: t });
            const allSigned = allSignatories.every((s) => s.status === 'SIGNED');

            if (allSigned) {
                document.status = 'COMPLETED';
                await document.save({ transaction: t });
            }

            return freshSignatory;
        });
    } catch (err) {
        if (savedFile) {
            await storageService.deleteVersionFile(savedFile.filePath).catch(() => { });
        }
        throw err;
    }
}

export async function listPendingSignaturesForUser(userId, includeCompleted = false) {
    const signatories = await Signatory.findAll({
        where: { userId },
        include: [
            {
                model: Document,
                as: 'document',
                include: [{ model: User, as: 'owner' }],
            },
        ],
        order: [['createdAt', 'DESC']],
    });

    // Filtra fora casos onde o documento foi excluído (segurança contra dados órfãos)
    let result = signatories
        .filter((s) => s.document)
        .map((s) => ({
            signatoryId: s.id,
            accessToken: s.accessToken,
            signatoryStatus: s.status,
            signedAt: s.signedAt,
            document: {
                id: s.document.id,
                title: s.document.title,
                status: s.document.status,
                createdAt: s.document.createdAt,
                ownerName: s.document.owner?.name || 'Usuário desconhecido',
            },
        }));

    // Por padrão, documentos já finalizados saem daqui e vão pra aba "Finalizados".
    if (!includeCompleted) {
        result = result.filter((item) => item.document.status !== 'COMPLETED');
    }

    return result;
}

// Documentos finalizados (status COMPLETED) onde o usuário é signatário — mesmo
// formato de listPendingSignaturesForUser, reaproveitando a mesma query base.
export async function listCompletedSignaturesForUser(userId) {
    const all = await listPendingSignaturesForUser(userId, true);
    return all.filter((item) => item.document.status === 'COMPLETED');
}