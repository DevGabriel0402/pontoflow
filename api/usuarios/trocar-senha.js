import { ApiError, handleApi, parseBody, requireFields } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";
import { FieldValue, getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireUser(req);
    const data = parseBody(req);
    requireFields(data, ["novaSenha"]);

    if (String(data.novaSenha).length < 6) {
      throw new ApiError(400, "weak-password", "A nova senha deve ter no minimo 6 caracteres.");
    }
    if (caller.profile.primeiroAcesso !== true) {
      throw new ApiError(403, "permission-denied", "Esta operacao e exclusiva do primeiro acesso.");
    }

    await getAdminAuth().updateUser(caller.uid, { password: data.novaSenha });
    await getAdminDb().doc(`users/${caller.uid}`).update({
      primeiroAcesso: false,
      senhaAlteradaEm: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
}
