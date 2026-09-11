import { handleApi, parseBody, requireFields } from "../_lib/http.js";
import { requireSuperAdmin } from "../_lib/auth.js";
import { FieldValue, getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";
import { gerarSenhaTemporaria } from "../_lib/users.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireSuperAdmin(req);
    const data = parseBody(req);
    requireFields(data, ["companyId", "nome", "email", "dataNascimento"]);

    const auth = getAdminAuth();
    const db = getAdminDb();
    const nome = String(data.nome).trim();
    const email = String(data.email).trim().toLowerCase();
    const senhaTemporaria = gerarSenhaTemporaria(nome, data.dataNascimento);
    const userRecord = await auth.createUser({ email, password: senhaTemporaria, displayName: nome });

    try {
      await db.doc(`users/${userRecord.uid}`).set({
        nome,
        email,
        dataNascimento: data.dataNascimento,
        role: "admin",
        companyId: String(data.companyId).trim(),
        ativo: true,
        primeiroAcesso: true,
        criadoEm: FieldValue.serverTimestamp(),
        criadoPor: caller.uid,
      });
    } catch (error) {
      await auth.deleteUser(userRecord.uid).catch(() => {});
      throw error;
    }

    return { uid: userRecord.uid, email, nome, senhaTemporaria };
  });
}
