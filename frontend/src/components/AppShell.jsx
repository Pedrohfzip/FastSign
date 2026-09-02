// Casca do app: navegação + área de conteúdo.
//
// Mobile (padrão): coluna — Header horizontal no topo, conteúdo abaixo. Exatamente a
// estrutura original.
// Desktop (>= 1300x800, ver hooks/useViewportMode.js): linha — a MESMA instância do
// Header (que nesse modo se renderiza como DesktopSidebar) vira a coluna da esquerda,
// e o conteúdo ocupa o resto da largura.
//
// Nos dois modos a navegação fica FORA do <AppRoutes />, ou seja, fora do
// AnimatePresence que faz o slide entre páginas — ela nunca remonta nem re-anima a
// cada troca de rota.
import AppRoutes from '../routes';
import Header from './Header';
import useViewportMode from '../hooks/useViewportMode';

export default function AppShell() {
    const isDesktop = useViewportMode();

    return (
        <div
            style={{
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: isDesktop ? 'row' : 'column',
            }}
        >
            <Header />
            {/* minWidth: 0 é necessário no modo linha pra este filho flex poder encolher
                abaixo do tamanho natural do conteúdo (senão páginas largas empurrariam a
                sidebar); no modo coluna é inofensivo. */}
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                <AppRoutes />
            </div>
        </div>
    );
}
