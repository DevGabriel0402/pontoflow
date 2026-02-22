import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import LoadingGlobal from "../components/LoadingGlobal";
import { useAuth } from "./AuthContexto";

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const { perfil, carregando: carregandoAuth } = useAuth();
    const [nomePainel, setNomePainel] = useState("PontoFlow");
    const [config, setConfig] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        // Se ainda estiver carregando a autenticação, não faz nada
        if (carregandoAuth) return;

        // Se não houver perfil ou companyId, podemos usar uma "empresa padrão" ou configurações globais
        // Para o MVP SaaS, vamos usar o companyId do usuário se existir, senão o global anterior
        const companyId = perfil?.companyId || "default";
        const docRef = perfil?.companyId
            ? doc(db, "companies", perfil.companyId)
            : doc(db, "settings", "geofencing");

        setCarregando(true);

        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const configData = data.config || data;

                if (configData.nomePainel) {
                    const novoNome = configData.nomePainel.trim() || "PontoFlow";
                    setNomePainel(novoNome);
                    document.title = `${novoNome} - Gestão de Ponto`;
                }
                setConfig(configData);
            } else {
                setConfig({
                    nomePainel: "PontoFlow",
                    raioM: 500,
                    lat: -19.9440459,
                    lng: -43.9147834
                });
            }
            setCarregando(false);
        }, (err) => {
            console.error("Erro ao carregar config:", err);
            setCarregando(false);
        });

        return () => unsub();
    }, [perfil?.companyId, carregandoAuth]);

    const value = React.useMemo(() => ({ nomePainel, config }), [nomePainel, config]);

    if (carregandoAuth || carregando) {
        return <LoadingGlobal />;
    }

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error("useConfig deve ser usado dentro de um ConfigProvider");
    }
    return context;
}
