import api from './index';

export const getSavedSignatories = async () => {
    const response = await api.get('/saved-signatories');
    return response.data;
};

export const deleteSavedSignatory = async (id) => {
    const response = await api.delete(`/saved-signatories/${id}`);
    return response.data;
};
