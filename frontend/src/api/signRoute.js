import api from './index';

export const getSignatureInfo = async (accessToken) => {
    const response = await api.get(`/sign/${accessToken}`);
    return response.data;
};

export const confirmSignature = async (accessToken) => {
    const response = await api.post(`/sign/${accessToken}`, {
        signatureType: 'TYPED', // sem captura visual por enquanto — só confirmação
    });
    return response.data;
};