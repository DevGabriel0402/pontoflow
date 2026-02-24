import { format, differenceInMinutes } from "date-fns";

/** Converte "HH:mm" para minutos totais desde meia-noite */
export function horaParaMin(str) {
    if (!str) return null;
    const [h, m] = str.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

/** Formata minutos em "+Xh YYmin" ou "-Xh YYmin" */
export function formatarSaldo(totalMinutos) {
    const sinal = totalMinutos >= 0 ? "+" : "-";
    const abs = Math.abs(totalMinutos);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sinal}${h}h${m.toString().padStart(2, "0")}min`;
}

/** Formata minutos positivos em "Xh YYmin" */
export function formatarDuracao(totalMinutos) {
    const abs = Math.abs(totalMinutos);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h${m.toString().padStart(2, "0")}min`;
}

/**
 * Para um único funcionário e lista de pontos, calcula o resumo diário.
 * Retorna array de { dataKey, data, minutosTrabalhados, minutosEsperados, diferenca, status }
 */
export function calcularResumoDiario(pontos, jornada) {
    const minutosEsperadosDia = (() => {
        if (!jornada?.entrada || !jornada?.saida) return null;
        const ini = horaParaMin(jornada.entrada);
        const fim = horaParaMin(jornada.saida);
        const pausaMin = jornada.intervaloMin ?? 60; // pausa padrão 60min se não configurado
        if (ini === null || fim === null) return null;
        return Math.max(0, fim - ini - pausaMin);
    })();

    // Agrupa por data
    const grupos = {};
    pontos.forEach((p) => {
        const d = p.criadoEm?.toDate ? p.criadoEm.toDate() : p.criadoEm ? new Date(p.criadoEm) : null;
        if (!d) return;
        const key = format(d, "yyyy-MM-dd");
        if (!grupos[key]) grupos[key] = { data: d, pontos: [] };
        grupos[key].pontos.push({ ...p, dateObj: d });
    });

    return Object.entries(grupos).map(([dataKey, g]) => {
        const pts = g.pontos.sort((a, b) => a.dateObj - b.dateObj);
        const entrada = pts.find((p) => p.type === "ENTRADA")?.dateObj;
        const saida = pts.find((p) => p.type === "SAIDA")?.dateObj;
        const iniInt = pts.find((p) => p.type === "INICIO_INTERVALO")?.dateObj;
        const fimInt = pts.find((p) => p.type === "FIM_INTERVALO")?.dateObj;

        let minutosTrabalhados = 0;
        let status = "Incompleto";

        if (entrada && saida) {
            const total = differenceInMinutes(saida, entrada);
            const intervalo = iniInt && fimInt ? differenceInMinutes(fimInt, iniInt) : 0;
            minutosTrabalhados = Math.max(0, total - intervalo);
            if (!iniInt && !fimInt) status = "Ok";
            else if (iniInt && fimInt) status = "Ok";
            else status = "Intervalo Incompleto";
        } else if (entrada && !saida) {
            status = "Sem Saída";
        }

        const diferenca = minutosEsperadosDia !== null
            ? minutosTrabalhados - minutosEsperadosDia
            : null;

        return {
            dataKey,
            data: g.data,
            minutosTrabalhados,
            minutosEsperados: minutosEsperadosDia,
            diferenca,
            status,
            check: { entrada, saida, iniInt, fimInt },
        };
    });
}
