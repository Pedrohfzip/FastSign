import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import sequelize from './database/index.js';
import router from './routes/index.js';
import dotenv from 'dotenv';
const app = express();

dotenv.config();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true, // ⬅️ estava faltando
}));
app.use(express.json());
app.use(cookieParser());


app.use('/api', router);

const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database conectado.');

        app.listen(3001, () => {
            console.log('Server rodando na porta 3001');
        });
    } catch (error) {
        console.error('Erro ao conectar banco:', error);
        process.exit(1); // encerra se o banco falhou
    }
};

start();