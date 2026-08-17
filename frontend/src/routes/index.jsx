import { Routes, Route, useLocation, useNavigationType } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import RootGate from '../components/RootGate'
import ProtectedRoute from '../components/ProtectedRoute'
import FlowSteps from '../components/FlowSteps'
import UploadFile from '../pages/UploadFile'
import SignScreen from '../pages/SignScreen'
import SignUp from '../pages/SignUp'
import Login from '../pages/Login'
import AddSignatories from '../pages/AddSignatories'
import PublicSign from '../pages/PublicSign'
import MyDocuments from '../pages/MyDocuments'
import DocumentDetail from '../pages/DocumentDetail'
import DocumentToSignDetail from '../pages/DocumentToSignDetail'

// Mapeia a rota atual pro passo do fluxo principal (Enviar → Signatários → Assinar).
// Fora dessas 3 rotas não existe passo a passo — a barra fica escondida (ex: /documents,
// /login, /assinar/:token do signatário externo).
function getFlowStep(pathname) {
  if (pathname === '/upload') return 'upload'
  if (/^\/documents\/[^/]+\/signatories$/.test(pathname)) return 'signatories'
  if (/^\/sign\/[^/]+$/.test(pathname)) return 'sign'
  return null
}


// Transição estilo "push" nativo (iOS/Android): a página que ENTRA desliza por cima,
// sempre 100% opaca, cobrindo a que está saindo — que só desliza uma fração pro lado
// (parallax) e escurece um pouco, sem nunca sumir de vez. Isso evita o "flash" escuro
// que a versão anterior tinha: lá as duas páginas desapareciam via opacity 1→0 sobre o
// MESMO fundo quase-preto do container (`#0b0b12`), e como a curva de saída é rápida no
// início (ease-out), a página que saía ficava transparente quase instantaneamente,
// revelando esse fundo escuro antes da nova página terminar de entrar — lendo como um
// flash pra preto no meio da troca. Com zIndex garantindo que a página nova sempre
// desenha por cima, isso nunca mais acontece, e o fundo do container nunca fica visível.
const slideVariants = {
  initial: (direction) => ({
    x: direction < 0 ? '-100%' : '100%',
    zIndex: 1,
  }),
  animate: {
    x: 0,
    zIndex: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '30%' : '-30%',
    opacity: 0.55,
    zIndex: 0,
  }),
}

const slideTransition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1],
  duration: 0.38,
}

function AnimatedPage({ children, direction }) {
  return (
    <motion.div
      custom={direction}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={slideVariants}
      transition={slideTransition}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#0b0b12',
      }}
    >
      {children}
    </motion.div>
  )
}

export default function AppRoutes() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const direction = navigationType === 'POP' ? -1 : 1
  const flowStep = getFlowStep(location.pathname)

  return (
    // height: '100%' (não '100vh') — esse container já vive dentro do <div flex:1;
    // minHeight:0> de main.jsx, que é quem de fato define o espaço disponível (viewport
    // menos a altura do Header). Usar 100vh aqui ignorava esse espaço já reservado; não
    // dava pra perceber porque o overflow:hidden do pai escondia a sobra — mas agora que
    // a barra de passo a passo abaixo soma altura REAL (via flex, não position:absolute),
    // esse excesso passaria a empurrar o conteúdo das páginas pra fora da área visível.
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#0b0b12', display: 'flex', flexDirection: 'column' }}>
      {/* Passo a passo do fluxo principal — vive FORA do slide de página (não é filho do
          AnimatedPage/AnimatePresence de baixo), então nunca desmonta/remonta ao navegar
          entre Upload → Signatários → Assinar: é a mesma instância do componente do início
          ao fim do fluxo, só o `current` muda. Some com fade quando a rota não faz parte
          desse fluxo (ex: indo pra /documents). */}
      <AnimatePresence initial={false}>
        {flowStep && (
          <motion.div
            key="flow-steps-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 2 }}
          >
            <div className="w-full max-w-lg mx-auto px-6 pt-6 pb-1">
              <FlowSteps current={flowStep} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <AnimatePresence initial={false} custom={direction}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage direction={direction}><RootGate /></AnimatedPage>} />
            <Route
              path="/upload"
              element={
                <AnimatedPage direction={direction}>
                  <ProtectedRoute><UploadFile /></ProtectedRoute>
                </AnimatedPage>
              }
            />
            <Route
              path="/documents/:id/signatories"
              element={<AnimatedPage direction={direction}><ProtectedRoute><AddSignatories /></ProtectedRoute></AnimatedPage>}
            />

            {/* rota PROTEGIDA — tela de detalhes de um documento que o usuário logado precisa assinar */}
            <Route
              path="/documents/to-sign/:accessToken"
              element={
                <AnimatedPage direction={direction}>
                  <ProtectedRoute><DocumentToSignDetail /></ProtectedRoute>
                </AnimatedPage>
              }
            />

            {/* rota PROTEGIDA — o próprio dono assina, precisa estar logado */}
            <Route
              path="/sign/:accessToken"
              element={
                <AnimatedPage direction={direction}>
                  <ProtectedRoute><SignScreen /></ProtectedRoute>
                </AnimatedPage>
              }
            />

            <Route path="/sign-up" element={<AnimatedPage direction={direction}><SignUp /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage direction={direction}><Login /></AnimatedPage>} />

            {/* rota PÚBLICA — sem ProtectedRoute, signatário externo não precisa de conta */}
            <Route
              path="/assinar/:accessToken"
              element={<AnimatedPage direction={direction}><PublicSign /></AnimatedPage>}
            />

            <Route
              path="/documents"
              element={<AnimatedPage direction={direction}><ProtectedRoute><MyDocuments /></ProtectedRoute></AnimatedPage>}
            />
            <Route
              path="/documents/:id"
              element={<AnimatedPage direction={direction}><ProtectedRoute><DocumentDetail /></ProtectedRoute></AnimatedPage>}
            />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  )
}