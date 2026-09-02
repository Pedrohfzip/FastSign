// Decide se o app deve renderizar o layout DESKTOP ou o layout MOBILE.
//
// O critério é COMBINADO (largura E altura ao mesmo tempo): só é desktop com
// viewport >= 1300px de largura E >= 800px de altura. Se qualquer uma das duas
// dimensões cair abaixo disso, o app volta 100% pro layout mobile original.
// Por isso isso NÃO dá pra resolver só com breakpoint do Tailwind: os breakpoints
// dele são exclusivamente de LARGURA (ver o truque do `2xl` como proxy de "tela
// alta" em Home.jsx/Login.jsx, que é justamente a gambiarra que este hook evita).
//
// Este hook é a ÚNICA fonte de verdade dessa decisão no app inteiro — nenhum outro
// arquivo deve repetir essa media query (nem em CSS, nem em JS).
import { useSyncExternalStore } from 'react';

export const DESKTOP_MEDIA_QUERY = '(min-width: 1200px) and (min-height: 500px)';

// Um único MediaQueryList pro app todo, criado no import. `matchMedia` já é
// performático por natureza: o listener de 'change' só dispara quando a condição
// vira de false pra true (ou o contrário), não a cada pixel de resize — por isso
// aqui não existe (nem deve existir) listener de 'resize' com debounce/throttle.
const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const desktopQuery = supportsMatchMedia ? window.matchMedia(DESKTOP_MEDIA_QUERY) : null;

// useSyncExternalStore: todos os componentes que chamam o hook compartilham ESTE
// mesmo MediaQueryList e são notificados juntos, num único re-render por mudança
// de modo — em vez de cada um manter seu próprio useState + useEffect + listener.
function subscribe(onStoreChange) {
    if (!desktopQuery) return () => { };
    desktopQuery.addEventListener('change', onStoreChange);
    return () => desktopQuery.removeEventListener('change', onStoreChange);
}

// Lido direto no primeiro render (não espera nenhum evento de resize acontecer).
function getSnapshot() {
    return desktopQuery ? desktopQuery.matches : false;
}

// Sem window (build/SSR): assume mobile, que é o layout mais restritivo.
function getServerSnapshot() {
    return false;
}

export default function useViewportMode() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
