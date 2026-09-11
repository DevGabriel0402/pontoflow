import fs from "node:fs";
import process from "node:process";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const keyIndex = process.argv.indexOf("--key");
if (keyIndex < 0 || !process.argv[keyIndex + 1]) throw new Error("Informe --key.");
const serviceAccount = JSON.parse(fs.readFileSync(process.argv[keyIndex + 1], "utf8"));
const app = initializeApp({ credential: cert(serviceAccount) }, "audit-users");

try {
  const db = getFirestore(app);
  const [usersSnapshot, companiesSnapshot, authPage] = await Promise.all([
    db.collection("users").get(),
    db.collection("companies").get(),
    getAuth(app).listUsers(1000),
  ]);
  const companyNames = new Map(companiesSnapshot.docs.map((doc) => [doc.id, doc.data().nome || doc.data().name || doc.id]));
  const groups = new Map();
  for (const doc of usersSnapshot.docs) {
    const user = doc.data();
    const companyId = user.companyId || "sem_instituicao";
    const group = groups.get(companyId) || { companyId, company: companyNames.get(companyId) || companyId, total: 0, active: 0, inactive: 0 };
    group.total += 1;
    if (user.ativo === false) group.inactive += 1;
    else group.active += 1;
    groups.set(companyId, group);
  }
  const indexedQueries = [];
  for (const group of groups.values()) {
    const snapshot = await db.collection("users")
      .where("companyId", "==", group.companyId)
      .orderBy("nome", "asc")
      .get();
    indexedQueries.push({ companyId: group.companyId, returnedUsers: snapshot.size });
  }
  process.stdout.write(`${JSON.stringify({
    projectId: serviceAccount.project_id,
    firestoreUsers: usersSnapshot.size,
    authUsers: authPage.users.length,
    companies: [...groups.values()].sort((a, b) => b.total - a.total),
    indexedQueries,
  }, null, 2)}\n`);
} finally {
  await deleteApp(app);
}
