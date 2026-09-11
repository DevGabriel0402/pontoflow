import fs from "node:fs";
import process from "node:process";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function apiRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

function normalizedFields(fields) {
  return fields
    .filter((field) => field.fieldPath !== "__name__")
    .map((field) => ({
      fieldPath: field.fieldPath,
      ...(field.order ? { order: field.order } : {}),
      ...(field.arrayConfig ? { arrayConfig: field.arrayConfig } : {}),
    }));
}

function sameIndex(left, right) {
  return left.collectionGroup === right.collectionGroup
    && left.queryScope === right.queryScope
    && JSON.stringify(normalizedFields(left.fields)) === JSON.stringify(normalizedFields(right.fields));
}

async function main() {
  const keyPath = argument("--key");
  const execute = process.argv.includes("--execute");
  if (!keyPath) throw new Error("Informe --key.");
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  if (serviceAccount.project_id !== "ponto-eletronico-e974e") throw new Error("Credencial de destino inválida.");

  const app = initializeApp({ credential: cert(serviceAccount) }, "firestore-config-deploy");
  try {
    const accessToken = (await app.options.credential.getAccessToken()).access_token;
    const projectId = serviceAccount.project_id;
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;
    const releaseUrl = `https://firebaserules.googleapis.com/v1/${releaseName}`;
    const indexesBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;

    const [release, indexesResponse, indexPermissions] = await Promise.all([
      apiRequest(releaseUrl, accessToken),
      apiRequest(`${indexesBase}/-/indexes`, accessToken),
      apiRequest(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):testIamPermissions`, accessToken, {
        method: "POST",
        body: JSON.stringify({ permissions: ["datastore.indexes.create", "datastore.indexes.list"] }),
      }),
    ]);

    process.stdout.write(`${JSON.stringify({
      mode: execute ? "execute" : "check",
      rulesApiStatus: release.status,
      indexesApiStatus: indexesResponse.status,
      grantedIndexPermissions: indexPermissions.body.permissions || [],
    }, null, 2)}\n`);

    if (!execute) return;
    if (![200, 404].includes(release.status)) throw new Error(`Sem permissão para regras (${release.status}).`);
    if (!indexesResponse.ok) throw new Error(`Sem permissão para índices (${indexesResponse.status}).`);

    const rulesContent = fs.readFileSync("firestore.rules", "utf8");
    const ruleset = await apiRequest(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rulesContent }] } }),
      }
    );
    if (!ruleset.ok) throw new Error(`Falha ao criar ruleset (${ruleset.status}): ${JSON.stringify(ruleset.body.error || {})}`);

    const releaseResult = release.status === 404
      ? await apiRequest(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, accessToken, {
          method: "POST",
          body: JSON.stringify({ name: releaseName, rulesetName: ruleset.body.name }),
        })
      : await apiRequest(releaseUrl, accessToken, {
          method: "PATCH",
          body: JSON.stringify({
            release: { name: releaseName, rulesetName: ruleset.body.name },
            updateMask: "rulesetName",
          }),
        });
    if (!releaseResult.ok) throw new Error(`Falha ao publicar regras (${releaseResult.status}).`);

    const desiredConfig = JSON.parse(fs.readFileSync("firestore.indexes.json", "utf8"));
    const existing = (indexesResponse.body.indexes || []).map((index) => ({
      collectionGroup: index.name.split("/collectionGroups/")[1]?.split("/indexes/")[0],
      queryScope: index.queryScope,
      fields: index.fields || [],
    }));
    let created = 0;
    let skipped = 0;

    for (const index of desiredConfig.indexes || []) {
      const desired = {
        collectionGroup: index.collectionGroup,
        queryScope: index.queryScope,
        fields: index.fields,
      };
      if (existing.some((current) => sameIndex(current, desired))) {
        skipped += 1;
        continue;
      }
      const result = await apiRequest(`${indexesBase}/${encodeURIComponent(index.collectionGroup)}/indexes`, accessToken, {
        method: "POST",
        body: JSON.stringify({ queryScope: index.queryScope, fields: index.fields }),
      });
      if (!result.ok && result.status !== 409) {
        throw new Error(`Falha ao criar índice de ${index.collectionGroup} (${result.status}): ${JSON.stringify(result.body.error || result.body)}`);
      }
      if (result.status === 409) skipped += 1;
      else created += 1;
    }

    process.stdout.write(`${JSON.stringify({ result: "completed", rulesPublished: true, indexesCreated: created, indexesSkipped: skipped }, null, 2)}\n`);
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
