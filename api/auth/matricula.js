import { ApiError, handleApi, parseBody, requireFields } from "../_lib/http.js";
import { getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const data = parseBody(req);
    requireFields(data, ["companyId", "matricula", "dataNascimento"]);

    const db = getAdminDb();
    const company = await db.doc(`companies/${data.companyId}`).get();
    if (!company.exists) throw new ApiError(404, "not-found", "Instituicao nao encontrada.");
    if (!company.data().config?.regras?.loginPorMatricula) {
      throw new ApiError(403, "permission-denied", "Login por matricula nao esta habilitado.");
    }

    const users = await db.collection("users")
      .where("companyId", "==", data.companyId)
      .where("matricula", "==", String(data.matricula).trim())
      .limit(1)
      .get();

    if (users.empty) throw new ApiError(401, "invalid-credentials", "Dados de acesso invalidos.");
    const userDoc = users.docs[0];
    const userData = userDoc.data();
    if (userData.ativo === false) throw new ApiError(403, "user-disabled", "Este perfil esta inativo.");
    if (String(userData.dataNascimento || "") !== String(data.dataNascimento)) {
      throw new ApiError(401, "invalid-credentials", "Dados de acesso invalidos.");
    }

    const token = await getAdminAuth().createCustomToken(userDoc.id);
    return { token, nome: userData.nome || "" };
  });
}
