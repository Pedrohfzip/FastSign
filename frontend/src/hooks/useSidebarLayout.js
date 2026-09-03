// Decide QUAL navegação o app usa: a sidebar lateral de desktop ou o header
// horizontal (logo à esquerda / "Entrar" à direita).
//
// São duas condições combinadas, e as duas precisam bater no Header.jsx (que
// renderiza uma ou outra) e no AppShell.jsx (que muda a direção do layout raiz de
// coluna pra linha) — por isso a regra mora aqui, num lugar só: se as duas
// discordassem, daria pra acabar com um header horizontal ocupando a coluna da
// esquerda, ou com uma sidebar empilhada no topo.
//
// 1. viewport de desktop (>= 1300x800, ver useViewportMode.js);
// 2. usuário logado — a sidebar é navegação de app (meus documentos, configurações,
//    sair). Deslogado não existe nada disso pra navegar: sobra a landing page, e o
//    header horizontal é o formato certo pra ela.
import useViewportMode from './useViewportMode';
import { useAuth } from '../context/AuthContext';

export default function useSidebarLayout() {
    const isDesktop = useViewportMode();
    const { isAuthenticated, loading } = useAuth();

    return {
        isDesktop,
        showSidebar: isDesktop && isAuthenticated,
        // Enquanto a sessão está sendo verificada (`loading`), `isAuthenticated` é
        // false — ou seja, ainda NÃO dá pra saber qual das duas navegações é a certa.
        // Só no desktop isso importa: renderizar o header horizontal e trocar pela
        // sidebar meio segundo depois faria a tela inteira reposicionar (e piscaria
        // um "Entrar" pra quem já está logado). No mobile as duas respostas levam ao
        // mesmo header, então lá nada muda e o comportamento continua o de sempre.
        awaitingSession: isDesktop && loading,
    };
}
