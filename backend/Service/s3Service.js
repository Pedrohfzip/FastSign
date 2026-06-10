import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Gera o caminho organizado no S3.
 * Estrutura: {userId}/{documentId}/v{version}/{sanitizedFilename}
 */
export const buildS3Key = (userId, documentId, versionNumber, originalName) => {
    const sanitized = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]/g, '_')
        .replace(/_+/g, '_');

    return `${userId}/${documentId}/v${versionNumber}/${sanitized}`;
};

/**
 * Faz upload de um buffer para o S3.
 * @param {Buffer} fileBuffer
 * @param {string} s3Key
 * @param {string} mimeType
 * @returns {Promise<{ s3Key, s3Bucket, s3Url }>}
 */
export const uploadToS3 = async (fileBuffer, s3Key, mimeType) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        // Manter privado — acessar via pre-signed URL
        ACL: 'private',
        ServerSideEncryption: 'AES256',
        Metadata: {
            uploadedAt: new Date().toISOString(),
        },
    });

    await s3.send(command);

    return {
        s3Key,
        s3Bucket: BUCKET,
        // URL base (não pública — usar getPresignedUrl para acesso)
        s3Url: `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
    };
};

/**
 * Gera URL temporária de acesso ao arquivo (padrão: 1 hora).
 * @param {string} s3Key
 * @param {number} expiresInSeconds
 */
export const getPresignedUrl = async (s3Key, expiresInSeconds = 3600) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
    });

    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};

/**
 * Remove um arquivo do S3 (ex: ao deletar uma versão).
 * @param {string} s3Key
 */
export const deleteFromS3 = async (s3Key) => {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
    });

    await s3.send(command);
};
