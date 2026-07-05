import { registerUser, loginUser, getUserById } from '../Service/AuthService.js';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction, // exige HTTPS em produção
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
    path: '/',
};

const AuthController = {
    async register(req, res) {
        try {
            const { name, email, cpf, password } = req.body;

            if (!name || !email || !cpf || !password) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            }

            const newUser = await registerUser({ name, email, cpf, password });
            res.status(201).json(newUser);
        } catch (error) {
            console.error('Error registering user:', error);
            res.status(error.status || 500).json({ error: error.message || 'Erro ao registrar usuário.' });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
            }

            const { token, user } = await loginUser({ email, password });

            res.cookie('token', token, COOKIE_OPTIONS);
            res.status(200).json({ user });
        } catch (error) {
            console.error('Error logging in:', error);
            res.status(error.status || 500).json({ error: error.message || 'Erro ao fazer login.' });
        }
    },

    async logout(req, res) {
        res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: undefined });
        res.status(200).json({ message: 'Logout realizado com sucesso.' });
    },

    async me(req, res) {
        try {
            const user = await getUserById(req.userId);
            res.status(200).json({ user });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message || 'Erro ao buscar usuário.' });
        }
    },
};

export default AuthController;