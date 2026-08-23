import rateLimit from 'express-rate-limit';

// Rotas de assinatura (signRouter) são públicas por natureza — não há requireAuth pra
// se apoiar. Dois limitadores complementares, os dois calculados por accessToken (não
// por IP: o link pode ser aberto de vários dispositivos/redes pelo MESMO signatário, e
// IP sozinho puniria escritórios/NAT compartilhado; accessToken já é imprevisível
// (64 hex chars, ver generateToken.js), então limitar por ele não abre brecha nova).

// Consulta (GET /:accessToken e /:accessToken/file) — carregamentos normais de página
// (retry de rede, refresh, abrir o PDF de novo) cabem tranquilo; barra scraping/polling
// automatizado em cima de um único link.
export const signReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.params.accessToken,
    message: { error: 'Muitas requisições para este link. Tente novamente em alguns minutos.' },
});

// Tentativas de assinar (POST /:accessToken) — ação de escrita cara (trava linha do
// Document, carimba o PDF, regenera certificado), então o teto é bem mais apertado que
// o de leitura. Uma pessoa real assina uma vez; sobra folga pra um "corrigi e cliquei de
// novo" depois de um erro de validação (documento de identificação faltando, etc.).
export const signWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.params.accessToken,
    message: { error: 'Muitas tentativas de assinatura para este link. Tente novamente em alguns minutos.' },
});
