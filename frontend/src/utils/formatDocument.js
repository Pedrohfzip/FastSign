// Formata CPF conforme o usuário digita: 000.000.000-00. Usado tanto no cadastro
// (SignUp.jsx) quanto no campo opcional de documento de identificação na hora de
// assinar (SignScreen.jsx/PublicSign.jsx) — mesma regra nos dois lugares.
export function formatCPF(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
