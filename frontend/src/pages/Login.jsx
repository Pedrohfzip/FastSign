// Tela de login — segue o mesmo padrão visual do SignUp
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.email.trim()) newErrors.email = "Informe seu e-mail.";
        if (!form.password) newErrors.password = "Informe sua senha.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            await login({ email: form.email, password: form.password });

            const redirectTo = location.state?.from?.pathname || "/upload";
            navigate(redirectTo, { replace: true });
        } catch (err) {
            const message = err?.response?.data?.error || "E-mail ou senha inválidos.";
            setApiError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="w-full h-full overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
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

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6 scrollbar-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-full max-w-md flex flex-col gap-4"
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
                    <div className="flex flex-col items-center text-center gap-1.5">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <Lock size={16} style={{ color: ACCENT }} />
                        </div>
                        <h1 className="text-2xl font-semibold text-white">Entrar</h1>
                        <p className="text-sm text-gray-400">Acesse sua conta para continuar.</p>
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
                                    placeholder="Sua senha"
                                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="text-gray-500 hover:text-gray-300 shrink-0"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{errors.password}</p>}
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
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Link para cadastro */}
                    <p className="text-center text-sm text-gray-400 mt-1">
                        Não tem uma conta?{" "}
                        <button
                            onClick={() => navigate("/sign-up")}
                            className="font-medium underline underline-offset-2"
                            style={{ color: ACCENT }}
                        >
                            Criar conta
                        </button>
                    </p>
                </motion.div>
            </main>
        </div>
    );
}