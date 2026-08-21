import api from './index';

export const registerUser = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const loginUser = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const logoutUser = async () => {
    const response = await api.post('/auth/logout');
    return response.data;
};

export const fetchCurrentUser = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const updateProfile = async (profileData) => {
    const response = await api.patch('/auth/me', profileData);
    return response.data;
};

export const changePassword = async (passwordData) => {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
};