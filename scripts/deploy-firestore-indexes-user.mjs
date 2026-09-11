import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const projectId = "ponto-eletronico-e974e";
const execute = process.argv.includes("--execute");
const require = createRequire(import.meta.url);
const firebaseToolsRoot = path.join(process.env.APPDATA, "npm", "node_modules", "firebase-tools", "lib");
const { Client } = require(path.join(firebaseToolsRoot, "apiv2.js"));
const auth = require(path.join(firebaseToolsRoot, "auth.js"));
const { requireAuth } = require(path.join(firebaseToolsRoot, "requireAuth.js"));

function normalizedFields(fields) {
  return fields
    .filter((field) => field.fieldPath !== "__name__")
    .map((field) => ({
      fieldPath: field.fieldPath,
      ...(field.order ? { order: field.order } : {}),
      ...(field.arrayConfig ? { arrayConfig: field.arrayConfig } : {}),
    }));
}

function sameIndex(current, desired) {
  return current.collectionGroup === desired.collectionGroup
    && current.queryScope === desired.queryScope
    && JSON.stringify(normalizedFields(current.fields || [])) === JSON.stringify(normalizedFields(desired.fields || []));
}

async function main() {
  const account = auth.getAllAccounts().find((candidate) => candidate.user?.email === "gabriellucas2301@gmail.com");
  if (!account) throw new Error("A conta Firebase esperada não está autenticada.");
  await requireAuth({ project: projectId, user: account.user, tokens: account.tokens });
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
  const base = `/projects/${projectId}/databases/(default)/collectionGroups`;
  const desired = JSON.parse(fs.readFileSync("firestore.indexes.json", "utf8")).indexes || [];
  const response = await client.get(`${base}/-/indexes`);
  const existing = (response.body.indexes || []).map((index) => ({
    collectionGroup: index.name.split("/collectionGroups/")[1]?.split("/indexes/")[0],
    queryScope: index.queryScope,
    fields: index.fields || [],
    state: index.state || "STATE_UNSPECIFIED",
  }));

  const missing = desired.filter((index) => !existing.some((current) => sameIndex(current, index)));
  const states = existing.reduce((counts, index) => {
    counts[index.state] = (counts[index.state] || 0) + 1;
    return counts;
  }, {});
  const pending = existing
    .filter((index) => index.state !== "READY")
    .map((index) => ({ collectionGroup: index.collectionGroup, fields: normalizedFields(index.fields).map((field) => field.fieldPath) }));
  process.stdout.write(`${JSON.stringify({ mode: execute ? "execute" : "check", desired: desired.length, existing: existing.length, missing: missing.length, states, pending }, null, 2)}\n`);
  if (!execute) return;

  let created = 0;
  for (const index of missing) {
    await client.post(`${base}/${encodeURIComponent(index.collectionGroup)}/indexes`, {
      queryScope: index.queryScope,
      fields: index.fields,
    });
    created += 1;
  }
  process.stdout.write(`${JSON.stringify({ result: "completed", created, skipped: desired.length - missing.length }, null, 2)}\n`);
}

main().catch((error) => {
  const status = error.status || error.context?.response?.statusCode || error.context?.body?.error?.code;
  const message = error.context?.body?.error?.message || error.message;
  process.stderr.write(`Falha ao publicar índices${status ? ` (${status})` : ""}: ${message}\n`);
  process.exitCode = 1;
});
