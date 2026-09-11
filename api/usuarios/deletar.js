import { ApiError, handleApi, parseBody, requireFields } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { getAdminAuth, getAdminDb } from "../_lib/firebase-admin.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireAdmin(req);
    const data = parseBody(req);
    requireFields(data, ["uid"]);

    if (data.uid === caller.uid) {
      throw new ApiError(400, "self-delete", "Voce nao pode excluir a propria conta.");
    }

    const db = getAdminDb();
    const target = await db.doc(`users/${data.uid}`).get();
    if (!target.exists) throw new ApiError(404, "not-found", "Usuario nao encontrado.");

    const targetData = target.data();
    if (targetData.companyId !== caller.profile.companyId && caller.profile.isSuperAdmin !== true) {
      throw new ApiError(403, "permission-denied", "Usuario pertence a outra empresa.");
    }
    if (targetData.isSuperAdmin === true) {
      throw new ApiError(403, "permission-denied", "A conta master nao pode ser excluida por esta operacao.");
    }

    await getAdminAuth().deleteUser(data.uid);
    await target.ref.delete();
    return { success: true };
  });
}
