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

export const addSignatories = async (documentId, signatories) => {
    const response = await api.post(`/documents/${documentId}/signatories`, { signatories });
    return response.data;
};

export const getSignatories = async (documentId) => {
    const response = await api.get(`/documents/${documentId}/signatories`);
    return response.data;
};

