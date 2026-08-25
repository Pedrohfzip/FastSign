# FastSign — Contexto do Projeto

Plataforma de assinatura eletrônica de documentos (PDF). Projeto pessoal/portfólio, foco em fluxo rápido e simples: upload de PDF → adicionar signatários → cada um assina via link único → documento final fica com a assinatura "carimbada".

## Stack

- **Frontend**: React + Vite, React Router v7 (`react-router`, não `react-router-dom`), Framer Motion, Tailwind, lucide-react
- **Backend**: Node.js ESM (`"type": "module"` no package.json), Express, Sequelize + PostgreSQL
- **Infra**: Docker Compose (serviços: `fastsign-frontend`, `fastsign-backend`, `fastsign-db`, `fastsign-ollama`)
- **IA local**: Ollama rodando `qwen2.5:7b` (upgrade do `llama3.2:3b` original, resumos mais coerentes),
  com GPU NVIDIA passthrough configurado (RTX 3050, 8GB — o modelo em Q4_K_M ocupa ~4.7GB de VRAM). Como
  a GPU é compartilhada com o resto do Windows (jogos, browser, etc.), VRAM/uso de GPU concorrente pode
  deixar a geração drasticamente mais lenta (observado: de <30ms/token pra ~40s/token) — não é bug do
  FastSign, é contenção de GPU real. `llama3.2:3b` continua baixado no volume `ollama_data` como opção
  mais leve se precisar
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
  components/          → Header.jsx (logo "FastSign" no canto esquerdo só quando deslogado — logado
                         esse espaço é do botão de menu; o componente retorna `null` de propósito em
                         `/assinar/:accessToken`, já que o PublicSign.jsx não tem conta nem faz sentido
                         mostrar menu/Entrar ali — esse `return null` vem DEPOIS de todos os hooks, pra
                         não violar as Rules of Hooks ao navegar de/pra essa rota), ProtectedRoute.jsx,
                         RootGate.jsx, PdfViewer.jsx (visualizador genérico de PDF via pdfjs-dist, com
                         paginação por botões — sem NENHUMA lógica de assinatura; aceita um `maxPage`
                         opcional que trunca a navegação nas primeiras N páginas — genérico, não é
                         assinatura em si, quem decide o valor é quem usa o componente), PdfPositionPicker.jsx
                         (compõe o PdfViewer + a lógica de escolher/marcar onde a assinatura vai,
                         incluindo a prévia WYSIWYG da imagem de assinatura gerada; repassa seu próprio
                         `maxPage` pro PdfViewer pra não deixar navegar até uma página de certificado de
                         assinatura já anexada por uma rodada anterior — ver "Fluxo de assinatura"; usado em
                         SignScreen.jsx e PublicSign.jsx)
  hooks/               → useSignatureImage.js (gera a imagem de assinatura — PNG data URL — a partir
                         de um nome, num <canvas> fora do DOM, usando a fonte "Dancing Script")
  context/             → AuthContext.jsx (useAuth hook)
  api/                 → index.js (instância axios), fileRoute.js, authRoute.js (também chamado loginRoute.js
                         em algumas versões — CONFIRME o nome real no projeto), signRoute.js
  utils/               → formatDocument.js (`formatCPF` — formata "000.000.000-00" enquanto o usuário
                         digita; usado em SignUp.jsx e no campo opcional de documento de identificação
                         em SignScreen.jsx/PublicSign.jsx — mesma regra nos dois lugares, não duplicar)
  routes/index.jsx     → todas as rotas, com AnimatePresence + slide transition entre páginas
```

## Modelo de dados (relações principais)

```
User (id, name, email, cpf, passwordHash, isActive)
  └─ hasMany Document (userId)
  └─ hasMany Signatory (userId — só preenchido quando o email do signatário bate com o do usuário)

Document (id, userId, title, status[DRAFT|PENDING|IN_PROGRESS|COMPLETED|CANCELLED],
          currentVersionId, aiSummary, suggestedPage/X/Y, contentPageCount,
          requireSignatoryDocument, deletedAt)
  paranoid: true → soft delete nativo do Sequelize (deletedAt), NÃO apaga a linha
  contentPageCount: nº de páginas do documento "real" (original + carimbos), SEM contar a(s)
    página(s) de certificado de assinatura anexadas no final. Fica null até a 1ª assinatura, quando
    é fixado pra sempre — ver "Fluxo de assinatura" e PdfStampService.appendSignatureCertificate
  requireSignatoryDocument: opcional, decidido pelo DONO ao adicionar os signatários
    (AddSignatories.jsx, checkbox "Exigir documento de identificação") — default false. Quando true,
    vale pra TODOS os signatários deste documento (não dá pra ligar por signatário individual nem
    desligar depois de ligado). Ver "Fluxo de assinatura" e Signature.signatoryDocumentType/Number
  └─ hasMany DocumentVersion
  └─ hasMany Signatory
  └─ belongsTo User as 'owner'

