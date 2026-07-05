// Tela de cadastro de usuário
// Segue o mesmo padrão visual das outras telas (Home, UploadFile, SignScreen)
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { User, Mail, IdCard, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { registerUser } from "../api/loginRoute"; // função de registro de usuário (ainda não implementada)
const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

// Formata CPF conforme o usuário digita: 000.000.000-00
function formatCPF(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUp() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        cpf: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    const handleChange = (field) => (e) => {
        let value = e.target.value;
        if (field === "cpf") value = formatCPF(value);
        setForm((prev) => ({ ...prev, [field]: value }));
        // limpa erro do campo assim que o usuário começa a corrigir
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const newErrors = {};
        const cpfDigits = form.cpf.replace(/\D/g, "");

        if (!form.name.trim()) newErrors.name = "Informe seu nome completo.";
        if (!form.email.trim()) newErrors.email = "Informe seu e-mail.";
        else if (!isValidEmail(form.email)) newErrors.email = "E-mail inválido.";
        if (cpfDigits.length !== 11) newErrors.cpf = "CPF deve ter 11 dígitos.";
        if (form.password.length < 6) newErrors.password = "A senha deve ter ao menos 6 caracteres.";
        if (form.confirmPassword !== form.password) newErrors.confirmPassword = "As senhas não coincidem.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);

        if (!validate()) return;

        setSubmitting(true);
        try {
            await registerUser({
                name: form.name,
                email: form.email,
                cpf: form.cpf.replace(/\D/g, ""),
                password: form.password,
            });
            await new Promise((resolve) => setTimeout(resolve, 1000)); // simulação temporária

            navigate("/upload"); // ajuste o destino pós-cadastro conforme seu fluxo real
        } catch (err) {
            const message = err?.response?.data?.error || err?.message || "Erro ao criar conta. Tente novamente.";
            setApiError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="w-full h-screen overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            {/* Ambient gradient */}
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 scrollbar-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-full max-w-md flex flex-col gap-5"
                >
                    {/* Voltar */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2 mb-1">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <User size={18} style={{ color: ACCENT }} />
                        </div>
                        <h1 className="text-2xl font-semibold text-white">Crie sua conta</h1>
                        <p className="text-sm text-gray-400">
                            Gratuito, rápido e com validade jurídica.
                        </p>
                    </div>

                    {/* Erro geral da API */}
                    {apiError && (
                        <div
                            className="rounded-xl px-4 py-3 text-sm"
                            style={{
                                background: "rgba(240,91,91,0.1)",
                                border: "1px solid rgba(240,91,91,0.25)",
                                color: "#f87171",
                            }}
                        >
                            {apiError}
                        </div>
                    )}

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Nome */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 pl-1">Nome completo</label>
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${errors.name ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                }}
                            >
                                <User size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange("name")}
                                    placeholder="Seu nome"
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                            </div>
                            {errors.name && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 pl-1">E-mail</label>
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${errors.email ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                }}
                            >
                                <Mail size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange("email")}
                                    placeholder="seu@email.com"
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                            </div>
                            {errors.email && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.email}</p>}
                        </div>

                        {/* CPF */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 pl-1">CPF</label>
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${errors.cpf ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                }}
                            >
                                <IdCard size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.cpf}
                                    onChange={handleChange("cpf")}
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                            </div>
                            {errors.cpf && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.cpf}</p>}
                        </div>

                        {/* Senha */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 pl-1">Senha</label>
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${errors.password ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                }}
                            >
                                <Lock size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={handleChange("password")}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                                <button type="button" onClick={() => setShowPassword((p) => !p)} className="text-gray-500 hover:text-gray-300 shrink-0">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.password}</p>}
                        </div>

                        {/* Confirmar senha */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 pl-1">Confirmar senha</label>
                            <div
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${errors.confirmPassword ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                }}
                            >
                                <Lock size={16} className="text-gray-500 shrink-0" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={handleChange("confirmPassword")}
                                    placeholder="Repita a senha"
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                                <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="text-gray-500 hover:text-gray-300 shrink-0">
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Botão de submit */}
                        <motion.button
                            type="submit"
                            disabled={submitting}
                            whileHover={{ scale: submitting ? 1 : 1.02 }}
                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)`,
                                boxShadow: "0 8px 24px rgba(91, 106, 240, 0.3)",
                            }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                <>
                                    Criar conta
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Link para login */}
                    <p className="text-center text-sm text-gray-400 mt-1">
                        Já tem uma conta?{" "}
                        <button
                            onClick={() => navigate("/login")}
                            className="font-medium underline underline-offset-2"
                            style={{ color: ACCENT }}
                        >
                            Entrar
                        </button>
                    </p>
                </motion.div>
            </main>
        </div>
    );
}