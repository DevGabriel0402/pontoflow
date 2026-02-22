// src/hooks/useHistoricoPontos.js
import React from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContexto";

export function useHistoricoPontos(userId) {
    const { perfil } = useAuth();
    const [itens, setItens] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        console.log("useHistoricoPontos Effect:", { userId, companyId: perfil?.companyId });
        if (!userId || !perfil?.companyId) {
            console.log("useHistoricoPontos: Aguardando dados...");
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        const q = query(
            collection(db, "pontos"),
            where("userId", "==", userId),
            where("companyId", "==", perfil.companyId)
            // orderBy("criadoEm", "desc") -> Removido para evitar necessidade de índices compostos manuais.
            // A ordenação já é feita em memória no componente Historico.jsx
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setItens(lista);
                setCarregando(false);
            },
            (e) => {
                console.error("[useHistoricoPontos] Erro no Firestore:", e);
                // Exibir a mensagem técnica ajuda o usuário a identificar falta de índices ou permissão
                setErro(`Erro ao carregar: ${e.message || "Verifique sua conexão"}`);
                setCarregando(false);
            }
        );

        return () => unsub();
    }, [userId]);

    const api = React.useMemo(() => ({ itens, carregando, erro }), [itens, carregando, erro]);
    return api;
}