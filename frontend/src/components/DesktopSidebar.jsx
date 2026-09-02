// Navegação em modo DESKTOP (viewport >= 1300x800 — ver hooks/useViewportMode.js).
// Substitui inteiramente o Header horizontal + dropdown flutuante do mobile: aqui a
// navegação é uma sidebar lateral persistente, e o nome do usuário / botão "Entrar"
// (que no mobile ficam no canto superior direito) moram no rodapé dela.
//
// Quem escolhe entre esta sidebar e o header mobile é o Header.jsx — ele continua
// sendo o único ponto de montagem da navegação no app (ver main.jsx), então a
// sidebar também fica FORA do AnimatePresence de rotas e nunca remonta ao navegar.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import {
    FileText, Settings, HelpCircle, Info, LogOut, Home, Zap,
    PanelLeftClose, PanelLeftOpen, LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#5b6af0';
const BORDER_SOFT = 'rgba(255,255,255,0.07)';
// Um tom acima do #0b0b12 do conteúdo — separa as duas áreas sem precisar de uma
// borda dura, mantendo a mesma paleta do resto do app.
const SIDEBAR_BG = '#0d0d16';

const WIDTH_EXPANDED = 248;
const WIDTH_COLLAPSED = 76;

// Mesma curva/duração das outras transições do app (routes/index.jsx, FlowSteps).
const SIDEBAR_TRANSITION = { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.28 };
// Os rótulos sempre saem antes de a largura terminar de encolher, senão ficariam
// visivelmente espremidos contra a borda durante o recolhimento.
const LABEL_TRANSITION = { duration: 0.14, ease: 'easeOut' };

// Mesmas opções do dropdown do Header mobile. Deslogado sobra só o que é público:
// as rotas protegidas cairiam no ProtectedRoute e voltariam pra Home, e o mobile
// também esconde o menu inteiro nesse caso (lá só sobra logo + "Entrar").
const PUBLIC_OPTIONS = [
    { label: 'Início', icon: Home, path: '/' },
    { label: 'Ajuda', icon: HelpCircle, path: '/help' },
    { label: 'Sobre o FastSign', icon: Info, path: '/about' },
];

const AUTHENTICATED_OPTIONS = [
    { label: 'Início', icon: Home, path: '/' },
    { label: 'Meus documentos', icon: FileText, path: '/documents' },
    { label: 'Configurações', icon: Settings, path: '/settings' },
    { label: 'Ajuda', icon: HelpCircle, path: '/help' },
    { label: 'Sobre o FastSign', icon: Info, path: '/about' },
];

export default function DesktopSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout } = useAuth();

    const options = isAuthenticated ? AUTHENTICATED_OPTIONS : PUBLIC_OPTIONS;

    // "/" só casa exato (senão ficaria ativo em toda rota); as demais casam por
    // prefixo, pra /documents seguir destacado em /documents/:id e /documents/to-sign/:token.
    const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

    return (
        // A largura é a ÚNICA propriedade de layout animada aqui — é ela que faz a área
        // de conteúdo à direita reaproveitar o espaço ao recolher (o conteúdo é irmão
        // flex desta aside, ver main.jsx). Todo o resto (rótulos, botões) anima só
        // opacity/transform, que o navegador compõe sem reflow.
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
            transition={SIDEBAR_TRANSITION}
            className="h-full shrink-0 flex flex-col overflow-hidden"
            style={{
                background: SIDEBAR_BG,
                borderRight: `1px solid ${BORDER_SOFT}`,
                willChange: 'width',
            }}
        >
            {/* Topo: marca + botão de recolher. O botão NUNCA some — recolhida, a sidebar
                vira uma barra fina só de ícones com ele no topo, então não tem como
                "perder" a navegação e ficar sem forma de trazer de volta. */}
            <div
                className={`h-16 shrink-0 flex items-center px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}
                style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}
            >
                <AnimatePresence initial={false}>
                    {!collapsed && (
                        <motion.button
                            key="brand"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={LABEL_TRANSITION}
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 pl-1"
                        >
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)" }}
                            >
                                <Zap size={14} className="text-white" fill="currentColor" />
                            </div>
                            <span className="text-sm font-semibold text-white whitespace-nowrap">FastSign</span>
                        </motion.button>
                    )}
                </AnimatePresence>

                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setCollapsed((prev) => !prev)}
                    title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: "rgba(91,106,240,0.12)", border: `1px solid ${BORDER_SOFT}` }}
                >
                    {collapsed
                        ? <PanelLeftOpen size={16} style={{ color: "#8b93f7" }} />
                        : <PanelLeftClose size={16} style={{ color: "#8b93f7" }} />}
                </motion.button>
            </div>

            {/* Navegação */}
            <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden px-3 py-3 flex flex-col gap-1">
                {options.map((option) => {
                    const Icon = option.icon;
                    const active = isActive(option.path);
                    return (
                        <button
                            key={option.path}
                            onClick={() => navigate(option.path)}
                            title={collapsed ? option.label : undefined}
                            className={`h-10 rounded-xl flex items-center gap-3 shrink-0 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                            style={{
                                background: active ? "rgba(91,106,240,0.12)" : "transparent",
                                border: `1px solid ${active ? "rgba(91,106,240,0.35)" : "transparent"}`,
                                color: active ? "#fff" : "#9ca3af",
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(91,106,240,0.07)"; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                            <Icon size={17} className="shrink-0" style={{ color: active ? ACCENT : "#8b8b9a" }} />
                            <AnimatePresence initial={false}>
                                {!collapsed && (
                                    <motion.span
                                        key="label"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={LABEL_TRANSITION}
                                        className="text-sm font-medium whitespace-nowrap"
                                    >
                                        {option.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    );
                })}
            </nav>

            {/* Rodapé: identidade do usuário + sair (ou entrar) — no mobile isso vive no
                canto superior direito do Header; aqui a sidebar assume esse papel. */}
            <div className="shrink-0 px-3 py-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                {isAuthenticated ? (
                    <>
                        <div
                            className={`rounded-xl flex items-center gap-2.5 py-2 ${collapsed ? 'justify-center px-0' : 'px-2'}`}
                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                            title={collapsed ? user?.name : undefined}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold text-white"
                                style={{ background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)" }}
                            >
                                {userInitial}
                            </div>
                            <AnimatePresence initial={false}>
                                {!collapsed && (
                                    <motion.div
                                        key="user-info"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={LABEL_TRANSITION}
                                        className="min-w-0 flex flex-col"
                                    >
                                        <span className="text-sm font-medium text-white truncate">{user?.name}</span>
                                        {user?.email && (
                                            <span className="text-xs text-gray-500 truncate">{user.email}</span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={handleLogout}
                            title={collapsed ? 'Sair' : undefined}
                            className={`h-10 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                            style={{ background: "transparent", color: "#f87171" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240,91,91,0.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <LogOut size={16} className="shrink-0" />
                            <AnimatePresence initial={false}>
                                {!collapsed && (
                                    <motion.span
                                        key="logout-label"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={LABEL_TRANSITION}
                                        className="whitespace-nowrap"
                                    >
                                        Sair
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        title={collapsed ? 'Entrar' : undefined}
                        className="h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)" }}
                    >
                        <LogIn size={16} className="shrink-0" />
                        <AnimatePresence initial={false}>
                            {!collapsed && (
                                <motion.span
                                    key="login-label"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={LABEL_TRANSITION}
                                    className="whitespace-nowrap"
                                >
                                    Entrar
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                )}
            </div>
        </motion.aside>
    );
}
