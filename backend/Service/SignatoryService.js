import crypto from 'crypto';
import { Op } from 'sequelize';
import db from '../database/models/index.js';
import storageService from './StorageService.js';
import { generateToken } from '../utils/generateToken.js';
import { sendSignatureInvite } from './EmailService.js';
import { stampSignatureImage, getPdfPageCount, stripTrailingPages, appendSignatureCertificate } from './PdfStampService.js';
import { upsertSavedSignatory } from './SavedSignatoryService.js';
const { Document, DocumentVersion, Signatory, Signature, User, sequelize } = db;

// Prazo de validade do link de assinatura (/assinar/:accessToken e /sign/:accessToken),
// contado a partir da criação do Signatory. Passado esse prazo, o token para de
// funcionar em qualquer rota (consulta, arquivo ou assinatura) mesmo que o
// signatário ainda esteja PENDING — mitiga um link antigo vazado/esquecido em algum
// lugar (e-mail encaminhado, histórico de navegador) continuar válido indefinidamente.
export const SIGNATORY_TOKEN_TTL_DAYS = 7;

function tokenExpiryDate() {
    return new Date(Date.now() + SIGNATORY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// Checagem única, reaproveitada em toda rota que recebe um accessToken — token sem
// `tokenExpiresAt` (signatário criado antes desta feature) nunca expira.
function assertTokenNotExpired(signatory) {
    if (signatory.tokenExpiresAt && new Date(signatory.tokenExpiresAt).getTime() < Date.now()) {
        const err = new Error('Este link de assinatura expirou. Peça ao remetente para reenviar o convite.');
        err.statusCode = 410;
        throw err;
    }
}

export async function addSignatoriesToDocument(documentId, signatoriesData, requestingUserId, requireDocument = false) {
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

    // Vale pra TODOS os signatários deste documento, não só os que estão sendo
    // adicionados agora nesta chamada — decidido uma vez, na primeira leva.
    if (requireDocument && !document.requireSignatoryDocument) {
        document.requireSignatoryDocument = true;
        await document.save();
    }

    const created = await Promise.all(
        signatoriesData.map(async ({ name, email, saveContact }) => {
            const normalizedEmail = email.trim().toLowerCase();
            const isSelf =
                requestingUser && normalizedEmail === requestingUser.email.trim().toLowerCase();

            // Se o e-mail bater com o de outro usuário já cadastrado no sistema (não o dono),
            // vincula o signatário a essa conta — assim o documento passa a aparecer pra ele
            // na aba "Documentos para assinar" (listPendingSignaturesForUser filtra por userId).
            // iLike sem wildcard = igualdade case-insensitive, já que o e-mail é salvo como veio
            // no cadastro e o Postgres compara STRING/varchar com case-sensitivity por padrão.
            let linkedUserId = null;
            if (isSelf) {
                linkedUserId = requestingUserId;
            } else {
                const matchedUser = await User.findOne({
                    where: { email: { [Op.iLike]: normalizedEmail } },
                });
                linkedUserId = matchedUser ? matchedUser.id : null;
            }

            const signatory = await Signatory.create({
                documentId,
                name,
                email,
                accessToken: generateToken(),
                status: 'PENDING',
                userId: linkedUserId,
                tokenExpiresAt: tokenExpiryDate(),
            });

            // Não envia e-mail pro próprio dono — ele já tem o CTA "Assinar agora" direto no app.
            // Um signatário vinculado a OUTRO usuário cadastrado ainda recebe o convite normalmente:
            // o vínculo só faz o documento aparecer na aba dele, o e-mail continua sendo o aviso.
            if (!isSelf) {
                const signLink = `${frontendUrl}/assinar/${signatory.accessToken}`;
                await sendSignatureInvite({
                    to: email,
                    signatoryName: name,
                    documentTitle: document.title,
                    signLink,
                });
            }

            // "Salvar como contato" é só uma conveniência do dono pra reutilizar nome/e-mail
            // da próxima vez — uma falha aqui nunca pode quebrar o fluxo principal de adicionar
            // signatários, mesmo princípio já usado no projeto pra e-mail/IA.
            if (saveContact) {
                try {
                    await upsertSavedSignatory(requestingUserId, { name, email });
                } catch (err) {
                    console.error('[SignatoryService.addSignatoriesToDocument] falha ao salvar contato', err);
                }
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

    assertTokenNotExpired(signatory);

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

    assertTokenNotExpired(signatory);

    const buffer = await storageService.readVersionFile(signatory.document.currentVersion.filePath);

    return { buffer, originalName: signatory.document.originalName };
}

const VALID_DOCUMENT_TYPES = ['CPF', 'RG', 'OUTRO'];

export async function signDocument(
    accessToken,
    { signatureImage, signatureType, position, signatoryDocumentType, signatoryDocumentNumber },
    requestMeta
) {
    // Assinar sem carimbar seria um bug silencioso de integridade — a imagem é obrigatória.
    if (!signatureImage) {
        const err = new Error('Imagem de assinatura é obrigatória.');
        err.statusCode = 400;
        throw err;
    }

    const signatory = await Signatory.findOne({
        where: { accessToken },
        include: [{ model: Document, as: 'document' }],
    });

    if (!signatory) {
        const err = new Error('Link de assinatura inválido.');
        err.statusCode = 404;
        throw err;
    }

    assertTokenNotExpired(signatory);

    if (signatory.status !== 'PENDING') {
        const err = new Error('Este documento já foi assinado ou recusado por você.');
        err.statusCode = 409;
        throw err;
    }

    // Documento de identificação — só exigido quando o dono ligou essa opção ao
    // adicionar os signatários (ver addSignatoriesToDocument). É evidência adicional,
    // não uma validação de autenticidade real (ver About.jsx: "assinatura eletrônica
    // simples", sem ICP-Brasil) — por isso só checamos presença/formato básico, não
    // dígito verificador de CPF nem se o documento é genuíno.
    const documentNumber = (signatoryDocumentNumber || '').trim();
    if (signatory.document.requireSignatoryDocument) {
        if (!documentNumber) {
            const err = new Error('Informe o número do documento de identificação para assinar.');
            err.statusCode = 400;
            throw err;
        }
        if (!VALID_DOCUMENT_TYPES.includes(signatoryDocumentType)) {
            const err = new Error('Tipo de documento de identificação inválido.');
            err.statusCode = 400;
            throw err;
        }
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
            assertTokenNotExpired(freshSignatory);

            // hash do arquivo ANTES do carimbo — prova do que o signatário efetivamente revisou/assinou
            const preStampBuffer = await storageService.readVersionFile(currentVersion.filePath);
            const documentHash = crypto.createHash('sha256').update(preStampBuffer).digest('hex');
            const preStampVersionId = currentVersion.id;
            const signedAt = new Date();

            // O certificado de assinaturas (ver appendSignatureCertificate) é regenerado do
            // zero a cada assinatura, pra sempre listar TODOS os signatários confirmados até
            // aqui. Por isso, antes de carimbar, separamos as páginas de conteúdo real
            // (documento original + carimbos) das páginas de certificado que uma assinatura
            // anterior possa ter anexado — senão cada assinatura empilharia mais um
            // certificado no final do arquivo em vez de substituir o anterior.
            const contentPageCount = document.contentPageCount ?? (await getPdfPageCount(preStampBuffer));
            const contentBuffer = document.contentPageCount
                ? await stripTrailingPages(preStampBuffer, document.contentPageCount)
                : preStampBuffer;

            const { buffer: stampedContentBuffer } = await stampSignatureImage(contentBuffer, {
                imageDataUrl: signatureImage,
                position,
            });

            // Assinaturas já confirmadas por outros signatários + a que está sendo criada
            // agora, pra montar o certificado com a lista completa até este momento.
            const priorSignatures = await Signature.findAll({
                include: [{
                    model: Signatory,
                    as: 'signatory',
                    attributes: ['id', 'name', 'email'],
                    where: { documentId: document.id },
                }],
                transaction: t,
                order: [['signedAt', 'ASC']],
            });

            const allSignatoriesCount = await Signatory.count({ where: { documentId: document.id }, transaction: t });

            const certificateEntries = [
                ...priorSignatures.map((sig) => ({
                    name: sig.signatory.name,
                    email: sig.signatory.email,
                    signedAt: sig.signedAt,
                    documentHash: sig.documentHash,
                    ipAddress: sig.ipAddress,
                    signatureType: sig.signatureType,
                    signatureImage: sig.signatureImage,
                    signatoryDocumentType: sig.signatoryDocumentType,
                    signatoryDocumentNumber: sig.signatoryDocumentNumber,
                })),
                {
                    name: freshSignatory.name,
                    email: freshSignatory.email,
                    signedAt,
                    documentHash,
                    ipAddress: requestMeta.ip,
                    signatureType: signatureType || 'TYPED',
                    signatureImage,
                    signatoryDocumentType: signatory.document.requireSignatoryDocument ? signatoryDocumentType : null,
                    signatoryDocumentNumber: signatory.document.requireSignatoryDocument ? documentNumber : null,
                },
            ];

            const { buffer: finalBuffer, pageCount: finalPageCount } = await appendSignatureCertificate(stampedContentBuffer, {
                documentTitle: document.title,
                documentId: document.id,
                entries: certificateEntries,
                totalSignatories: allSignatoriesCount,
            });

            const newVersionNumber = currentVersion.versionNumber + 1;
            savedFile = await storageService.saveVersionFile(document.id, newVersionNumber, finalBuffer, 'application/pdf');

            const newVersion = await DocumentVersion.create({
                documentId: document.id,
                versionNumber: newVersionNumber,
                filePath: savedFile.filePath,
                fileSize: finalBuffer.length,
                checksum: savedFile.checksum,
                uploadedBy: document.userId,
                pageCount: finalPageCount,
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
                signatoryDocumentType: signatory.document.requireSignatoryDocument ? signatoryDocumentType : null,
                signatoryDocumentNumber: signatory.document.requireSignatoryDocument ? documentNumber : null,
                signedAt,
            }, { transaction: t });

            if (!document.contentPageCount) {
                document.contentPageCount = contentPageCount;
            }
            document.currentVersionId = newVersion.id;
            await document.save({ transaction: t });

            freshSignatory.status = 'SIGNED';
            freshSignatory.signedAt = signedAt;
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