DocumentVersion (id, documentId, versionNumber, filePath, fileSize, checksum, pageCount, uploadedBy)
  → cada assinatura CRIA UMA NOVA VERSÃO do PDF já carimbado (via pdf-lib, em PdfStampService.js).
    uploadedBy é sempre o DONO do documento (document.userId), não o signatário — signatário não é
    necessariamente um User. pageCount é populado por PdfStampService em toda versão criada a partir de
    uma assinatura; pras versões anteriores a essa mudança (a v1 de upload, sempre), foi rodado um
    backfill uma vez (migration `20260823020000-backfill-document-version-page-count.cjs`, lê o PDF de
    `file_path` no disco e calcula via pdf-lib) — fica null só quando o arquivo já não existe mais em
    disco nessa hora (dado órfão)

Signatory (id, documentId, userId[nullable], name, email, status[PENDING|SIGNED|DECLINED],
           accessToken, tokenExpiresAt, signedAt)
  → accessToken usado nos links /assinar/:token (público) e /sign/:token (autenticado, é o dono).
    tokenExpiresAt é setado na criação (addSignatoriesToDocument, `now + SIGNATORY_TOKEN_TTL_DAYS`
    dias — 7 hoje, constante em SignatoryService.js) e checado (assertTokenNotExpired) nas 3 rotas
    que recebem o token — GET /sign/:token, GET /sign/:token/file, POST /sign/:token — retornando
    410 se vencido. Nullable: signatórios criados antes dessa feature ficam sem expiração (não dá
    pra invalidar retroativamente um link já enviado). Além disso, `signRouter.js` aplica rate
    limiting por accessToken (não por IP — o mesmo link pode ser aberto de vários
    dispositivos/redes pelo mesmo signatário) via `middlewares/signRateLimitMiddleware.js`
    (`express-rate-limit`): 60 requisições/15min nas rotas de leitura, 10/15min em POST (assinar)

Signature (id, signatoryId, documentVersionId, signatureImage, signatureType, documentHash,
           ipAddress, userAgent, signatoryDocumentType[CPF|RG|OUTRO, nullable],
           signatoryDocumentNumber[nullable], signedAt)
  → evidência jurídica: hash SHA-256 do PDF no momento exato da assinatura + IP + user agent.
    documentVersionId aponta pra versão PRÉ-carimbo (a que o signatário efetivamente revisou/hasheou),
    NÃO pra versão nova que o próprio ato de assinar cria — de propósito, pra manter documentHash e
    a versão referenciada sempre consistentes entre si. signatureImage é um PNG em base64 data URL
    (TEXT no banco), gerado por useSignatureImage.js no frontend
  → signatoryDocumentType/Number: só preenchidos quando Document.requireSignatoryDocument é true pro
    documento desse signatário (validado em SignatoryService.signDocument, 400 se faltar). É EVIDÊNCIA
    ADICIONAL gravada junto com a assinatura, igual documentHash/ipAddress/userAgent — não é uma
    verificação de autenticidade real (sem dígito verificador de CPF, sem checar se o documento é
    genuíno), consistente com o resto do projeto ser uma "assinatura eletrônica simples" (ver About.jsx)
