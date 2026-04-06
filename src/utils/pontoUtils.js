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
export function calcularResumoDiario(pontos, jornadas, diasAbonados = [], cargaHorariaSemanal = 44, periodoInicio = null, periodoFim = null, feriados = [], dataCriacao = null) {
    // Array para mapear o .getDay() do JS para a nossa chave de jornadas
    const mapDias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const carga = Number(cargaHorariaSemanal || 44);

    const extrairEsperadoParaDia = (dataObj) => {
        const key = format(dataObj, "yyyy-MM-dd");
        if (feriados.includes(key)) return 0; // Feriado = esperado 0

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

        // Padrão de pausa: 20 min para <= 30h, 60 min para > 30h
        let pausaMin = carga <= 30 ? 20 : 60;

        if (jDia.inicioIntervalo && jDia.fimIntervalo) {
            const pIni = horaParaMin(jDia.inicioIntervalo);
            const pFim = horaParaMin(jDia.fimIntervalo);
            if (pIni !== null && pFim !== null) {
                pausaMin = Math.max(0, pFim - pIni);
            }
        } else if (jDia.intervaloMin) {
            pausaMin = Number(jDia.intervaloMin);
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

    // Se houver um período definido, garante que TODOS os dias do período estejam no objeto 'grupos'
    if (periodoInicio && periodoFim) {
        let atual = new Date(`${periodoInicio}T12:00:00`);
        const fim = new Date(`${periodoFim}T12:00:00`);
        while (atual <= fim) {
            const key = format(atual, "yyyy-MM-dd");
            if (!grupos[key]) {
                grupos[key] = { data: new Date(atual), pontos: [] };
            }
            atual.setDate(atual.getDate() + 1);
        }
    }

    // Garante que mesmo os dias abonados (sem ponto batido) apareçam no resumo.
    const chavesAbono = Array.isArray(diasAbonados) ? diasAbonados : Object.keys(diasAbonados || {});
    chavesAbono.forEach((isoDate) => {
        if (!grupos[isoDate]) {
            const dLocal = new Date(`${isoDate}T12:00:00`);
            grupos[isoDate] = { data: dLocal, pontos: [] };
        }
    });

    return Object.entries(grupos).map(([dataKey, g]) => {
        const pts = g.pontos.sort((a, b) => a.dateObj - b.dateObj);
        
        const getMeta = (type) => {
            const p = pts.filter((p) => p.type === type).pop();
            if (!p) return null;
            return {
                time: p.dateObj,
                foiJustificado: p.origem === "JUSTIFICATIVA_APROVADA"
            };
        };

        const entradaMeta = getMeta("ENTRADA");
        const saidaMeta = getMeta("SAIDA");
        const iniIntMeta = getMeta("INICIO_INTERVALO");
        const fimIntMeta = getMeta("FIM_INTERVALO");

        const entrada = entradaMeta?.time;
        const saida = saidaMeta?.time;
        const iniInt = iniIntMeta?.time;
        const fimInt = fimIntMeta?.time;;

        let minutosTrabalhados = 0;
        let status = "Incompleto";

        const hojeKey = format(new Date(), "yyyy-MM-dd");

        if (entrada && saida) {
            const total = differenceInMinutes(saida, entrada);

            // PADRONIZAÇÃO DO INTERVALO: 
            // Se tem início de intervalo, usamos a pausa padrão (20min para 30h, 60min para 44h)
            // ou a pausa específica da jornada se houver.
            let intervalo = 0;
            if (iniInt) {
                intervalo = carga <= 30 ? 20 : 60;

                // Tenta pegar da jornada do dia se houver configuração específica
                const index = g.data.getDay();
                const diaStr = mapDias[index];
                const jDia = jornadas?.[diaStr] || jornadas;
                if (jDia?.inicioIntervalo && jDia?.fimIntervalo) {
                    const pIni = horaParaMin(jDia.inicioIntervalo);
                    const pFim = horaParaMin(jDia.fimIntervalo);
                    if (pIni !== null && pFim !== null) {
                        intervalo = Math.max(0, pFim - pIni);
                    }
                } else if (jDia?.intervaloMin) {
                    intervalo = Number(jDia.intervaloMin);
                }
            }

            minutosTrabalhados = Math.max(0, total - intervalo);
            if (!iniInt && !fimInt) status = "Ok";
            else if (iniInt && fimInt) status = "Ok";
            else status = "Intervalo Incompleto";
        } else if (entrada && !saida) {
            status = "Sem Saída";
        } else if (!entrada && !saida) {
            if (feriados.includes(dataKey)) status = "Feriado";
            else if (dataKey > hojeKey) status = "Futuro";
            else if (dataKey === hojeKey) status = "Hoje";
            else status = "Falta";
        }

        let minutosEsperadosDia = extrairEsperadoParaDia(g.data);

        if (Array.isArray(diasAbonados) && diasAbonados.includes(dataKey)) {
            minutosEsperadosDia = 0;
            status = "Abonado";
        } else if (diasAbonados && typeof diasAbonados === 'object' && diasAbonados[dataKey]) {
            minutosEsperadosDia = 0;
            status = diasAbonados[dataKey];
        }

        let diferenca = 0;
        if (saida && minutosEsperadosDia !== null) {
            diferenca = minutosTrabalhados - minutosEsperadosDia;
        } else if (!saida && status === "Falta" && minutosEsperadosDia > 0) {
            // REGRA DE DESCONTO AUTOMÁTICO SOLICITADA PELO USUÁRIO:
            // 44h -> 9h (540 min)
            // 40h -> 8h (480 min)
            // 30h -> 5h40min (340 min)
            if (carga >= 44) diferenca = -540;
            else if (carga >= 40) diferenca = -480;
            else if (carga >= 30) diferenca = -340;
            else diferenca = -minutosEsperadosDia; // Fallback para outras cargas
        }

        return {
            dataKey,
            data: g.data,
            minutosTrabalhados,
            minutosEsperados: minutosEsperadosDia,
            diferenca,
            status,
            ponto_indices: {
                entrada: entradaMeta,
                saida: saidaMeta,
                iniInt: iniIntMeta,
                fimInt: fimIntMeta
            },
            pontosOriginal: pts,
        };
    }).filter(d => {
        const hojeKey = format(new Date(), "yyyy-MM-dd");

        // 0. Filtrar pelo período selecionado
        if (periodoInicio && d.dataKey < periodoInicio) return false;
        if (periodoFim && d.dataKey > periodoFim) return false;

        // 1. Esconder dias anteriores à criação do funcionário (ou data de implantação como fallback)
        const inicioKey = dataCriacao ? format(dataCriacao, "yyyy-MM-dd") : "2026-02-27";
        if (d.dataKey < inicioKey) return false;

        // 2. Esconder dias futuros
        if (d.dataKey > hojeKey) return false;

        // 3. Esconder finais de semana ou folgas SEM ponto batido e SEM horas esperadas
        const temPonto = !!d.ponto_indices.entrada || !!d.ponto_indices.saida;
        const temEsperado = d.minutosEsperados > 0;
        
        // Verifica se o dia foi explicitamente abonado
        const foiAbonado = diasAbonados && typeof diasAbonados === 'object' ? !!diasAbonados[d.dataKey] : Array.isArray(diasAbonados) && diasAbonados.includes(d.dataKey);

        // Se não era pra trabalhar e não trabalhou, retira da lista
        // Exceção: se o dia foi abonado ou era um feriado global, queremos mostrar
        if (!temEsperado && !temPonto && !foiAbonado && d.status !== "Feriado") return false;

        return true;
    });
}

