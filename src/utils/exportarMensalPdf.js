// src/utils/exportarMensalPdf.js
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
 * meta: infos do relatório (empresa, periodo, pontosAtivos)
 */
export function exportarMensalPdf(resumo, meta = {}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const empresa = meta.empresa || "Empresa";
    const periodo = meta.periodo || "—";
    const geradoEm = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const pontosAtivos = meta.pontosAtivos || ['entrada', 'intervalo_saida', 'intervalo_entrada', 'saida'];
    const temPonto = (id) => pontosAtivos.includes(id);

    // Agrupar dados por funcionário
    const agrupado = resumo.reduce((acc, curr) => {
        const id = curr.userId;
        if (!acc[id]) {
            acc[id] = {
                nome: curr.userName || id,
                registros: []
            };
        }
        acc[id].registros.push(curr);
        return acc;
    }, {});

    const listaFuncionarios = Object.values(agrupado);

    listaFuncionarios.forEach((func, index) => {
        if (index > 0) doc.addPage();

        // Cabeçalho da Página do Funcionário
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Relatório Mensal de Frequência", 14, 16);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Empresa: ${empresa}`, 14, 22);
        doc.text(`Funcionário: ${func.nome}`, 14, 27);
        doc.text(`Período: ${periodo}`, 14, 32);
        doc.text(`Gerado em: ${geradoEm}`, 14, 37);

        // Tabela de horários deste funcionário
        const headRow = ["Data"];
        if (temPonto('entrada')) headRow.push("Entrada");
        if (temPonto('intervalo_saida') || temPonto('intervalo_entrada')) headRow.push("Intervalo");
        if (temPonto('saida')) headRow.push("Saída");
        headRow.push("Total", "Status");

        const body = func.registros
            .sort((a, b) => a.data - b.data)
            .map((r) => {
                const row = [formatarDataSimples(r.data)];

                if (temPonto('entrada')) {
                    row.push(formatarHora(r.check.entrada));
                }

                if (temPonto('intervalo_saida') || temPonto('intervalo_entrada')) {
                    const intervalo = r.check.iniInt && r.check.fimInt
                        ? `${formatarHora(r.check.iniInt)} - ${formatarHora(r.check.fimInt)}`
                        : r.check.iniInt || r.check.fimInt ? "Incomp." : "N/A";
                    row.push(intervalo);
                }

                if (temPonto('saida')) {
                    row.push(formatarHora(r.check.saida));
                }

                row.push(r.totalFormatado);
                row.push(r.status);

                return row;
            });

        autoTable(doc, {
            startY: 45,
            head: [headRow],
            body,
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [16, 19, 26],
                textColor: [255, 255, 255],
            },
            didParseCell: (data) => {
                if (data.section === "body") {
                    const rowIndex = data.row.index;
                    const item = func.registros[rowIndex];
                    if (item?.status !== "Ok" && item?.status !== "Abonado") {
                        data.cell.styles.textColor = [180, 80, 0];
                    }
                }
            },
            margin: { left: 14, right: 14 },
        });

        // Rodapé individual (opcional)
        const finalY = doc.lastAutoTable.finalY + 10;
        if (finalY < 270) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Assinatura do Colaborador: __________________________________________", 14, finalY + 10);
        }
    });

    // Paginação global
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
            `PontoFlow • Relatório Mensal • Página ${i} de ${pageCount}`,
            14,
            290
        );
    }

    const blob = doc.output("bloburl");
    window.open(blob, "_blank");
}
