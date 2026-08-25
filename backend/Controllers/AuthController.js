import { registerUser, loginUser, getUserById, updateProfile, changePassword } from '../Service/AuthService.js';

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
        console.log('Received registration request:', req.body); // Log the incoming request body
        try {
            const { name, email, cpf, password } = req.body;

            if (!name || !email || !cpf || !password) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            }

            const { token, user } = await registerUser({ name, email, cpf, password });

            // Cadastro já loga a conta na hora — mesmo cookie que login() seta, senão
            // SignUp.jsx navegaria pra uma rota protegida sem sessão nenhuma ainda.
            res.cookie('token', token, COOKIE_OPTIONS);
            res.status(201).json({ user });
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

    async updateProfile(req, res) {
        try {
            const { name, email, cpf } = req.body;

            if (!name || !email || !cpf) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            }

            const user = await updateProfile(req.userId, { name, email, cpf });
            res.status(200).json({ user });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(error.status || 500).json({ error: error.message || 'Erro ao atualizar perfil.' });
        }
    },

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres.' });
            }

            await changePassword(req.userId, { currentPassword, newPassword });
            res.status(200).json({ message: 'Senha atualizada com sucesso.' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(error.status || 500).json({ error: error.message || 'Erro ao trocar senha.' });
        }
    },
};

export default AuthController;