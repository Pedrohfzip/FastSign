import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
}