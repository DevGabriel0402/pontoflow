// src/utils/exportarCsv.js
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Utilitário para exportar dados para CSV de forma personalizada
 * @param {Array<Object>} dados - Array de objetos a serem exportados
 * @param {Array<string>} colunas - Cabeçalhos das colunas
 * @param {Array<string>} chaves - Chaves dos objetos correspondentes às colunas
 * @param {string} nomeArquivo - Nome do arquivo a ser gerado
 */
export function exportarParaCsv({ dados, colunas, chaves, nomeArquivo }) {
    if (!dados || dados.length === 0) return;

    // Cabeçalho
    let csvContent = "\uFEFF"; // BOM para garantir acentuação correta no Excel
    csvContent += colunas.join(";") + "\n";

    // Linhas
    dados.forEach((item) => {
        const linha = chaves.map((chave) => {
            let valor = "";

            // Suporte a caminhos aninhados limitado (ex: check.entrada)
            if (chave.includes(".")) {
                const partes = chave.split(".");
                valor = item[partes[0]]?.[partes[1]] || "";
            } else {
                valor = item[chave] || "";
            }

            // Tratamento de tipos especiais
            if (valor instanceof Date) {
                valor = format(valor, "dd/MM/yyyy HH:mm", { locale: ptBR });
            } else if (typeof valor === "string") {
                // Remove quebras de linha e escapa aspas
                valor = valor.replace(/\n/g, " ").replace(/"/g, '""');
                if (valor.includes(";")) valor = `"${valor}"`;
            }

            return valor;
        });
        csvContent += linha.join(";") + "\n";
    });

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo || "export.csv");
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
