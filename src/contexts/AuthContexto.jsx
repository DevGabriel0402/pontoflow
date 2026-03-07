import React, { createContext, useContext } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContexto = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = React.useState(null);
    const [perfil, setPerfil] = React.useState(null); // { nome, role, ... }
    const [empresaConfig, setEmpresaConfig] = React.useState(null); // Dados da empresa (módulos, regras)
    const [carregando, setCarregando] = React.useState(true);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            try {
                setUsuario(user || null);

                if (user) {
                    const ref = doc(db, "users", user.uid);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const perfilData = snap.data();
                        setPerfil(perfilData);

                        // Busca config da empresa se houver companyId
                        if (perfilData.companyId) {
                            const compSnap = await getDoc(doc(db, "companies", perfilData.companyId));
                            setEmpresaConfig(compSnap.exists() ? compSnap.data() : null);
                        } else {
                            setEmpresaConfig(null);
                        }
                    } else {
                        setPerfil(null);
                        setEmpresaConfig(null);
                    }
                } else {
                    setPerfil(null);
                    setEmpresaConfig(null);
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
            if (snap.exists()) {
                const perfilData = snap.data();
                setPerfil(perfilData);
                if (perfilData.companyId) {
                    const compSnap = await getDoc(doc(db, "companies", perfilData.companyId));
                    setEmpresaConfig(compSnap.exists() ? compSnap.data() : null);
                }
            }
        }
    };

    const isAdmin = perfil?.role === "admin";
    const isSuperAdmin = perfil?.isSuperAdmin === true;

    // Helper para checar módulos ativos
    const temModulo = (modulo) => {
        // Se for Master, libera tudo por padrão ou checa a lógica
        if (isSuperAdmin) return true;
        // Se não tiver config, assume tudo habilitado (retrocompatibilidade)
        if (!empresaConfig?.config?.modulos) return true;
        return !!empresaConfig.config.modulos[modulo];
    };

    const value = React.useMemo(
        () => ({
            usuario,
            perfil,
            empresaConfig,
            isAdmin,
            isSuperAdmin,
            carregando,
            login,
            logout,
            recarregarPerfil,
            temModulo
        }),
        [usuario, perfil, empresaConfig, isAdmin, isSuperAdmin, carregando]
    );

    return <AuthContexto.Provider value={value}>{children}</AuthContexto.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContexto);
    if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
    return ctx;
}