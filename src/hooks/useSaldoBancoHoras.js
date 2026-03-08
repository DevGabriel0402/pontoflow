import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { format } from "date-fns";
import { useConfig } from "../contexts/ConfigContexto";
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

    const { config } = useConfig();
    const feriados = config?.feriados || [];

    const saldo = useMemo(() => {
        const dataCriacao = perfil.criadoEm?.toDate ? perfil.criadoEm.toDate() : (perfil.criadoEm ? new Date(perfil.criadoEm) : new Date(2025, 0, 1));
        const periodoInicio = format(dataCriacao, "yyyy-MM-dd");
        const periodoFim = format(new Date(), "yyyy-MM-dd");

        // Extrair todos os abonos
        const abonosFunc = lancamentos
            .filter(l => (
                (l.origem === "JUSTIFICATIVA_APROVADA" && l.minutos === 0 && l.descricao?.includes("Abono de Falta")) ||
                (l.origem === "ABONO_MANUAL")
            ))
            .map(l => {
                if (l.origem === "ABONO_MANUAL" && l.dataReferencia) {
                    return l.dataReferencia;
                }
                const match = l.descricao?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (match) {
                    return `${match[3]}-${match[2]}-${match[1]}`;
                }
                return null;
            })
            .filter(Boolean);

        const confJornada = perfil.jornadas || perfil.jornada;
        const dias = calcularResumoDiario(
            pontos,
            confJornada,
            abonosFunc,
            perfil.cargaHorariaSemanal,
            periodoInicio,
            periodoFim,
            feriados,
            dataCriacao
        );

        // Saldo automático (pontos vs jornada)
        const somaAutoMinutos = dias.reduce((acc, d) => acc + (d.diferenca ?? 0), 0);

        // Saldo manual (ajustes)
        const somaManualMinutos = lancamentos.reduce((acc, l) =>
            acc + (l.tipo === "CREDITO" ? l.minutos : -l.minutos), 0
        );

        const saldoTotalMinutos = somaAutoMinutos + somaManualMinutos;

        const jornadaMin = (() => {
            if (perfil.jornadas?.segunda?.ativo) {
                const ls = perfil.jornadas.segunda;
                const i = horaParaMin(ls.entrada) || 0;
                const f = horaParaMin(ls.saida) || 0;
                let pausa = ls.intervaloMin ?? 60;
                if (ls.inicioIntervalo && ls.fimIntervalo) {
                    pausa = Math.max(0, (horaParaMin(ls.fimIntervalo) || 0) - (horaParaMin(ls.inicioIntervalo) || 0));
                }
                return Math.max(1, f - i - pausa);
            }
            if (perfil.jornada?.entrada && perfil.jornada?.saida) {
                const ini = horaParaMin(perfil.jornada.entrada);
                const fim = horaParaMin(perfil.jornada.saida);
                const pausa = perfil.jornada.intervaloMin ?? 60;
                return Math.max(1, fim - ini - pausa);
            }
            return 480; // fallback 8h
        })();

        const saldoTotalDias = saldoTotalMinutos / jornadaMin;

        return {
            saldoMinutos: saldoTotalMinutos,
            saldoDias: saldoTotalDias
        };
    }, [pontos, lancamentos, perfil]);

    return { ...saldo, carregando };
}
