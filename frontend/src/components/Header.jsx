const Header = () => {
    return (
        <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: '52px',
            borderBottom: '1px solid #e5e5e5',
            backgroundColor: '#ffffff',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M2 7h10M2 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a' }}>
                    FastSign
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#e8e8e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#555',
                }}>
                    JC
                </div>
                <span style={{ fontSize: '14px', color: '#333' }}>João C.</span>
            </div>
        </header>
    );
};

export default Header;