# FastSign — Contexto do Projeto

Plataforma de assinatura eletrônica de documentos (PDF). Projeto pessoal/portfólio, foco em fluxo rápido e simples: upload de PDF → adicionar signatários → cada um assina via link único → documento final fica com a assinatura "carimbada".

## Stack

- **Frontend**: React + Vite, React Router v7 (`react-router`, não `react-router-dom`), Framer Motion, Tailwind, lucide-react
- **Backend**: Node.js ESM (`"type": "module"` no package.json), Express, Sequelize + PostgreSQL
- **Infra**: Docker Compose (serviços: `fastsign-frontend`, `fastsign-backend`, `fastsign-db`, `fastsign-ollama`)
- **IA local**: Ollama rodando `llama3.2:3b`, com GPU NVIDIA passthrough configurado (RTX 3050)
- **E-mail**: Resend (modo sandbox — só envia pro e-mail cadastrado na conta Resend até verificar domínio próprio)

## Estrutura de pastas

```
backend/
  controllers/       → DocController.js, AuthController.js, SignController.js
  Service/            → DocumentService.js, SignatoryService.js, AuthService.js, AIService.js,
                         SignaturePositionService.js, PdfStampService.js (carimba a imagem de
                         assinatura no PDF via pdf-lib E gera o certificado de assinaturas anexado
                         ao final — ver "Fluxo de assinatura"), EmailService.js, StorageService.js
  database/models/    → Document.js, DocumentVersion.js, Signatory.js, Signature.js, User.js, index.js
  database/migrations/ → sempre em .cjs (CommonJS), não .js
  routes/             → documentRouter.js, loginRoute.js, signRouter.js, index.js
  middlewares/        → authMiddleware.js (requireAuth), uploadMiddleware.js
  index.js             → entrypoint (ORDEM IMPORTA: 'dotenv/config' precisa ser o PRIMEIRO import)

frontend/src/
  pages/               → Home.jsx, Login.jsx, SignUp.jsx, UploadFile.jsx, AddSignatories.jsx,
                         DocumentToSignDetail.jsx (tela de detalhe pré-assinatura do dono logado,
                         com resumo via IA sob demanda; leva pra SignScreen.jsx), SignScreen.jsx
                         (assinatura do próprio dono, autenticada), PublicSign.jsx (signatário externo,
                         pública — sem tela de detalhe separada, tudo numa página só), MyDocuments.jsx
                         (3 abas: Meus documentos / Documentos para assinar / Finalizados — ver "Fluxo
                         de assinatura"), DocumentDetail.jsx (tem botão "Baixar documento" que baixa a
                         `currentVersion` via `GET /documents/:id/file` como blob — já vem com o
                         certificado de assinaturas se houver alguma assinatura)
  components/          → Header.jsx, ProtectedRoute.jsx, RootGate.jsx, PdfViewer.jsx (visualizador
                         genérico de PDF via pdfjs-dist, com paginação por botões — sem NENHUMA lógica
                         de assinatura), PdfPositionPicker.jsx (compõe o PdfViewer + a lógica de
                         escolher/marcar onde a assinatura vai, incluindo a prévia WYSIWYG da imagem
                         de assinatura gerada; usado em SignScreen.jsx e PublicSign.jsx)
  hooks/               → useSignatureImage.js (gera a imagem de assinatura — PNG data URL — a partir
                         de um nome, num <canvas> fora do DOM, usando a fonte "Dancing Script")
  context/             → AuthContext.jsx (useAuth hook)
  api/                 → index.js (instância axios), fileRoute.js, authRoute.js (também chamado loginRoute.js
                         em algumas versões — CONFIRME o nome real no projeto), signRoute.js
  routes/index.jsx     → todas as rotas, com AnimatePresence + slide transition entre páginas
```

## Modelo de dados (relações principais)

