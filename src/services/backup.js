import { chamarApi } from "./funcoes";

export async function baixarBackup() {
  const backup = await chamarApi("/api/backup/exportar", { method: "GET" });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pontoflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function restaurarBackup(backup) {
  return chamarApi("/api/backup/restaurar", {
    data: { backup, confirmacao: "RESTAURAR_BACKUP" },
  });
}
