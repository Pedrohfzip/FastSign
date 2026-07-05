import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCurrentUser, loginUser, logoutUser } from '../api/loginRoute';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true enquanto verifica sessão existente

    // Ao carregar o app, verifica se já existe uma sessão válida (cookie httpOnly)
    useEffect(() => {
        let cancelled = false;

        async function checkSession() {
            try {
                const { user } = await fetchCurrentUser();
                if (!cancelled) setUser(user);
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        checkSession();
        return () => { cancelled = true; };
    }, []);

    const login = useCallback(async ({ email, password }) => {
        const { user } = await loginUser({ email, password });
        setUser(user);
        return user;
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
    }
    return context;
}