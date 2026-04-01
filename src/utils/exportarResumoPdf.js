// src/utils/exportarResumoPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatarDataSimples(d) {
    if (!d) return "-";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function formatarHora(d) {
    if (!d) return "—";
    return format(d, "HH:mm", { locale: ptBR });
}

/**
 * resumo: array de objetos gerados pelo useMemo resumoJornada no DashboardAdmin
 * meta: infos do relatório (empresa, periodo, totalGeral)
 */
export function exportarResumoPdf(resumo, meta = {}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const titulo = "Relatório de Resumo de Jornada";
    const empresa = meta.empresa || "Empresa";
    const periodo = meta.periodo || "—";
    const totalGeral = meta.totalGeral || "0h 0m";
    const geradoEm = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titulo, 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Empresa: ${empresa}`, 14, 22);
    doc.text(`Período dos Registros: ${periodo}`, 14, 27);
    doc.text(`Gerado em: ${geradoEm}`, 14, 32);

    // Resumo de Horas do Período
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 38, 182, 10, "F");
    doc.text(`TOTAL TRABALHADO NO PERÍODO: ${totalGeral}`, 18, 44.5);

    const pontosAtivos = meta.pontosAtivos || ['entrada', 'intervalo_saida', 'intervalo_entrada', 'saida'];
    const temPonto = (id) => pontosAtivos.includes(id);

    // Tabela
    const headRow = ["Funcionário", "Data"];
    if (temPonto('entrada')) headRow.push("Entrada");
    if (temPonto('intervalo_saida') || temPonto('intervalo_entrada')) headRow.push("Intervalo");
    if (temPonto('saida')) headRow.push("Saída");
    headRow.push("Total", "Status");

    const head = [headRow];

    const body = resumo.map((r) => {
        const row = [r.userName || r.userId, formatarDataSimples(r.data)];
        const pi = r.ponto_indices || {};

        if (temPonto('entrada')) {
            row.push(formatarHora(pi.entrada?.time));
        }

        if (temPonto('intervalo_saida') || temPonto('intervalo_entrada')) {
            const intervalo = pi.iniInt?.time && pi.fimInt?.time
                ? `${formatarHora(pi.iniInt.time)} - ${formatarHora(pi.fimInt.time)}`
                : pi.iniInt?.time || pi.fimInt?.time ? "Incomp." : "N/A";
            row.push(intervalo);
        }

        if (temPonto('saida')) {
            row.push(formatarHora(pi.saida?.time));
        }

        row.push(r.totalFormatado);
        row.push(r.status);

        return row;
    });

    autoTable(doc, {
        startY: 52,
        head,
        body,
        styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 2,
            overflow: "linebreak",
            valign: "middle",
        },
        headStyles: {
            fillColor: [16, 19, 26], // dark
            textColor: [255, 255, 255],
        },
        didParseCell: (data) => {
            if (data.section === "body") {
                const rowIndex = data.row.index;
                const item = resumo[rowIndex];
                if (item?.status !== "Ok") {
                    data.cell.styles.textColor = [180, 80, 0]; // Laranja para avisos
                }
            }
        },
        margin: { left: 14, right: 14 },
    });

    // Rodapé com paginação
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
            `PontoFlow • Relatório de Resumo de Jornada • Página ${i} de ${pageCount}`,
            14,
            290
        );
    }

    doc.autoPrint();
    const blob = doc.output("bloburl");
    window.open(blob, "_blank");
}