```
User (id, name, email, cpf, passwordHash, isActive)
  └─ hasMany Document (userId)
  └─ hasMany Signatory (userId — só preenchido quando o email do signatário bate com o do usuário)

Document (id, userId, title, status[DRAFT|PENDING|IN_PROGRESS|COMPLETED|CANCELLED],
          currentVersionId, aiSummary, suggestedPage/X/Y, contentPageCount, deletedAt)
  paranoid: true → soft delete nativo do Sequelize (deletedAt), NÃO apaga a linha
  contentPageCount: nº de páginas do documento "real" (original + carimbos), SEM contar a(s)
    página(s) de certificado de assinatura anexadas no final. Fica null até a 1ª assinatura, quando
    é fixado pra sempre — ver "Fluxo de assinatura" e PdfStampService.appendSignatureCertificate
  └─ hasMany DocumentVersion
  └─ hasMany Signatory
  └─ belongsTo User as 'owner'

DocumentVersion (id, documentId, versionNumber, filePath, fileSize, checksum, pageCount, uploadedBy)
  → cada assinatura CRIA UMA NOVA VERSÃO do PDF já carimbado (via pdf-lib, em PdfStampService.js).
    uploadedBy é sempre o DONO do documento (document.userId), não o signatário — signatário não é
    necessariamente um User. pageCount só é populado a partir de agora (versões criadas antes disso
    ficam null pra sempre, sem backfill)

Signatory (id, documentId, userId[nullable], name, email, status[PENDING|SIGNED|DECLINED],
           accessToken, signedAt)
  → accessToken usado nos links /assinar/:token (público) e /sign/:token (autenticado, é o dono)

Signature (id, signatoryId, documentVersionId, signatureImage, signatureType, documentHash,
           ipAddress, userAgent, signedAt)
  → evidência jurídica: hash SHA-256 do PDF no momento exato da assinatura + IP + user agent.
    documentVersionId aponta pra versão PRÉ-carimbo (a que o signatário efetivamente revisou/hasheou),
    NÃO pra versão nova que o próprio ato de assinar cria — de propósito, pra manter documentHash e
    a versão referenciada sempre consistentes entre si. signatureImage é um PNG em base64 data URL
    (TEXT no banco), gerado por useSignatureImage.js no frontend
```

## Autenticação

- JWT em **cookie httpOnly** (não localStorage) — mais seguro contra XSS
- `requireAuth` middleware injeta `req.userId` a partir do JWT — **sempre** usar `req.userId`, nunca confiar em `userId` vindo do body/params
- `AuthContext.jsx` no frontend: `useAuth()` expõe `user`, `isAuthenticated`, `loading`, `login()`, `logout()`
- `axios` configurado com `withCredentials: true` (essencial para enviar/receber o cookie)
- CORS no backend precisa de `credentials: true` E `origin` explícito (não pode ser `*` quando `credentials: true`)
- `RootGate.jsx`: se logado → redireciona `/` para `/upload`; se não → mostra Home
- `ProtectedRoute.jsx`: bloqueia rotas que exigem login, redireciona pra `/`

## Fluxo de assinatura

1. Upload de PDF → `POST /documents` (autenticado) → cria `Document` + `DocumentVersion` v1
2. Em background (sem `await`, não bloqueia a resposta): gera resumo via IA (`generateDocumentSummary`) E detecta posição sugerida de assinatura (`detectSignaturePosition`, heurística por regex procurando "assinatura", "local e data", linhas de sublinhado, etc. — sem IA, é rápido e determinístico; fallback = terço inferior da última página). Esse resumo também pode ser gerado sob demanda depois, via `GET /documents/:id/resume` (usado em `DocumentToSignDetail.jsx`)
3. `POST /documents/:id/signatories` → adiciona signatários (nome + email). Se o email bater com o do dono logado, `Signatory.userId` é vinculado automaticamente (`isSelf: true` na resposta)
4. Signatário que é o próprio dono → em `MyDocuments.jsx` cai em `/documents/to-sign/:token` (`DocumentToSignDetail.jsx`, detalhe + resumo IA) → botão leva para `/sign/:token` (rota protegida, usa `SignScreen.jsx`)
5. Signatário externo → recebe e-mail (via Resend) com link `/assinar/:token` (rota pública, `PublicSign.jsx` — tudo numa página só, sem tela de detalhe antes)
6. Na tela de assinar (`SignScreen.jsx`/`PublicSign.jsx`): um card de instrução ("Clique no lugar do documento onde você quer colocar sua assinatura...") fica acima do picker, explicando a interação antes do usuário tentar. Campo de nome pré-preenchido com `data.signatory.name` (editável) alimenta `useSignatureImage.js`, que gera uma assinatura em PNG (fonte cursiva "Dancing Script", num `<canvas>` fora do DOM). `PdfPositionPicker.jsx` (que compõe o `PdfViewer.jsx` genérico) mostra essa imagem já posicionada na sugestão heurística — dá pra navegar entre páginas e tocar no documento pra escolher outro ponto, e a prévia é a imagem REAL (não um pin genérico), centralizada no ponto clicado. É preciso marcar o checkbox "Confirmo minha assinatura e a posição selecionada" pra habilitar o botão de assinar — qualquer edição no nome OU novo clique no documento desmarca essa confirmação de novo. O botão dispara `POST /sign/:token` com `{ signatureType: 'TYPED', signatureImage, position }` — a imagem é OBRIGATÓRIA (backend rejeita com 400 se faltar)
7. Backend (`signDocument` em `SignatoryService.js`, tudo dentro de uma `sequelize.transaction` com `lock: t.LOCK.UPDATE` na linha do `Document`): calcula o hash SHA-256 do PDF PRÉ-carimbo, separa as páginas de "conteúdo real" do certificado de assinaturas de uma rodada anterior (se houver, via `PdfStampService.stripTrailingPages` + `Document.contentPageCount`), chama `PdfStampService.stampSignatureImage` (pdf-lib: `embedPng` + `drawImage` centralizado no ponto clicado, largura = 28% da largura da página — `STAMP_WIDTH_RATIO`, tem que bater com o `width: "28%"` da prévia no frontend) só nas páginas de conteúdo, e então `PdfStampService.appendSignatureCertificate` monta e anexa o(s) certificado(s) atualizado(s) — ver bloco abaixo. Salva o resultado como uma **nova `DocumentVersion`** (`storageService.saveVersionFile`), cria o registro `Signature` (apontando pra versão pré-carimbo — ver "Modelo de dados"), atualiza `Document.currentVersionId` pra nova versão, e por fim `Signatory.status = SIGNED`. Se o carimbo/certificado falhar, nada disso é persistido (erro real, 5xx) — diferente de IA/e-mail, aqui não existe "falha silenciosa"
8. Quando todos os signatários assinaram → `Document.status = COMPLETED` automaticamente
9. Listagem em `MyDocuments.jsx` tem 3 abas: "Meus documentos" e "Documentos para assinar" (ambas excluem documentos `COMPLETED` por padrão) e "Finalizados" (`GET /documents/completed`, unifica documentos dos quais o usuário é dono com documentos em que é signatário, deduplicando por id e priorizando `role: 'owner'` em caso de sobreposição)
10. Certificado de assinaturas (`PdfStampService.appendSignatureCertificate`): a partir da 1ª assinatura, cada nova assinatura REGENERA (não empilha) uma página de certificado no final do PDF, listando TODOS os signatários confirmados até aquele momento — nome, e-mail, data/hora (`pt-BR`, fuso America/Sao_Paulo), tipo de assinatura, IP, uma miniatura da assinatura, e o `documentHash` (SHA-256) daquele signatário especificamente, que serve de prova de integridade. Pagina automaticamente em "(continuação)" se não couber numa página só. Documento sem NENHUMA assinatura não ganha certificado algum. `DocumentDetail.jsx` tem um botão "Baixar documento" que baixa a `currentVersion` (já com certificado, se houver)

