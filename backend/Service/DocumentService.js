import crypto from 'crypto';
import db from '../database/models/index.js';
import { buildS3Key, uploadToS3, getPresignedUrl, deleteFromS3 } from './s3Service.js';

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB



export const createDocument = async (file, userId) => {
    validateFile(file);

    const checksum = computeChecksum(file.buffer);

    return sequelize.transaction(async (t) => {
        // 1. Cria o envelope do documento
        const document = await Document.create(
            {
                userId,
                title: file.originalname.replace(/\.[^/.]+$/, ''), // nome sem extensão
                originalName: file.originalname,
                mimeType: file.mimetype,
                status: 'DRAFT',
            },
            { transaction: t }
        );

        // 2. Define o caminho no S3 com versionamento
        const versionNumber = 1;
        const s3Key = buildS3Key(userId, document.id, versionNumber, file.originalname);

        // 3. Faz upload para o S3
        const { s3Key: savedKey, s3Bucket, s3Url } = await uploadToS3(
            file.buffer,
            s3Key,
            file.mimetype
        );

        // 4. Cria o registro de versão
        const version = await DocumentVersion.create(
            {
                documentId: document.id,
                versionNumber,
                s3Key: savedKey,
                s3Bucket,
                s3Url,
                fileSize: file.size,
                checksum,
                uploadedBy: userId,
                metadata: {
                    originalName: file.originalname,
                    uploadedAt: new Date().toISOString(),
                },
            },
            { transaction: t }
        );

        // 5. Aponta documento para versão atual
        await document.update({ currentVersionId: version.id }, { transaction: t });

        return { document, version };
    });
};