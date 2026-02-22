// src/hooks/useHistoricoPontos.js
import React from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContexto";

export function useHistoricoPontos(userId) {
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

        // Se há companyId, filtra por ele (mais eficiente e seguro).
        // Se não há (ex: super admin sem empresa), filtra apenas por userId.
        const filtros = [where("userId", "==", userId)];
        if (perfil?.companyId) {
            filtros.push(where("companyId", "==", perfil.companyId));
        }

        const q = query(collection(db, "pontos"), ...filtros);

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setItens(lista);
                setCarregando(false);
            },
            (e) => {
                console.error("[useHistoricoPontos] Erro no Firestore:", e);
                setErro(`Erro ao carregar: ${e.message || "Verifique sua conexão"}`);
                setCarregando(false);
            }
        );

        return () => unsub();
    }, [userId, perfil?.companyId]);

    return React.useMemo(() => ({ itens, carregando, erro }), [itens, carregando, erro]);
}