```

## Autenticação

- JWT em **cookie httpOnly** (não localStorage) — mais seguro contra XSS
- `requireAuth` middleware injeta `req.userId` a partir do JWT — **sempre** usar `req.userId`, nunca confiar em `userId` vindo do body/params
- `AuthContext.jsx` no frontend: `useAuth()` expõe `user`, `isAuthenticated`, `loading`, `login()`, `logout()`
- `axios` configurado com `withCredentials: true` (essencial para enviar/receber o cookie)
- CORS no backend precisa de `credentials: true` E `origin` explícito (não pode ser `*` quando `credentials: true`)
- `RootGate.jsx`: se logado → redireciona `/` para `/upload`; se não → mostra Home
- `ProtectedRoute.jsx`: bloqueia rotas que exigem login, redireciona pra `/`
- `POST /auth/register` (`AuthController.register`) já loga o usuário na hora — seta o mesmo cookie
  httpOnly que `login` seta (via `signAuthToken`, helper compartilhado em `AuthService.js`) e devolve
  `{ user }`. `SignUp.jsx` chama `setUser(user)` do `AuthContext` direto com a resposta do cadastro (sem
  round-trip extra pra `login()`) antes de `navigate('/upload')` — necessário porque `ProtectedRoute` lê
  `isAuthenticated` do `AuthContext`, não faz uma checagem de sessão nova a cada navegação

## Fluxo de assinatura

1. Upload de PDF → `POST /documents` (autenticado) → cria `Document` + `DocumentVersion` v1
2. Em background (sem `await`, não bloqueia a resposta): gera resumo via IA (`generateDocumentSummary`) E detecta posição sugerida de assinatura (`detectSignaturePosition`, heurística por regex procurando "assinatura", "local e data", linhas de sublinhado, etc. — sem IA, é rápido e determinístico; fallback = terço inferior da última página). Esse resumo também pode ser gerado sob demanda depois, via `GET /documents/:id/resume` (usado em `DocumentToSignDetail.jsx`)
3. `POST /documents/:id/signatories` → adiciona signatários (nome + email). Se o email bater com o do dono logado, `Signatory.userId` é vinculado automaticamente (`isSelf: true` na resposta). O dono pode marcar o checkbox "Exigir documento de identificação" (`requireDocument` no body) — liga `Document.requireSignatoryDocument` pra todos os signatários deste documento (ver "Modelo de dados")
4. Signatário que é o próprio dono → em `MyDocuments.jsx` cai em `/documents/to-sign/:token` (`DocumentToSignDetail.jsx`, detalhe + resumo IA) → botão leva para `/sign/:token` (rota protegida, usa `SignScreen.jsx`)
5. Signatário externo → recebe e-mail (via Resend) com link `/assinar/:token` (rota pública, `PublicSign.jsx` — tudo numa página só, sem tela de detalhe antes)
6. Na tela de assinar (`SignScreen.jsx`/`PublicSign.jsx`): um card de instrução ("Clique no lugar do documento onde você quer colocar sua assinatura...") fica acima do picker, explicando a interação antes do usuário tentar. Campo de nome pré-preenchido com `data.signatory.name` (editável) alimenta `useSignatureImage.js`, que gera uma assinatura em PNG (fonte cursiva "Dancing Script", num `<canvas>` fora do DOM). Quando `data.document.requireSignatoryDocument` vem true, aparece também um campo de documento de identificação (seletor CPF/RG/Outro + número, `formatCPF` de `utils/formatDocument.js` formata automaticamente quando é CPF) — o botão de assinar fica desabilitado até ele estar preenchido, independente do checkbox de confirmação abaixo. `PdfPositionPicker.jsx` (que compõe o `PdfViewer.jsx` genérico) mostra a assinatura já posicionada na sugestão heurística — dá pra navegar entre páginas e tocar no documento pra escolher outro ponto, e a prévia é a imagem REAL (não um pin genérico), centralizada no ponto clicado. `GET /sign/:token` devolve `document.contentPageCount` (null até a 1ª assinatura), repassado como `maxPage` — a partir do 2º signatário, isso trunca a navegação do picker antes de qualquer página de certificado já anexada por uma rodada anterior, então nem dá pra chegar nela pra clicar (o backend já clampava a posição nesse caso — ver passo 7 — isso só evita a UX de deixar escolher ali primeiro). É preciso marcar o checkbox "Confirmo minha assinatura e a posição selecionada" pra habilitar o botão de assinar — qualquer edição no nome OU novo clique no documento desmarca essa confirmação de novo (editar o documento de identificação NÃO desmarca, já que não afeta a imagem/posição da assinatura). O botão dispara `POST /sign/:token` com `{ signatureType: 'TYPED', signatureImage, position, signatoryDocumentType, signatoryDocumentNumber }` — a imagem é OBRIGATÓRIA (backend rejeita com 400 se faltar), os dois últimos só quando o documento exige. Ao terminar (step "done"), `PublicSign.jsx` mostra um botão "Ir para o início" (`navigate('/')`); `SignScreen.jsx` mostra "Ver meus documentos" (`navigate('/documents')`) — telas equivalentes, CTAs diferentes porque uma é pública e a outra já é um usuário logado
7. Backend (`signDocument` em `SignatoryService.js`, tudo dentro de uma `sequelize.transaction` com `lock: t.LOCK.UPDATE` na linha do `Document`): valida o documento de identificação primeiro se `Document.requireSignatoryDocument` (400 se faltar ou tipo inválido), calcula o hash SHA-256 do PDF PRÉ-carimbo, separa as páginas de "conteúdo real" do certificado de assinaturas de uma rodada anterior (se houver, via `PdfStampService.stripTrailingPages` + `Document.contentPageCount`), chama `PdfStampService.stampSignatureImage` (pdf-lib: `embedPng` + `drawImage` centralizado no ponto clicado, largura = 28% da largura da página — `STAMP_WIDTH_RATIO`, tem que bater com o `width: "28%"` da prévia no frontend) só nas páginas de conteúdo, e então `PdfStampService.appendSignatureCertificate` monta e anexa o(s) certificado(s) atualizado(s) — ver bloco abaixo. Salva o resultado como uma **nova `DocumentVersion`** (`storageService.saveVersionFile`), cria o registro `Signature` (apontando pra versão pré-carimbo — ver "Modelo de dados"), atualiza `Document.currentVersionId` pra nova versão, e por fim `Signatory.status = SIGNED`. Se o carimbo/certificado falhar, nada disso é persistido (erro real, 5xx) — diferente de IA/e-mail, aqui não existe "falha silenciosa"
8. Quando todos os signatários assinaram → `Document.status = COMPLETED` automaticamente
9. Listagem em `MyDocuments.jsx` tem 3 abas: "Meus documentos" e "Documentos para assinar" (ambas excluem documentos `COMPLETED` por padrão) e "Finalizados" (`GET /documents/completed`, unifica documentos dos quais o usuário é dono com documentos em que é signatário, deduplicando por id e priorizando `role: 'owner'` em caso de sobreposição)
10. Certificado de assinaturas (`PdfStampService.appendSignatureCertificate`): a partir da 1ª assinatura, cada nova assinatura REGENERA (não empilha) uma página de certificado no final do PDF, listando TODOS os signatários confirmados até aquele momento — nome, e-mail, data/hora (`pt-BR`, fuso America/Sao_Paulo), tipo de assinatura, IP, uma miniatura da assinatura, o `documentHash` (SHA-256) daquele signatário especificamente (prova de integridade), e a linha "Documento apresentado: CPF: 000.000.000-00" quando `signatoryDocumentNumber` existe pra aquela assinatura. Pagina automaticamente em "(continuação)" se não couber numa página só. Documento sem NENHUMA assinatura não ganha certificado algum. `DocumentDetail.jsx` tem um botão "Baixar documento" que baixa a `currentVersion` (já com certificado, se houver)

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
- A maioria das telas é mobile-first, coluna única centralizada (`max-w-md`/`max-w-lg` + `overflow-y-auto`,
  rola se precisar). `Home.jsx` é a exceção de propósito: landing page de verdade, duas colunas a partir
  do `lg:` (texto + ilustração do documento assinado, ilustração escondida — `hidden lg:flex` — no
  mobile). Ela e as telas de auth (`Login.jsx`/`SignUp.jsx`) foram ajustadas pra CABER sem scroll em
  laptops comuns (1366x768, 1280x720) e ficar mais espaçosas em desktop de verdade: como o Tailwind só
  tem breakpoint de LARGURA (não de altura), o truque usado foi tratar o breakpoint `2xl` (≥1536px) como
  proxy de "tela grande o bastante pra também ser alta" — títulos/paddings maiores só a partir do `2xl`,
  ficam mais compactos entre `lg` e `2xl` (cobre o caso comum de notebook 1366-1440 de largura mas só
  ~768-900 de altura). Se mexer nessas telas, testar nessas duas resoluções antes de mexer em espaçamento

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
- Fine-tuning de modelo Ollama, caso o upgrade pra `qwen2.5:7b` não seja suficiente no futuro (fine-tuning
  em si não foi feito — exigiria montar dataset de documentos + resumos bons e infra de treino à parte)
- `Document.requireSignatoryDocument`, uma vez ligado (true), não tem como voltar a false pela UI —
  `addSignatoriesToDocument` só liga, nunca desliga. Não é um problema hoje porque não existe fluxo de
  "editar signatários depois de criados", mas se esse fluxo for adicionado, lembrar de decidir se
  desligar deve ser permitido
