import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import Home from '../pages/Home';

export default function RootGate() {
    const { isAuthenticated, loading } = useAuth();

    // Enquanto verifica se existe sessão ativa (chamada a /auth/me em andamento)
    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#0b0b12]">
                <Loader2 size={24} className="text-white animate-spin" />
            </div>
        );
    }

    // Já logado → pula a landing page e vai direto pro upload
    if (isAuthenticated) {
        return <Navigate to="/upload" replace />;
    }

    // Não logado → mostra a Home normal (com CTA de cadastro)
    return <Home />;
}