import axios from 'axios';

// Usa o mesmo host que serviu a página (window.location.hostname) em vez de um
// 'localhost' fixo — assim funciona tanto acessando do próprio PC quanto de outro
// dispositivo na rede local (ex: celular acessando http://192.168.x.x:5173), sem
// precisar trocar nada manualmente. A porta do backend continua fixa em 3001.
const baseURL = `http://${window.location.hostname}:3001/api`;

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // ESSENCIAL: envia/recebe o cookie httpOnly em toda requisição
});

// Endpoints onde um 401 é uma resposta ESPERADA (não logado ainda),
// não um erro de sessão expirada — não deve disparar redirect
const AUTH_CHECK_ENDPOINTS = ['/auth/me', '/auth/login', '/auth/register'];

// Interceptor de resposta para tratar erros globais
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthCheck = AUTH_CHECK_ENDPOINTS.some((endpoint) =>
            error.config?.url?.includes(endpoint)
        );
        const alreadyOnLogin = window.location.pathname === '/login';

        if (error.response?.status === 401 && !isAuthCheck && !alreadyOnLogin) {
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;