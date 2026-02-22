// src/hooks/useAdminFuncionarios.js
import React from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContexto";

export function useAdminFuncionarios() {
    const { perfil } = useAuth();
    const [funcionarios, setFuncionarios] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        if (!perfil?.companyId) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        // Busca usuários da mesma empresa ordenados por nome
        const q = query(
            collection(db, "users"),
            where("companyId", "==", perfil.companyId),
            orderBy("nome", "asc")
        );

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
