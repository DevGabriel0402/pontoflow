// src/hooks/useAdminPontos.js
import React from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContexto";

export function useAdminPontos() {
    const { perfil } = useAuth();
    const [itens, setItens] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        if (!perfil?.companyId) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        const q = query(
            collection(db, "pontos"),
            where("companyId", "==", perfil.companyId),
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
                setErro("Falha ao carregar registos.");
                setCarregando(false);
            }
        );

        return () => unsub();
    }, []);

    return React.useMemo(() => ({ itens, carregando, erro }), [itens, carregando, erro]);
}