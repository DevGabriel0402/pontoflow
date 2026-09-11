import { handleApi, parseBody, requireFields, ApiError } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { FieldValue, getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";
import { gerarSenhaTemporaria, normalizarJornada, normalizarRole } from "../_lib/users.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireAdmin(req);
    const data = parseBody(req);
    requireFields(data, ["nome", "email", "dataNascimento"]);

    const companyId = caller.profile.companyId;
    if (!companyId || companyId === "default") {
      throw new ApiError(409, "company-required", "O administrador nao possui uma empresa valida.");
    }

    const role = normalizarRole(data.role);
    const email = String(data.email).trim().toLowerCase();
    const nome = String(data.nome).trim();
    const senhaTemporaria = gerarSenhaTemporaria(nome, data.dataNascimento);
    const auth = getAdminAuth();
    const db = getAdminDb();

    const userRecord = await auth.createUser({ email, password: senhaTemporaria, displayName: nome });

    try {
      const userData = {
        nome,
        email,
        dataNascimento: data.dataNascimento,
        role,
        companyId,
        ativo: true,
        status: "novo",
        primeiroAcesso: true,
        criadoEm: FieldValue.serverTimestamp(),
        criadoPor: caller.uid,
      };

      if (data.cargaHorariaSemanal) userData.cargaHorariaSemanal = data.cargaHorariaSemanal;
      if (data.funcao) userData.funcao = String(data.funcao).trim();
      if (data.matricula) userData.matricula = String(data.matricula).trim();
      if (data.jornadas) userData.jornadas = data.jornadas;
      else if (data.jornada) userData.jornada = normalizarJornada(data.jornada);

      await db.doc(`users/${userRecord.uid}`).set(userData, { merge: true });
    } catch (error) {
      await auth.deleteUser(userRecord.uid).catch(() => {});
      throw error;
    }

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      nome,
      senhaTemporaria,
    };
  });
}
