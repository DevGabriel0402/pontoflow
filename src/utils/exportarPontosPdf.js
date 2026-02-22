// src/utils/exportarPontosPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatarData(ts) {
    if (!ts) return "-";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatarTipo(tipo) {
    const map = {
        ENTRADA: "Entrada",
        INICIO_INTERVALO: "Início Intervalo",
        FIM_INTERVALO: "Fim Intervalo",
        SAIDA: "Saída",
    };
    return map[tipo] || tipo;
}

function limparTexto(v) {
    if (v === null || v === undefined) return "";
    return String(v);
}

/**
 * pontos: array de docs (Firestore) já filtrados (ex: pelo admin)
 * meta: infos do relatório (empresa, periodo, filtros)
 */
export function exportarPontosPdf(pontos, meta = {}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const titulo = meta.titulo || "Relatório de Pontos — PontoFlow";
    const empresa = meta.empresa || "Empresa";
    const periodo = meta.periodo || "—";
    const geradoEm = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titulo, 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Empresa: ${empresa}`, 14, 22);
    doc.text(`Período: ${periodo}`, 14, 27);
    doc.text(`Gerado em: ${geradoEm}`, 14, 32);

    // Resumo
    const total = pontos.length;
    const foraRaio = pontos.filter((p) => p.dentroDoRaio === false).length;

    doc.setFont("helvetica", "bold");
    doc.text(`Total de registos: ${total}`, 14, 39);
    doc.text(`Fora do raio: ${foraRaio}`, 90, 39);

    // Tabela
    const head = [[
        "Funcionário",
        "Tipo",
        "Data/Hora",
        "IP",
        "Dist.(m)",
        "Raio",
        "Origem",
    ]];

    const body = pontos.map((p) => [
        limparTexto(p.userName || p.userId),
        formatarTipo(p.type),
        formatarData(p.criadoEm),
        limparTexto(p.ip || "-"),
        typeof p.distanciaRelativa === "number" ? String(p.distanciaRelativa) : "-",
        p.dentroDoRaio === false ? "FORA" : "OK",
        limparTexto(p.origem || "-"),
    ]);

    autoTable(doc, {
        startY: 44,
        head,
        body,
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 2.2,
            overflow: "linebreak",
            valign: "middle",
        },
        headStyles: {
            fillColor: [16, 19, 26], // dark
            textColor: [255, 255, 255],
        },
        didParseCell: (data) => {
            // pinta linha quando fora do raio
            if (data.section === "body") {
                const rowIndex = data.row.index;
                const item = pontos[rowIndex];
                if (item?.dentroDoRaio === false) {
                    data.cell.styles.fillColor = [255, 235, 238]; // vermelho clarinho
                    data.cell.styles.textColor = [150, 0, 0];
                }
            }
        },
        margin: { left: 14, right: 14 },
    });

    // Rodapé com paginação
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
            `PontoFlow • Página ${i} de ${pageCount}`,
            14,
            290
        );
    }

    // em vez de doc.save(nomeArquivo);
    // vamos usar autoPrint e abrir em nova aba
    doc.autoPrint();
    const blob = doc.output("bloburl");
    window.open(blob, "_blank");
}