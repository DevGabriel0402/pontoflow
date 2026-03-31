// src/hooks/useJustificativas.js
import React from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContexto";

export function useJustificativas(userId) {
    const { perfil } = useAuth();
    const [itens, setItens] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        if (!userId) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        const filtros = [where("userId", "==", userId)];
        if (perfil?.companyId) {
            filtros.push(where("companyId", "==", perfil.companyId));
        }

        // Note: You might need a Firestore index for this query (userId + companyId + criadoEm)
        const q = query(
            collection(db, "justificativas"),
            ...filtros,
            orderBy("criadoEm", "desc")
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setItens(lista);
                setCarregando(false);
            },
            (e) => {
                console.error("[useJustificativas] Erro no Firestore:", e);
                setErro(`Erro ao carregar justificativas: ${e.message || "Verifique sua conexão"}`);
                setCarregando(false);
            }
        );

        return () => unsub();
    }, [userId, perfil?.companyId]);

    return React.useMemo(() => ({ itens, carregando, erro }), [itens, carregando, erro]);
}
