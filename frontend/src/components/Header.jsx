import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { Menu, FileText, Settings, HelpCircle, Info, LogOut, Home, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useSidebarLayout from '../hooks/useSidebarLayout';
import DesktopSidebar from './DesktopSidebar';



const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout } = useAuth();
    // Decide entre este header horizontal e a sidebar de desktop — a regra mora no
    // hook porque o AppShell.jsx precisa chegar exatamente na mesma conclusão
    // (ver hooks/useSidebarLayout.js).
    const { showSidebar, awaitingSession } = useSidebarLayout();

    const MENU_OPTIONS = [
        { label: 'Inicio', icon: Home, onClick: () => navigate('/') },
        { label: 'Meus documentos', icon: FileText, onClick: () => navigate('/documents') },
        { label: 'Configurações', icon: Settings, onClick: () => navigate('/settings') },
        { label: 'Ajuda', icon: HelpCircle, onClick: () => navigate('/help') },
        { label: 'Sobre o Sinaki', icon: Info, onClick: () => navigate('/about') },
    ];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // PublicSign.jsx (/assinar/:accessToken) é a página que o signatário externo abre
    // direto de um link de e-mail, sem conta — o Header (menu/Entrar) não faz sentido
    // ali, é só ruído numa tela que já é auto-contida. Vem DEPOIS de todos os hooks
    // (useState/useEffect acima) de propósito — um return condicional antes deles
    // violaria as Rules of Hooks assim que o usuário navegasse pra/de essa rota.
    if (location.pathname.startsWith('/assinar/')) {
        return null;
    }

    // No desktop, enquanto a sessão ainda está sendo verificada, não renderiza
    // navegação nenhuma: ver o comentário de `awaitingSession` em useSidebarLayout.js.
    if (awaitingSession) {
        return null;
    }

    // Desktop + logado: a navegação inteira vira uma sidebar lateral persistente, que
    // também absorve o nome do usuário do canto direito. Tudo que vem daqui pra baixo
    // é o header horizontal original — usado no mobile e também no desktop deslogado,
    // onde ele é só logo à esquerda + "Entrar" à direita.
    if (showSidebar) {
        return <DesktopSidebar />;
    }

    const toggleMenu = () => {
        if (!menuOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({ top: rect.bottom + 8, left: rect.left });
        }
        setMenuOpen((prev) => !prev);
    };

    const handleOptionClick = (onClick) => {
        onClick();
        setMenuOpen(false);
    };

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
        navigate('/');
    };

    return (
        <header
            className="w-full px-6 py-4 flex items-center justify-between relative"
            style={{
                background: "#0b0b12",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
            }}
        >
            {/* Logo — só aparece deslogado, já que logado o canto esquerdo já é ocupado
                pelo botão de menu (hamburguer) */}
            {!isAuthenticated && (
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2"
                >
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)" }}
                    >
                        <Zap size={14} className="text-white" fill="currentColor" />
                    </div>
                    <span className="text-sm font-semibold text-white">Sinaki</span>
                </button>
            )}

            {/* Botão de menu + dropdown flutuante — só aparece logado, já que as opções
                (meus documentos, configurações etc.) não fazem sentido pra quem ainda não entrou */}
            {isAuthenticated && (
                <div ref={menuRef} className="relative">
                    <motion.button
                        ref={buttonRef}
                        whileTap={{ scale: 0.92 }}
                        onClick={toggleMenu}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                        style={{
                            background: menuOpen ? "rgba(91,106,240,0.18)" : "rgba(91,106,240,0.12)",
                            border: "1px solid rgba(255,255,255,0.07)",
                        }}
                    >
                        <Menu size={17} style={{ color: "#8b93f7" }} />
                    </motion.button>

                    {createPortal(
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                    className="w-56 rounded-2xl overflow-hidden"
                                    style={{
                                        position: 'fixed',
                                        top: menuPosition.top,
                                        left: menuPosition.left,
                                        background: "#14141f",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                                        zIndex: 9999,
                                    }}
                                >
                                    <ul className="py-1.5">
                                        {MENU_OPTIONS.map((option, i) => {
                                            const Icon = option.icon;
                                            return (
                                                <li key={i}>
                                                    <button
                                                        onClick={() => handleOptionClick(option.onClick)}
                                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white transition-colors"
                                                        style={{ background: "transparent" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,106,240,0.08)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                    >
                                                        <Icon size={15} style={{ color: "#5b6af0" }} />
                                                        {option.label}
                                                    </button>
                                                </li>
                                            );
                                        })}

                                        <li>
                                            <div className="my-1.5 mx-4 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                                        </li>
                                        <li>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors"
                                                style={{ background: "transparent", color: "#f87171" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240,91,91,0.08)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <LogOut size={15} />
                                                Sair
                                            </button>
                                        </li>
                                    </ul>
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}
                </div>
            )}

            {/* Botão de Entrar / nome do usuário — canto direito */}
            {isAuthenticated ? (
                <span className="text-sm text-gray-300 font-medium truncate max-w-[160px]">
                    Olá, {user?.name}
                </span>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{
                        background: "linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)",
                    }}
                >
                    Entrar
                </motion.button>
            )}
        </header>
    );
};

export default Header;