import api from './index';

export const uploadDocument = async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        },
    });

    return response.data;
};


export const getDocuments = async () => {
    const response = await api.get('/documents');
    return response.data;
};


export const getDocument = async (documentId) => {
    const response = await api.get(`/documents/${documentId}/file`);
    return response.data;
};

// responseType 'blob' — é um PDF binário, não JSON. Usado pelo botão de download em
// DocumentDetail.jsx (o arquivo já vem com as páginas de certificado de assinatura,
// se houver alguma, já que é sempre a currentVersion do documento).
export const downloadDocumentFile = async (documentId) => {
    const response = await api.get(`/documents/${documentId}/file`, { responseType: 'blob' });
    return response.data;
};

export const addSignatories = async (documentId, signatories) => {
    const response = await api.post(`/documents/${documentId}/signatories`, { signatories });
    return response.data;
};

export const getSignatories = async (documentId) => {
    const response = await api.get(`/documents/${documentId}/signatories`);
    return response.data;
};

export const getDocumentDetail = async (documentId) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
};

export const getDocumentResume = async (documentId, signal) => {
    const response = await api.get(`/documents/${documentId}/resume`, { signal });
    return response.data;
}

export const getDocumentsToSign = async () => {
    const response = await api.get('/documents/to-sign');
    return response.data;
};

export const getCompletedDocuments = async () => {
    const response = await api.get('/documents/completed');
    return response.data;
};

export const deleteDocument = async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
};