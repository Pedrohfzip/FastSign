import { Routes, Route, useLocation, useNavigationType } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import Home from '../pages/Home'
import UploadFile from '../pages/UploadFile'  // antes era "Home"
import SignScreen from '../pages/SignScreen'

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
          <Route path="/" element={<AnimatedPage direction={direction}><Home /></AnimatedPage>} />
          <Route path="/upload" element={<AnimatedPage direction={direction}><UploadFile /></AnimatedPage>} />
          <Route path="/sign" element={<AnimatedPage direction={direction}><SignScreen /></AnimatedPage>} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}