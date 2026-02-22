// src/hooks/useMasterCompanies.js
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

export function useMasterCompanies() {
    const [companies, setCompanies] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [erro, setErro] = React.useState(null);

    React.useEffect(() => {
        setCarregando(true);
        setErro(null);

        const q = query(collection(db, "companies"), orderBy("criadoEm", "desc"));

        const unsub = onSnapshot(
            q,
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setCompanies(lista);
                setCarregando(false);
            },
            (e) => {
                console.error("Erro ao carregar empresas:", e);
                setErro("Falha ao carregar lista de empresas.");
                setCarregando(false);
            }
        );

        return () => unsub();
    }, []);

    return React.useMemo(() => ({ companies, carregando, erro }), [companies, carregando, erro]);
}
