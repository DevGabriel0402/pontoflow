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

        // Query by userId only to avoid composite index requirements
        const q = query(
            collection(db, "justificativas"),
            where("userId", "==", userId)
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => {
                        const tA = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : (a.criadoEm ? new Date(a.criadoEm).getTime() : 0);
                        const tB = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : (b.criadoEm ? new Date(b.criadoEm).getTime() : 0);
                        return tB - tA;
                    });
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