## Convenções que sempre seguir

- **Migrations sempre em `.cjs`**, nunca `.js` (o projeto é ESM, migrations usam `module.exports` CommonJS)
- **`import 'dotenv/config'` deve ser o PRIMEIRO import** em `backend/index.js` — senão variáveis de ambiente chegam `undefined` em módulos importados em cascata (ex: `EmailService.js`, `AIService.js`)
- **Nomes de arquivo com casing EXATO** entre import e arquivo real — Windows não é case-sensitive mas o container Linux é; isso já causou bugs de hot-reload que pareciam não ter explicação
- **Nunca confiar em `req.body.userId`** — sempre `req.userId` (do middleware `requireAuth`)
- **Erros nos services usam `err.statusCode` customizado** (404, 403, 409, 410, etc.), capturado nos controllers via `err.statusCode || 500`
- **Console.error prefixado**: `console.error('[NomeArquivo.nomeFuncao]', err)`
- **Rotas com path fixo (`/to-sign`, `/completed`) precisam vir ANTES de rotas com `:id`** no Express, senão o path fixo é interpretado como um `:id`
- `express.json()` está com `limit: '2mb'` (o padrão do Express é 100kb) — necessário pra caber a imagem de assinatura em base64; se adicionar outro payload grande em JSON, lembrar desse teto
- Paleta visual fixa: fundo `#0b0b12`, accent `#5b6af0` → `#7c5cf6` (gradiente), bordas `rgba(255,255,255,0.07)`
- Toda página usa `AnimatePresence` com slide transition (direção muda conforme `PUSH` vs `POP` do React Router)
- Falhas de e-mail/IA NUNCA devem quebrar o fluxo principal (try/catch silencioso com log, não propaga erro)

## Bibliotecas com pegadinhas conhecidas

