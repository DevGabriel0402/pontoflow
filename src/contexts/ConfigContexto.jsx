// src/contexts/ConfigContexto.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import LoadingGlobal from "../components/LoadingGlobal";

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const [nomePainel, setNomePainel] = useState("PontoFlow");
    const [config, setConfig] = useState(null);

    useEffect(() => {
        // Escuta em tempo real as configurações de geofencing (onde o nome está salvo)
        const unsub = onSnapshot(doc(db, "settings", "geofencing"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.nomePainel) {
                    const novoNome = data.nomePainel.trim() || "PontoFlow";
                    setNomePainel(novoNome);
                    // Atualiza o título da aba do navegador
                    document.title = `${novoNome} - Gestão de Ponto`;
                }
                setConfig(data);
            }
        });

        return () => unsub();
    }, []);

    if (!config) return <LoadingGlobal />;

    return (
        <ConfigContext.Provider value={{ nomePainel, config }}>
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
