import { ApiError, handleApi } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { getAdminDb } from "../_lib/firebase-admin.js";

async function commitUpdates(db, updates) {
  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    for (const update of updates.slice(index, index + 400)) {
      batch.update(update.ref, update.data);
    }
    await batch.commit();
  }
}

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireAdmin(req);
    const companyId = caller.profile.companyId;
    if (!companyId) throw new ApiError(409, "company-required", "Administrador sem empresa vinculada.");

    const db = getAdminDb();
    const usersSnapshot = await db.collection("users").where("criadoPor", "==", caller.uid).get();
    const updates = [];
    const userIds = [];
    let usersCorrigidos = 0;
    let pontosCorrigidos = 0;

    for (const userDoc of usersSnapshot.docs) {
      userIds.push(userDoc.id);
      if (userDoc.data().companyId !== companyId) {
        updates.push({ ref: userDoc.ref, data: { companyId } });
        usersCorrigidos += 1;
      }
    }

    for (const uid of userIds) {
      const [pontos, bancoHoras] = await Promise.all([
        db.collection("pontos").where("userId", "==", uid).get(),
        db.collection("banco_horas").where("userId", "==", uid).get(),
      ]);

      for (const doc of pontos.docs) {
        if (doc.data().companyId !== companyId) {
          updates.push({ ref: doc.ref, data: { companyId } });
          pontosCorrigidos += 1;
        }
      }
      for (const doc of bancoHoras.docs) {
        if (doc.data().companyId !== companyId) {
          updates.push({ ref: doc.ref, data: { companyId } });
        }
      }
    }

    await commitUpdates(db, updates);
    return { success: true, usersCorrigidos, pontosCorrigidos, companyId };
  });
}
