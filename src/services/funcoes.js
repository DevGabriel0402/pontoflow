// src/services/funcoes.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

const functions = getFunctions(undefined, "southamerica-east1");
// ⚠️ ajuste a região se sua function estiver em outra (ou remova o 2º param pra default)

export const criarFuncionarioFn = async ({ nome, email, dataNascimento }) => {
    // garante que auth está pronto
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const call = httpsCallable(functions, "criarFuncionario");
    const res = await call({ nome, email, dataNascimento });
    return res.data;
};