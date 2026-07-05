import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, FileText, Settings, HelpCircle, Info } from 'lucide-react';

const MENU_OPTIONS = [
    { label: 'Meus documentos', icon: FileText, onClick: () => console.log('Meus documentos') },
    { label: 'Configurações', icon: Settings, onClick: () => console.log('Configurações') },
    { label: 'Ajuda', icon: HelpCircle, onClick: () => console.log('Ajuda') },
    { label: 'Sobre o FastSign', icon: Info, onClick: () => console.log('Sobre o FastSign') },
];

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Fecha o dropdown ao clicar fora dele (considerando botão E menu, já que agora vivem em lugares diferentes do DOM)
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

    // Calcula a posição do botão pra posicionar o menu certinho, já que ele não é mais filho do Header no DOM
    const toggleMenu = () => {
        if (!menuOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 8,
                left: rect.left,
            });
        }
        setMenuOpen((prev) => !prev);
    };

    const handleOptionClick = (onClick) => {
        onClick();
        setMenuOpen(false);
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

            {/* Portal: renderiza direto no <body>, fora de qualquer overflow:hidden */}
            {createPortal(
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            ref={menuRef}
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
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </header>
    );
};

export default Header;