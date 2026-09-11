import { auth } from "./firebase";

export async function chamarApi(path, { method = "POST", data, autenticado = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (autenticado) {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Não foi possível concluir a operação.");
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    throw error;
  }

  return payload.data;
}

export const criarFuncionarioFn = (dados) => chamarApi("/api/usuarios/criar", { data: dados });
export const deletarFuncionarioFn = (uid) => chamarApi("/api/usuarios/deletar", { data: { uid } });
export const criarAdminEmpresaFn = (dados) => chamarApi("/api/admin/criar", { data: dados });
export const corrigirCompanyFn = () => chamarApi("/api/admin/corrigir-vinculos", { data: {} });
export const trocarSenhaPrimeiroAcessoFn = (dados) => chamarApi("/api/usuarios/trocar-senha", { data: dados });
export const loginPorMatriculaFn = (dados) => chamarApi("/api/auth/matricula", { data: dados, autenticado: false });
export const verificarAtrasosFn = () => {
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return Promise.resolve(null);
  }
  return chamarApi("/api/notificacoes/verificar-atrasos", { data: {} }).catch(() => null);
};
