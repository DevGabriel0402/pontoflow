import fs from "node:fs";
import process from "node:process";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readServiceAccount(filePath) {
  if (!filePath) throw new Error("Informe os caminhos --source-key e --destination-key.");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function listUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function listDocuments(db) {
  const documents = [];
  const byRootCollection = {};

  async function walkCollection(collection) {
    const snapshot = await collection.get();
    const root = collection.path.split("/")[0];
    byRootCollection[root] = (byRootCollection[root] || 0) + snapshot.size;

    for (const document of snapshot.docs) {
      documents.push({ path: document.ref.path, data: document.data() });
      const children = await document.ref.listCollections();
      for (const child of children) await walkCollection(child);
    }
  }

  const roots = await db.listCollections();
  for (const collection of roots) await walkCollection(collection);
  return { documents, byRootCollection };
}

function migrateReferences(value, destinationDb) {
  if (Array.isArray(value)) return value.map((item) => migrateReferences(item, destinationDb));
  if (Buffer.isBuffer(value) || value instanceof Date) return value;
  if (value && typeof value === "object") {
    if (value.constructor?.name === "DocumentReference" && value.path) {
      return destinationDb.doc(value.path);
    }
    if (["Timestamp", "GeoPoint", "Bytes", "VectorValue"].includes(value.constructor?.name)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, migrateReferences(item, destinationDb)])
    );
  }
  return value;
}

async function copyDocuments(documents, destinationDb) {
  let copied = 0;
  for (let offset = 0; offset < documents.length; offset += 400) {
    const batch = destinationDb.batch();
    for (const document of documents.slice(offset, offset + 400)) {
      batch.set(
        destinationDb.doc(document.path),
        migrateReferences(document.data, destinationDb),
        { merge: true }
      );
    }
    await batch.commit();
    copied += Math.min(400, documents.length - offset);
    process.stdout.write(`Firestore: ${copied}/${documents.length}\n`);
  }
}

async function getHashConfig(sourceApp, projectId) {
  const token = await sourceApp.options.credential.getAccessToken();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );
  if (!response.ok) {
    throw new Error(`Não foi possível obter os parâmetros de hash (${response.status}).`);
  }
  const config = await response.json();
  const hashConfig = config.signIn?.email?.hashConfig || config.signIn?.hashConfig || config.hashConfig || null;
  if (!hashConfig) {
    const available = {
      root: Object.keys(config),
      signIn: Object.keys(config.signIn || {}),
      email: Object.keys(config.signIn?.email || {}),
    };
    throw new Error(`Parâmetros de hash ausentes. Estrutura disponível: ${JSON.stringify(available)}`);
  }
  return hashConfig;
}

function toImportRecord(user) {
  const record = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    disabled: user.disabled,
    phoneNumber: user.phoneNumber,
    customClaims: user.customClaims,
    providerData: user.providerData.map((provider) => ({
      uid: provider.uid,
      providerId: provider.providerId,
      email: provider.email,
      displayName: provider.displayName,
      photoURL: provider.photoURL,
      phoneNumber: provider.phoneNumber,
    })),
  };
  if (user.passwordHash) {
    record.passwordHash = Buffer.isBuffer(user.passwordHash)
      ? user.passwordHash
      : Buffer.from(user.passwordHash, "base64");
  }
  if (user.passwordSalt) {
    record.passwordSalt = Buffer.isBuffer(user.passwordSalt)
      ? user.passwordSalt
      : Buffer.from(user.passwordSalt, "base64");
  }
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

async function copyUsers({ sourceUsers, destinationUsers, sourceApp, sourceProjectId, destinationAuth }) {
  const destinationUids = new Set(destinationUsers.map((user) => user.uid));
  const destinationEmails = new Set(destinationUsers.map((user) => user.email).filter(Boolean));
  const usersToImport = sourceUsers.filter(
    (user) => !destinationUids.has(user.uid) && (!user.email || !destinationEmails.has(user.email))
  );
  const skipped = sourceUsers.length - usersToImport.length;
  if (!usersToImport.length) return { imported: 0, skipped, failed: 0 };

  const hasPasswords = usersToImport.some((user) => user.passwordHash);
  let options;
  if (hasPasswords) {
    const hash = await getHashConfig(sourceApp, sourceProjectId);
    if (!hash?.signerKey) throw new Error("O Firebase antigo não retornou os parâmetros necessários para preservar senhas.");
    options = {
      hash: {
        algorithm: hash.algorithm || "SCRYPT",
        key: Buffer.from(hash.signerKey, "base64"),
        saltSeparator: Buffer.from(hash.saltSeparator || "", "base64"),
        rounds: Number(hash.rounds),
        memoryCost: Number(hash.memoryCost),
      },
    };
  }

  let imported = 0;
  let failed = 0;
  for (let offset = 0; offset < usersToImport.length; offset += 1000) {
    const records = usersToImport.slice(offset, offset + 1000).map(toImportRecord);
    const result = await destinationAuth.importUsers(records, options);
    imported += result.successCount;
    failed += result.failureCount;
    for (const error of result.errors) {
      process.stderr.write(`Falha ao importar usuário no índice ${offset + error.index}: ${error.error.message}\n`);
    }
  }
  return { imported, skipped, failed };
}

