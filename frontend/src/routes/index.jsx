import { Routes, Route, useLocation, useNavigationType } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import RootGate from '../components/RootGate'
import ProtectedRoute from '../components/ProtectedRoute'
import UploadFile from '../pages/UploadFile'
import SignScreen from '../pages/SignScreen'
import SignUp from '../pages/SignUp'
import Login from '../pages/Login'
import AddSignatories from '../pages/AddSignatories'
import PublicSign from '../pages/PublicSign'
import MyDocuments from '../pages/MyDocuments'
import DocumentDetail from '../pages/DocumentDetail'


const slideVariants = {
  initial: (direction) => ({
    x: direction < 0 ? '-100%' : '100%',
    opacity: 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

const slideTransition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1],
  duration: 0.4,
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#0b0b12' }}>
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
  )
}