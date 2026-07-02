import { useState, useRef, useEffect } from 'react';

const MENU_OPTIONS = [
    { label: 'Meus documentos', onClick: () => console.log('Meus documentos') },
    { label: 'Configurações', onClick: () => console.log('Configurações') },
    { label: 'Ajuda', onClick: () => console.log('Ajuda') },
    { label: 'Sobre o FastSign', onClick: () => console.log('Sobre o FastSign') },
];

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Fecha o dropdown ao clicar fora dele
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                width: '100%',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                height: '52px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(11,11,18,0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={menuRef}>
                <button
                    onClick={() => setMenuOpen((prev) => !prev)}
                    style={{
                        width: '28px',
                        height: '28px',
                        background: 'linear-gradient(135deg, #5b6af0 0%, #8b5cf6 100%)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M2 7h10M2 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
                <span style={{ fontSize: '15px', fontWeight: '500', color: '#ffffff', letterSpacing: '-0.01em' }}>FastSign</span>

                {/* Dropdown flutuante */}
                {menuOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '38px',
                            left: 0,
                            minWidth: '200px',
                            background: 'rgba(20,20,28,0.98)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                        }}
                    >
                        {MENU_OPTIONS.map((option) => (
                            <button
                                key={option.label}
                                onClick={() => {
                                    option.onClick();
                                    setMenuOpen(false);
                                }}
                                style={{
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    fontSize: '13px',
                                    color: '#e5e7eb',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => console.log('Ir para login')}
                style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #5b6af0 0%, #7c5cf6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                }}
            >
                Entrar
            </button>
        </header>
    );
};

export default Header;