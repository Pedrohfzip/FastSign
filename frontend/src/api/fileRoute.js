import api from './index';

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/files', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};


export const test = async () => {
    const data = {"name": "Teste de Documento", "content": "Conteúdo do documento para teste"};
    const response = await api.post('/documents', data, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};