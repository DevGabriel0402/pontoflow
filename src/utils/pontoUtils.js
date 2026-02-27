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
export function calcularResumoDiario(pontos, jornadas) {
    // Array para mapear o .getDay() do JS para a nossa chave de jornadas
    const mapDias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    const extrairEsperadoParaDia = (dataObj) => {
        if (!jornadas) return null; // Sem configuração nenhuma

        let jDia = null;

        // Verifica se é a estrutura nova { segunda: {...}, terca: {...} }
        if (jornadas.segunda || jornadas.domingo) {
            const index = dataObj.getDay();
            const diaStr = mapDias[index];
            jDia = jornadas[diaStr];
        } else if (jornadas.entrada && jornadas.saida) {
            // Estrutura Legada (uma única jornada genérica presumida de Seg a Sex)
            const isFDS = dataObj.getDay() === 0 || dataObj.getDay() === 6;
            jDia = isFDS ? { ativo: false } : { ...jornadas, ativo: true };
        }

        if (!jDia || !jDia.ativo) return 0; // Folga = esperado 0

        const ini = horaParaMin(jDia.entrada);
        const fim = horaParaMin(jDia.saida);
        if (ini === null || fim === null) return 0;

        // Pega a duração real do intervalo definido na jornada (ex: 13:00 - 12:00 = 60)
        let pausaMin = jDia.intervaloMin ?? 60; // fallback pra legado
        if (jDia.inicioIntervalo && jDia.fimIntervalo) {
            const pIni = horaParaMin(jDia.inicioIntervalo);
            const pFim = horaParaMin(jDia.fimIntervalo);
            if (pIni !== null && pFim !== null) {
                pausaMin = Math.max(0, pFim - pIni);
            }
        }

        return Math.max(0, fim - ini - pausaMin);
    };

    // Agrupa por data
    const grupos = {};
    pontos.forEach((p) => {
        let d;
        if (p.dataHoraOriginal) {
            d = new Date(p.dataHoraOriginal);
        } else {
            d = p.criadoEm?.toDate ? p.criadoEm.toDate() : p.criadoEm ? new Date(p.criadoEm) : null;
        }
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

        const minutosEsperadosDia = extrairEsperadoParaDia(g.data);

        let diferenca = null;
        if (saida && minutosEsperadosDia !== null) {
            diferenca = minutosTrabalhados - minutosEsperadosDia;
        } else if (!saida && minutosEsperadosDia !== null) {
            diferenca = 0; // Só atualiza o saldo de horas quando o horário de saída for batido
        }

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
