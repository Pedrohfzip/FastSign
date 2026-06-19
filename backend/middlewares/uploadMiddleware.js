import  multer  from 'multer';

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// Armazena em memória (buffer) — o service cuida do envio pro S3
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
            Object.assign(new Error('Apenas arquivos PDF são aceitos.'), { statusCode: 422 }),
            false
        );
    }
    cb(null, true);
};

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_SIZE_BYTES,
        files: 1, // um arquivo por request
    },
}).single('file'); // campo "file" — deve bater com o formData.append('file', ...)

/**
 * Wrapper que transforma o callback do multer em Promise,
 * permitindo uso com async/await nos controllers.
 */
export const handleUpload = (req, res) =>
    new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
            console.log('Upload middleware result:', { err, file: req.file });
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return reject(
                        Object.assign(new Error('Arquivo muito grande. Limite de 50MB.'), {
                            statusCode: 422,
                        })
                    );
                }
                return reject(Object.assign(err, { statusCode: 400 }));
            }
            if (err) return reject(err);
            resolve();
        });
    });
