import React, { createContext, useContext } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContexto = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = React.useState(null);
    const [perfil, setPerfil] = React.useState(null); // { nome, role, ... }
    const [carregando, setCarregando] = React.useState(true);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            try {
                setUsuario(user || null);

                if (user) {
                    const ref = doc(db, "users", user.uid);
                    const snap = await getDoc(ref);
                    setPerfil(snap.exists() ? snap.data() : null);
                } else {
                    setPerfil(null);
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
                setPerfil(null);
            } finally {
                setCarregando(false);
            }
        });

        return () => unsub();
    }, []);

    const login = async (email, senha) => {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        return cred.user;
    };

    const logout = async () => {
        await signOut(auth);
    };

    const recarregarPerfil = async () => {
        if (usuario) {
            const ref = doc(db, "users", usuario.uid);
            const snap = await getDoc(ref);
            setPerfil(snap.exists() ? snap.data() : null);
        }
    };

    const isAdmin = perfil?.role === "admin";

    const value = React.useMemo(
        () => ({ usuario, perfil, isAdmin, carregando, login, logout, recarregarPerfil }),
        [usuario, perfil, isAdmin, carregando]
    );

    return <AuthContexto.Provider value={value}>{children}</AuthContexto.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContexto);
    if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
    return ctx;
}