- **`pdf-parse`**: abandonado, dá erro de import ESM/CommonJS — **trocado por `pdfjs-dist/legacy/build/pdf.mjs`** para extração de texto no backend
- **`pdfjs-dist` no frontend**: precisa do worker configurado via `?url` import (`pdfjs-dist/build/pdf.worker.min.mjs?url`)
- **`PdfViewer.jsx` carrega por URL, não por `arrayBuffer`**: usa `pdfjsLib.getDocument(url).promise` passando direto uma string — funciona tanto com `blob:` URLs (`URL.createObjectURL(file)`, lembrar de dar `revokeObjectURL` depois) quanto com URLs http normais. Quem só tem um `Blob`/`File` (ex: resposta de um `axios` com `responseType: 'blob'`) precisa converter pra blob URL antes de passar pro componente
- **`pdf-lib`**: usado em `PdfStampService.js` pra carimbar a imagem de assinatura no PDF final.
  Coordenadas são bottom-up (origem no canto inferior esquerdo, Y cresce pra cima) — o oposto da
  convenção de tela usada em `position` (Y=0 no topo), então é preciso inverter: `pdfY = (1 -
  normalizedY) * pageHeight`, mesma lógica (invertida) que `SignaturePositionService.js` já usa pro
  caminho contrário. Cliques na borda só são clampados em `[0,1]` no frontend (não numa margem segura
  tipo `[0.1,0.9]`), então o carimbo em si precisa ser clampado de novo no backend pra não sair da página
- **Sequelize `lock: t.LOCK.UPDATE` + `include` não combinam bem no Postgres** quando a associação é
  nullable (`Document.currentVersionId` é nullable): o Postgres recusa `FOR UPDATE` do lado nullable de
  um LEFT OUTER JOIN. Solução usada em `signDocument`: travar o `Document` sozinho (sem include) e
  buscar a `DocumentVersion` associada numa segunda query, dentro da mesma transação
- **`pdf-lib` + `StandardFonts` (Helvetica/Courier) só desenham WinAnsiEncoding** (ASCII + Latin-1,
  mais uma dúzia de símbolos tipográficos tipo travessão/aspas curvas em posições especiais 0x80-0x9F
  do cp1252) — qualquer outro caractere (emoji, CJK, ou até um caractere de controle vindo de um nome
  de arquivo com encoding corrompido, o que JÁ aconteceu com um título real no dev) faz `page.drawText`
  lançar exceção. Como `appendSignatureCertificate` roda DENTRO da transação de `signDocument`, um erro
  aí bloquearia a assinatura inteira — por isso todo texto vindo de dado do usuário (título do
  documento, nome, e-mail do signatário) passa por `sanitizePdfText` (em `PdfStampService.js`) antes de
  ser desenhado, que remove caracteres de controle e troca qualquer coisa fora do alfabeto suportado por
  "?". Ao adicionar QUALQUER novo `drawText` com dado vindo do usuário nesse arquivo, sanitizar primeiro
- **`@fontsource/dancing-script`**: fonte self-hosted (não CDN do Google Fonts) — funciona offline no
  Docker. Importado uma vez em `main.jsx` (`@fontsource/dancing-script/700.css`). Desenhar texto num
  `<canvas>` ANTES da webfont terminar de carregar usa silenciosamente a fonte padrão — sempre esperar
  `document.fonts.load(...)`/`document.fonts.ready` antes de `fillText` (com timeout e fallback pra
  `cursive` genérica, pra nunca travar a geração da assinatura por causa disso)

## Docker / Ambiente

- Windows + Docker Desktop + WSL2. Hot reload do Vite exige `usePolling: true` no `vite.config.js`
- Se editar `.env` ou `docker-compose.yml`: `docker compose restart <serviço>` geralmente resolve; se não, `docker compose down && docker compose up`
- GPU: Ollama configurado com `deploy.resources.reservations.devices` (driver nvidia) — requer NVIDIA Container Toolkit instalado numa distro WSL completa (Ubuntu), não na distro interna `docker-desktop`
- Ollama: usar `keep_alive: "10m"` nas chamadas para evitar reload do modelo a cada requisição

## Pendências conhecidas (não implementadas ainda)

- Verificação de domínio próprio no Resend (hoje só envia pro email da conta sandbox)
- Rate limiting / expiração de `accessToken` dos signatários
- Fine-tuning ou upgrade de modelo Ollama se qualidade do resumo/posição não for suficiente
- O lock de linha em `signDocument` (`lock: t.LOCK.UPDATE` no `Document`) serializa assinaturas
  concorrentes NO MESMO documento (evita colisão de `version_number`), mas não faz nada por rate
  limiting/replay do `accessToken` em si — continua coberto pelo item acima
- `DocumentVersion.pageCount` só é populado pras versões criadas a partir da assinatura (via
  `PdfStampService`); a v1 de upload e qualquer versão anterior a essa mudança ficam com `pageCount:
  null` pra sempre — sem backfill
- O picker de posição (`PdfPositionPicker.jsx`) deixa clicar em QUALQUER página do PDF, inclusive numa
  página de certificado de assinatura já anexada por uma assinatura anterior (2º signatário em diante).
  O backend se protege disso (clampa pra última página de CONTEÚDO se o `position.page` clicado cair
  fora do `contentPageCount`), mas não é a UX ideal — o certo seria o frontend nem deixar escolher essas
  páginas. Não implementado ainda
