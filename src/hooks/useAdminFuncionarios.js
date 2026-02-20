// src/hooks/useAdminFuncionarios.js
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

export function useAdminFuncionarios() {
    const [funcionarios, setFuncionarios] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        setCarregando(true);
        setErro(null);

        // Busca todos os usuários ordenados por nome
        const q = query(collection(db, "users"), orderBy("nome", "asc"));

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setFuncionarios(lista);
                setCarregando(false);
            },
            (e) => {
                console.error("Erro ao carregar funcionários:", e);
                setErro("Falha ao carregar lista de funcionários.");
                setCarregando(false);
            }
        );

        return () => unsub();
    }, []);

    return React.useMemo(() => ({ funcionarios, carregando, erro }), [funcionarios, carregando, erro]);
}
