import { ApiError } from "./http.js";
import { randomBytes } from "node:crypto";

export function gerarSenhaTemporaria(nome, dataNasc) {
  if (!dataNasc) return "01012000";
  const str = String(dataNasc);
  if (str.includes("-")) {
    const parts = str.split("-"); // [YYYY, MM, DD]
    if (parts.length === 3) {
      return `${parts[2]}${parts[1]}${parts[0]}`;
    }
  }
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[2]}`;
    }
  }
  const apenasNumeros = str.replace(/\D/g, "");
  return apenasNumeros || "01012000";
}

export function normalizarRole(role) {
  if (!role) return "colaborador";
  if (["colaborador", "employee", "admin"].includes(role)) return role;
  throw new ApiError(400, "invalid-role", "Tipo de acesso invalido.");
}

export function normalizarJornada(jornada) {
  if (!jornada) return null;
  const value = {
    entrada: jornada.entrada || "08:00",
    inicioIntervalo: jornada.inicioIntervalo || "12:00",
    fimIntervalo: jornada.fimIntervalo || "13:00",
    saida: jornada.saida || "17:00",
  };
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  value.cargaHorariaDiaria =
    toMinutes(value.inicioIntervalo) - toMinutes(value.entrada) +
    toMinutes(value.saida) - toMinutes(value.fimIntervalo);
  return value;
}
