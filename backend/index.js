import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import sequelize from './database/index.js';
import router from './routes/index.js';
const app = express();

dotenv.config();

// Além do localhost, libera qualquer origem na rede local (192.168.x.x, 10.x.x.x,
// 172.16-31.x.x) na porta do Vite — assim dá pra testar pelo celular sem precisar
// atualizar isso toda vez que o DHCP troca o IP do PC.
// Além do localhost, libera qualquer origem na rede local (192.168.x.x, 10.x.x.x,
// 172.16-31.x.x) na porta do Vite — assim dá pra testar pelo celular sem precisar
// atualizar isso toda vez que o DHCP troca o IP do PC.
const LAN_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/;

// Enquanto estivermos testando com Quick Tunnel (URL muda a cada restart do cloudflared)
const TRYCLOUDFLARE_PATTERN = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (LAN_ORIGIN_PATTERN.test(origin)) {
            return callback(null, true);
        }

        if (TRYCLOUDFLARE_PATTERN.test(origin)) {
            return callback(null, true);
        }

        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }

        console.warn('[CORS] Origem bloqueada:', origin);
        callback(new Error('Não permitido pelo CORS.'));
    },
    credentials: true,
}));
//padrão do Express é 100kb — a imagem base64 da assinatura gerada por
// canvas pode passar disso, então aumentamos pra não estourar com um 413 opaco.
app.use(express.json({ limit: '2mb' }));
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
