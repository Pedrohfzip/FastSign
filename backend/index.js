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

// Domínio(s) de produção "de verdade" (pode ter mais de um — ex: com e sem "www").
// Lista separada por vírgula em ALLOWED_ORIGINS, parseada uma única vez aqui fora do
// callback de origin (não recalcular a cada requisição). FRONTEND_URL continua sendo
// aceito também por compatibilidade com quem só setava essa variável antes, mas deixou
// de ser a ÚNICA fonte de verdade pra CORS — use ALLOWED_ORIGINS pra múltiplos domínios.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Classe própria (em vez de comparar err.message) pra distinguir de forma confiável,
// no error handler global lá embaixo, um bloqueio de CORS de qualquer outro erro.
class CorsOriginError extends Error {
    constructor(origin) {
        super('Não permitido pelo CORS.');
        this.name = 'CorsOriginError';
        this.origin = origin;
    }
}

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (LAN_ORIGIN_PATTERN.test(origin)) {
            return callback(null, true);
        }

        if (TRYCLOUDFLARE_PATTERN.test(origin)) {
            return callback(null, true);
        }

        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }

        console.warn('[CORS] Origem bloqueada:', origin);
        callback(new CorsOriginError(origin));
    },
    credentials: true,
}));
//padrão do Express é 100kb — a imagem base64 da assinatura gerada por
// canvas pode passar disso, então aumentamos pra não estourar com um 413 opaco.
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// URLs de assinatura (/assinar/:accessToken, /sign/:accessToken) carregam um token de
// posse na própria URL — sem isso, o navegador vazaria a URL inteira (token incluído)
// no cabeçalho Referer pra qualquer link/recurso de terceiro que viesse a ser carregado
// a partir dessas páginas no futuro. `no-referrer` nunca envia Referer em NENHUMA
// requisição saindo do app (nem same-origin), mais estrito que o padrão do navegador
// (`strict-origin-when-cross-origin`) — seguro aqui porque nada no app depende de ler
// esse cabeçalho.
app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});


app.use('/api', router);

// Error handler global — DEPOIS de todas as rotas/middlewares, assinatura de 4
// argumentos é o que faz o Express reconhecer isso como error handler. Sem isso, um
// bloqueio de CORS (ou qualquer outro erro passado pra next()) caía no handler padrão
// do Express, que devolve um 500 genérico em HTML e mascara a causa real.
app.use((err, req, res, next) => {
    if (err instanceof CorsOriginError) {
        return res.status(403).json({ error: 'Origem não permitida.' });
    }

    // Nunca vazar stack trace/detalhes internos pro cliente — mas sempre logar
    // completo aqui, pra aparecer em `docker compose logs backend` em vez de sumir
    // atrás de um "500" sem contexto.
    console.error('[GlobalErrorHandler]', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

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
