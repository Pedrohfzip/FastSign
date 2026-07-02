const Header = () => {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '28px', height: '28px',
                    background: 'linear-gradient(135deg, #5b6af0 0%, #8b5cf6 100%)',
                    borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M2 7h10M2 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '500', color: '#ffffff', letterSpacing: '-0.01em' }}>FastSign</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(91,106,240,0.15)',
                    border: '1px solid rgba(91,106,240,0.3)',
                    display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '500', color: '#8b93f7',
                }}>JC</div>
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>João C.</span>
            </div>
        </header>
    );
};
export default Header;