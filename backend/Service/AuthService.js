import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/models/index.js';

const { User } = db;

const SALT_ROUNDS = 10;

export async function registerUser({ name, email, cpf, password }) {
    const cpfDigits = cpf.replace(/\D/g, '');

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
        const err = new Error('E-mail já cadastrado.');
        err.status = 409;
        throw err;
    }

    const existingCpf = await User.findOne({ where: { cpf: cpfDigits } });
    if (existingCpf) {
        const err = new Error('CPF já cadastrado.');
        err.status = 409;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
        name,
        email,
        cpf: cpfDigits,
        passwordHash,
    });

    // nunca retornar o hash da senha pro cliente
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
    };
}

export async function loginUser({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
        const err = new Error('E-mail ou senha inválidos.');
        err.status = 401;
        throw err;
    }

    if (!user.isActive) {
        const err = new Error('Conta desativada.');
        err.status = 403;
        throw err;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
        const err = new Error('E-mail ou senha inválidos.');
        err.status = 401;
        throw err;
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
        },
    };
}

export async function getUserById(userId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'cpf', 'isActive'],
    });
    if (!user) {
        const err = new Error('Usuário não encontrado.');
        err.status = 404;
        throw err;
    }
    return user;
}