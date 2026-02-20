// src/hooks/useHistoricoPontos.js
import React from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export function useHistoricoPontos(userId) {
    const [itens, setItens] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        if (!userId) return;

        setCarregando(true);
        setErro(null);

        const q = query(
            collection(db, "pontos"),
            where("userId", "==", userId),
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
                console.log(e);
                setErro("Falha ao carregar histórico.");
                setCarregando(false);
            }
        );

        return () => unsub();
    }, [userId]);

    const api = React.useMemo(() => ({ itens, carregando, erro }), [itens, carregando, erro]);
    return api;
}