import { requireAdmin } from "../_lib/auth.js";
import { BACKUP_COLLECTIONS, deserializeValue } from "../_lib/backup.js";
import { getAdminDb } from "../_lib/firebase-admin.js";
import { ApiError, handleApi, parseBody, requireFields } from "../_lib/http.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireAdmin(req);
    const body = parseBody(req);
    requireFields(body, ["confirmacao", "backup"]);

    if (body.confirmacao !== "RESTAURAR_BACKUP") {
      throw new ApiError(400, "confirmation-required", "Confirmacao de restauracao invalida.");
    }

    const backup = body.backup;
    const companyId = caller.profile.companyId;
    if (backup?.format !== "pontoflow-backup" || backup?.version !== 1) {
      throw new ApiError(400, "invalid-backup", "Formato de backup nao reconhecido.");
    }
    if (!companyId || backup.companyId !== companyId) {
      throw new ApiError(403, "company-mismatch", "O backup pertence a outra instituicao.");
    }

    const db = getAdminDb();
    const writes = [];
    if (backup.company) {
      writes.push({ ref: db.doc(`companies/${companyId}`), data: deserializeValue(backup.company) });
    }

    for (const collectionName of BACKUP_COLLECTIONS) {
      const documents = backup.collections?.[collectionName] || [];
      for (const document of documents) {
        if (!document?.id || !document?.data) continue;
        const data = deserializeValue(document.data);
        if (collectionName !== "notificacoes" && data.companyId !== companyId) {
          throw new ApiError(400, "invalid-backup", `Registro de ${collectionName} pertence a outra instituicao.`);
        }
        if (collectionName === "notificacoes" && !data.companyId) data.companyId = companyId;
        writes.push({ ref: db.collection(collectionName).doc(document.id), data });
      }
    }

    for (let index = 0; index < writes.length; index += 400) {
      const batch = db.batch();
      for (const write of writes.slice(index, index + 400)) batch.set(write.ref, write.data, { merge: true });
      await batch.commit();
    }

    return { success: true, registrosRestaurados: writes.length };
  });
}
