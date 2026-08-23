import api from './index';

export const getSignatureInfo = async (accessToken) => {
    const response = await api.get(`/sign/${accessToken}`);
    return response.data;
};

export const getSignatureFile = async (accessToken) => {
    const response = await api.get(`/sign/${accessToken}/file`, { responseType: 'blob' });
    return response.data;
};

export const confirmSignature = async (accessToken, { signatureImage, position, signatoryDocumentType, signatoryDocumentNumber }) => {
    const response = await api.post(`/sign/${accessToken}`, {
        signatureType: 'TYPED',
        signatureImage,
        position,
        signatoryDocumentType,
        signatoryDocumentNumber,
    });
    return response.data;
};