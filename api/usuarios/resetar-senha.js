import { ApiError, handleApi, parseBody, requireFields } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { FieldValue, getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";
import { gerarSenhaTemporaria } from "../_lib/users.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireAdmin(req);
    const data = parseBody(req);
    requireFields(data, ["targetUid"]);

    const db = getAdminDb();
    const auth = getAdminAuth();
    const targetUid = String(data.targetUid).trim();

    // Buscar dados do funcionário a ser resetado
    const userDoc = await db.doc(`users/${targetUid}`).get();
    if (!userDoc.exists) {
      throw new ApiError(404, "user-not-found", "Funcionário não encontrado.");
    }

    const userData = userDoc.data();

    // Garantir que administradores padrão só possam alterar funcionários da própria empresa
    if (caller.profile.isSuperAdmin !== true && caller.profile.companyId !== userData.companyId) {
      throw new ApiError(403, "permission-denied", "Não é permitido alterar usuários de outra empresa.");
    }

    if (!userData.dataNascimento) {
      throw new ApiError(400, "birthdate-missing", "O funcionário não possui data de nascimento cadastrada.");
    }

    // Gerar a senha padrão no formato DDMMYYYY a partir da data de nascimento
    const senhaPadrao = gerarSenhaTemporaria(userData.nome || "Usuario", userData.dataNascimento);

    // Atualizar no Firebase Auth
    await auth.updateUser(targetUid, { password: senhaPadrao });

    // Atualizar registro no Firestore para marcar primeiro acesso / senha resetada
    await db.doc(`users/${targetUid}`).update({
      primeiroAcesso: true,
      senhaResetadaEm: FieldValue.serverTimestamp(),
      senhaResetadaPor: caller.uid,
    });

    return {
      success: true,
      nome: userData.nome || userData.email,
      senhaPadrao,
    };
  });
}
