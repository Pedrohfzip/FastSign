import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Em produção, defina STORAGE_ROOT como variável de ambiente.
// Dentro do container, process.cwd() é /app, então o default vira /app/storage/documents.
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage', 'documents');

function getDocumentDir(documentId) {
    return path.join(STORAGE_ROOT, documentId);
}

function getVersionFilename(versionNumber, mimeType) {
    const ext = mimeType === 'application/pdf' ? 'pdf' : 'bin';
    return `v${versionNumber}.${ext}`;
}

async function saveVersionFile(documentId, versionNumber, buffer, mimeType) {
    const dir = getDocumentDir(documentId);
    await fs.mkdir(dir, { recursive: true });

    const filename = getVersionFilename(versionNumber, mimeType);
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, buffer);

    // Salvamos o caminho RELATIVO no banco — facilita mover o STORAGE_ROOT no futuro
    const relativePath = path.relative(STORAGE_ROOT, fullPath);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    return { filePath: relativePath, fullPath, checksum };
}

async function readVersionFile(relativePath) {
    return fs.readFile(path.join(STORAGE_ROOT, relativePath));
}

async function deleteVersionFile(relativePath) {
    try {
        await fs.unlink(path.join(STORAGE_ROOT, relativePath));
    } catch (err) {
        if (err.code !== 'ENOENT') throw err; // ignora se já não existe
    }
}

function resolveFullPath(relativePath) {
    return path.join(STORAGE_ROOT, relativePath);
}

export default {
    saveVersionFile,
    readVersionFile,
    deleteVersionFile,
    resolveFullPath,
    STORAGE_ROOT,
};