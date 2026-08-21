// Tela de Configurações — duas seções independentes: Perfil (editar nome/e-mail/CPF)
// e Segurança (trocar senha). Cada seção tem seu próprio estado de loading/erro/sucesso,
// já que salvar uma não deve depender nem afetar a outra.
// "Voltar" usa histórico (navigate(-1)), mesmo motivo de Help.jsx/About.jsx: essa tela é
// aberta a partir do menu do Header, de qualquer página, sem um "pai" fixo na hierarquia.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings as SettingsIcon,
    ArrowLeft,
    User,
    Mail,
    IdCard,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    Check,
} from "lucide-react";
import { updateProfile, changePassword } from "../api/loginRoute";
import { useAuth } from "../context/AuthContext";

const ACCENT = "#5b6af0";
const ACCENT_SOFT = "rgba(91,106,240,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.07)";

// Mesma máscara de CPF usada em SignUp.jsx: 000.000.000-00
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

// Badge verde de "salvo com sucesso", some sozinho depois de alguns segundos —
// reaparece do zero a cada save bem-sucedido (key muda via `savedAt`).
function SavedBadge({ savedAt, label }) {
    return (
        <AnimatePresence>
            {savedAt && (
                <motion.div
                    key={savedAt}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "#4ade80" }}
                >
                    <Check size={13} />
                    {label}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function Settings() {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();

    // ---- Perfil ----
    const [profileForm, setProfileForm] = useState({ name: "", email: "", cpf: "" });
    const [profileErrors, setProfileErrors] = useState({});
    const [profileSubmitting, setProfileSubmitting] = useState(false);
    const [profileApiError, setProfileApiError] = useState(null);
    const [profileSavedAt, setProfileSavedAt] = useState(null);

    // Preenche o formulário assim que o usuário autenticado chega do contexto —
    // ProtectedRoute já garante que isso acontece antes desta tela renderizar de verdade.
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || "",
                email: user.email || "",
                cpf: formatCPF(user.cpf || ""),
            });
        }
    }, [user]);

    const handleProfileChange = (field) => (e) => {
        let value = e.target.value;
        if (field === "cpf") value = formatCPF(value);
        setProfileForm((prev) => ({ ...prev, [field]: value }));
        if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: null }));
        setProfileSavedAt(null);
    };

    const validateProfile = () => {
        const newErrors = {};
        const cpfDigits = profileForm.cpf.replace(/\D/g, "");

        if (!profileForm.name.trim()) newErrors.name = "Informe seu nome completo.";
        if (!profileForm.email.trim()) newErrors.email = "Informe seu e-mail.";
        else if (!isValidEmail(profileForm.email)) newErrors.email = "E-mail inválido.";
        if (cpfDigits.length !== 11) newErrors.cpf = "CPF deve ter 11 dígitos.";

        setProfileErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileApiError(null);
        if (!validateProfile()) return;

        setProfileSubmitting(true);
        try {
            const { user: updatedUser } = await updateProfile({
                name: profileForm.name.trim(),
                email: profileForm.email.trim(),
                cpf: profileForm.cpf.replace(/\D/g, ""),
            });
            setUser(updatedUser);
            setProfileSavedAt(Date.now());
        } catch (err) {
            setProfileApiError(err?.response?.data?.error || "Erro ao atualizar perfil.");
        } finally {
            setProfileSubmitting(false);
        }
    };

    // ---- Segurança ----
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordApiError, setPasswordApiError] = useState(null);
    const [passwordSavedAt, setPasswordSavedAt] = useState(null);

    const handlePasswordChange = (field) => (e) => {
        setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (passwordErrors[field]) setPasswordErrors((prev) => ({ ...prev, [field]: null }));
        setPasswordSavedAt(null);
    };

    const validatePassword = () => {
        const newErrors = {};
        if (!passwordForm.currentPassword) newErrors.currentPassword = "Informe sua senha atual.";
        if (passwordForm.newPassword.length < 6) newErrors.newPassword = "A nova senha deve ter ao menos 6 caracteres.";
        if (passwordForm.confirmPassword !== passwordForm.newPassword)
            newErrors.confirmPassword = "As senhas não coincidem.";

        setPasswordErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordApiError(null);
        if (!validatePassword()) return;

        setPasswordSubmitting(true);
        try {
            await changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordSavedAt(Date.now());
        } catch (err) {
            setPasswordApiError(err?.response?.data?.error || "Erro ao trocar senha.");
        } finally {
            setPasswordSubmitting(false);
        }
    };

    return (
        <div
            className="w-full h-full overflow-y-auto bg-[#0b0b12] text-white flex flex-col scrollbar-hidden"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <div
                className="scrollbar-hidden pointer-events-none fixed inset-0 z-0"
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(91,106,240,0.18) 0%, transparent 70%)",
                }}
            />

            <main className="relative z-10 flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto scrollbar-hidden">
                <div className="w-full max-w-lg flex flex-col gap-5 pb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                    >
                        <ArrowLeft size={15} />
                        Voltar
                    </button>

                    <div className="flex flex-col items-center text-center gap-2 mb-1">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: ACCENT_SOFT, border: `1px solid ${BORDER_SOFT}` }}
                        >
                            <SettingsIcon size={18} style={{ color: ACCENT }} />
                        </div>
                        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
                        <p className="text-sm text-gray-400">Gerencie seus dados e sua senha.</p>
                    </div>

                    {/* ---- Perfil ---- */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col gap-4 rounded-2xl px-5 py-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <div className="flex items-center gap-2">
                            <User size={14} style={{ color: ACCENT }} />
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Perfil</h2>
                        </div>

                        {profileApiError && (
                            <div
                                className="rounded-xl px-4 py-3 text-sm"
                                style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                            >
                                {profileApiError}
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3.5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">Nome completo</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${profileErrors.name ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <User size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={handleProfileChange("name")}
                                        disabled={profileSubmitting}
                                        placeholder="Seu nome"
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                </div>
                                {profileErrors.name && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{profileErrors.name}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">E-mail</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${profileErrors.email ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <Mail size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={handleProfileChange("email")}
                                        disabled={profileSubmitting}
                                        placeholder="seu@email.com"
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                </div>
                                {profileErrors.email && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{profileErrors.email}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">CPF</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${profileErrors.cpf ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <IdCard size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={profileForm.cpf}
                                        onChange={handleProfileChange("cpf")}
                                        disabled={profileSubmitting}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                </div>
                                {profileErrors.cpf && <p className="text-xs pl-1" style={{ color: "#f87171" }}>{profileErrors.cpf}</p>}
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-1">
                                <SavedBadge savedAt={profileSavedAt} label="Perfil atualizado!" />
                                <motion.button
                                    type="submit"
                                    disabled={profileSubmitting}
                                    whileHover={{ scale: profileSubmitting ? 1 : 1.02 }}
                                    whileTap={{ scale: profileSubmitting ? 1 : 0.98 }}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ml-auto shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                                >
                                    {profileSubmitting ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        "Salvar alterações"
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>

                    {/* ---- Segurança ---- */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                        className="flex flex-col gap-4 rounded-2xl px-5 py-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}
                    >
                        <div className="flex items-center gap-2">
                            <Lock size={14} style={{ color: ACCENT }} />
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Segurança</h2>
                        </div>

                        {passwordApiError && (
                            <div
                                className="rounded-xl px-4 py-3 text-sm"
                                style={{ background: "rgba(240,91,91,0.1)", border: "1px solid rgba(240,91,91,0.25)", color: "#f87171" }}
                            >
                                {passwordApiError}
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">Senha atual</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${passwordErrors.currentPassword ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <Lock size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange("currentPassword")}
                                        disabled={passwordSubmitting}
                                        placeholder="Sua senha atual"
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword((p) => !p)}
                                        className="text-gray-500 hover:text-gray-300 shrink-0"
                                    >
                                        {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {passwordErrors.currentPassword && (
                                    <p className="text-xs pl-1" style={{ color: "#f87171" }}>{passwordErrors.currentPassword}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">Nova senha</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${passwordErrors.newPassword ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <Lock size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange("newPassword")}
                                        disabled={passwordSubmitting}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((p) => !p)}
                                        className="text-gray-500 hover:text-gray-300 shrink-0"
                                    >
                                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {passwordErrors.newPassword && (
                                    <p className="text-xs pl-1" style={{ color: "#f87171" }}>{passwordErrors.newPassword}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 pl-1">Confirmar nova senha</label>
                                <div
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: `1px solid ${passwordErrors.confirmPassword ? "rgba(240,91,91,0.5)" : BORDER_SOFT}`,
                                    }}
                                >
                                    <Lock size={15} className="text-gray-500 shrink-0" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange("confirmPassword")}
                                        disabled={passwordSubmitting}
                                        placeholder="Repita a nova senha"
                                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                                    />
                                </div>
                                {passwordErrors.confirmPassword && (
                                    <p className="text-xs pl-1" style={{ color: "#f87171" }}>{passwordErrors.confirmPassword}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-1">
                                <SavedBadge savedAt={passwordSavedAt} label="Senha atualizada!" />
                                <motion.button
                                    type="submit"
                                    disabled={passwordSubmitting}
                                    whileHover={{ scale: passwordSubmitting ? 1 : 1.02 }}
                                    whileTap={{ scale: passwordSubmitting ? 1 : 0.98 }}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ml-auto shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cf6 100%)` }}
                                >
                                    {passwordSubmitting ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        "Atualizar senha"
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
