// src/services/funcoes.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

const functions = getFunctions(undefined, "southamerica-east1");
// ⚠️ ajuste a região se sua function estiver em outra (ou remova o 2º param pra default)

export const criarFuncionarioFn = async ({ nome, email, dataNascimento, role, jornada }) => {
    // garante que auth está pronto
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const call = httpsCallable(functions, "criarFuncionario");
    const res = await call({ nome, email, dataNascimento, role, jornada });
    return res.data;
};

export const deletarFuncionarioFn = async (uid) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const call = httpsCallable(functions, "deletarFuncionario");
    const res = await call({ uid });
    return res.data;
};

export const criarAdminEmpresaFn = async ({ companyId, nome, email, dataNascimento }) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const call = httpsCallable(functions, "criarAdminEmpresa");
    const res = await call({ companyId, nome, email, dataNascimento });
    return res.data;
};

export const corrigirCompanyFn = async () => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const call = httpsCallable(functions, "corrigirCompanyFuncionarios");
    const res = await call({});
    return res.data;
};