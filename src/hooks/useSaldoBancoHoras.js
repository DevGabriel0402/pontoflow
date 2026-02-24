import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { calcularResumoDiario, horaParaMin } from "../utils/pontoUtils";

/**
 * Hook para calcular o saldo do banco de horas de um usuário específico.
 */
export function useSaldoBancoHoras(userId, perfil) {
    const [pontos, setPontos] = useState([]);
    const [lancamentos, setLancamentos] = useState([]);
    const [carregando, setCarregando] = useState(true);

    // Busca pontos
    useEffect(() => {
        if (!userId) return;
        const q = query(
            collection(db, "pontos"),
            where("userId", "==", userId),
            orderBy("criadoEm", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setPontos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCarregando(false);
        });
        return () => unsub();
    }, [userId]);

    // Busca lançamentos manuais
    useEffect(() => {
        if (!userId || !perfil?.companyId) return;
        const q = query(
            collection(db, "banco_horas"),
            where("userId", "==", userId),
            where("companyId", "==", perfil.companyId),
            orderBy("criadoEm", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setLancamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [userId, perfil?.companyId]);

    const saldo = useMemo(() => {
        if (!perfil) return { saldoHoras: 0, saldoDias: 0 };

        const dias = calcularResumoDiario(pontos, perfil.jornada);

        // Saldo automático (pontos vs jornada)
        const somaAutoMinutos = dias.reduce((acc, d) => acc + (d.diferenca ?? 0), 0);

        // Saldo manual (ajustes)
        const somaManualMinutos = lancamentos.reduce((acc, l) =>
            acc + (l.tipo === "CREDITO" ? l.minutos : -l.minutos), 0
        );

        const saldoTotalMinutos = somaAutoMinutos + somaManualMinutos;

        // Calcular minutos de um dia de jornada para converter horas -> dias
        const jornadaMin = (() => {
            if (!perfil.jornada?.entrada || !perfil.jornada?.saida) return 480; // fallback 8h
            const ini = horaParaMin(perfil.jornada.entrada);
            const fim = horaParaMin(perfil.jornada.saida);
            const pausa = perfil.jornada.intervaloMin ?? 60;
            return Math.max(1, fim - ini - pausa);
        })();

        const saldoTotalDias = saldoTotalMinutos / jornadaMin;

        return {
            saldoMinutos: saldoTotalMinutos,
            saldoDias: saldoTotalDias
        };
    }, [pontos, lancamentos, perfil]);

    return { ...saldo, carregando };
}