async function main() {
  const sourceKey = readServiceAccount(argument("--source-key"));
  const destinationKey = readServiceAccount(argument("--destination-key"));
  const execute = process.argv.includes("--execute");

  if (sourceKey.project_id !== "ponto-flow") throw new Error("A origem não é o projeto ponto-flow.");
  if (destinationKey.project_id !== "ponto-eletronico-e974e") {
    throw new Error("O destino não é o projeto ponto-eletronico-e974e.");
  }

  const sourceApp = initializeApp({ credential: cert(sourceKey) }, "migration-source");
  const destinationApp = initializeApp({ credential: cert(destinationKey) }, "migration-destination");

  try {
    if (process.argv.includes("--check-hash")) {
      const hash = await getHashConfig(sourceApp, sourceKey.project_id);
      process.stdout.write(`${JSON.stringify({
        algorithm: hash.algorithm,
        signerKeyAvailable: Boolean(hash.signerKey),
        saltSeparatorAvailable: hash.saltSeparator !== undefined,
        roundsAvailable: hash.rounds !== undefined,
        memoryCostAvailable: hash.memoryCost !== undefined,
      }, null, 2)}\n`);
      return;
    }

    const sourceAuth = getAuth(sourceApp);
    const destinationAuth = getAuth(destinationApp);

    if (process.argv.includes("--auth-only")) {
      const [sourceUsers, destinationUsers] = await Promise.all([
        listUsers(sourceAuth),
        listUsers(destinationAuth),
      ]);
      const authResult = await copyUsers({
        sourceUsers,
        destinationUsers,
        sourceApp,
        sourceProjectId: sourceKey.project_id,
        destinationAuth,
      });
      const destinationUsersAfter = await listUsers(destinationAuth);
      process.stdout.write(`${JSON.stringify({
        result: "completed",
        sourceUsers: sourceUsers.length,
        destinationUsersBefore: destinationUsers.length,
        destinationUsersAfter: destinationUsersAfter.length,
        auth: authResult,
      }, null, 2)}\n`);
      if (authResult.failed || destinationUsersAfter.length < sourceUsers.length) process.exitCode = 2;
      return;
    }

    const sourceDb = getFirestore(sourceApp);
    const destinationDb = getFirestore(destinationApp);

    const [sourceData, destinationData, sourceUsers, destinationUsers] = await Promise.all([
      listDocuments(sourceDb),
      listDocuments(destinationDb),
      listUsers(sourceAuth),
      listUsers(destinationAuth),
    ]);

    const inventory = {
      mode: execute ? "execute" : "inventory",
      source: {
        projectId: sourceKey.project_id,
        documents: sourceData.documents.length,
        users: sourceUsers.length,
        collections: sourceData.byRootCollection,
      },
      destinationBefore: {
        projectId: destinationKey.project_id,
        documents: destinationData.documents.length,
        users: destinationUsers.length,
        collections: destinationData.byRootCollection,
      },
    };
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);

    if (!execute) return;

    const authResult = await copyUsers({
      sourceUsers,
      destinationUsers,
      sourceApp,
      sourceProjectId: sourceKey.project_id,
      destinationAuth,
    });
    await copyDocuments(sourceData.documents, destinationDb);

    const [destinationAfter, destinationUsersAfter] = await Promise.all([
      listDocuments(destinationDb),
      listUsers(destinationAuth),
    ]);
    const destinationPaths = new Set(destinationAfter.documents.map((document) => document.path));
    const missingDocuments = sourceData.documents.filter((document) => !destinationPaths.has(document.path)).length;

    process.stdout.write(`${JSON.stringify({
      result: "completed",
      auth: authResult,
      firestore: {
        copied: sourceData.documents.length,
        missingAfterVerification: missingDocuments,
      },
      destinationAfter: {
        documents: destinationAfter.documents.length,
        users: destinationUsersAfter.length,
        collections: destinationAfter.byRootCollection,
      },
    }, null, 2)}\n`);

    if (authResult.failed || missingDocuments) process.exitCode = 2;
  } finally {
    await Promise.all([deleteApp(sourceApp), deleteApp(destinationApp)]);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
