import { requireAdmin } from "../_lib/auth.js";
import { BACKUP_COLLECTIONS, serializeSnapshot, serializeValue } from "../_lib/backup.js";
import { getAdminDb } from "../_lib/firebase-admin.js";
import { ApiError, handleApi } from "../_lib/http.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["GET"] }, async () => {
    const caller = await requireAdmin(req);
    const companyId = caller.profile.companyId;
    if (!companyId) throw new ApiError(409, "company-required", "Administrador sem empresa vinculada.");

    const db = getAdminDb();
    const company = await db.doc(`companies/${companyId}`).get();
    const collections = {};

    for (const name of BACKUP_COLLECTIONS) {
      const snapshot = await db.collection(name).where("companyId", "==", companyId).get();
      collections[name] = serializeSnapshot(snapshot);
    }

    // Notificacoes antigas podem nao possuir companyId. Inclui essas entradas pelos usuarios da empresa.
    const userIds = collections.users.map((item) => item.id);
    const notificationIds = new Set(collections.notificacoes.map((item) => item.id));
    for (let index = 0; index < userIds.length; index += 30) {
      const ids = userIds.slice(index, index + 30);
      if (!ids.length) continue;
      const legacy = await db.collection("notificacoes").where("userId", "in", ids).get();
      for (const item of serializeSnapshot(legacy)) {
        if (!notificationIds.has(item.id)) collections.notificacoes.push(item);
        notificationIds.add(item.id);
      }
    }

    return {
      format: "pontoflow-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      companyId,
      company: company.exists ? serializeValue(company.data()) : null,
      collections,
    };
  });
}
