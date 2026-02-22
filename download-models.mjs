// download-models.mjs — baixar modelos face-api.js para public/models/
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "public", "models");

fs.mkdirSync(outDir, { recursive: true });

const BASE = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_tiny_model-weights_manifest.json",
    "face_landmark_68_tiny_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2",
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlinkSync(dest);
                download(res.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} para ${url}`));
                return;
            }
            res.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
}

console.log("⬇️  Baixando modelos do face-api.js...\n");

for (const f of FILES) {
    const url = `${BASE}/${f}`;
    const dest = path.join(outDir, f);
    process.stdout.write(`  ${f} ... `);
    try {
        await download(url, dest);
        const size = (fs.statSync(dest).size / 1024).toFixed(0);
        console.log(`✅ ${size}KB`);
    } catch (e) {
        console.log(`❌ ERRO: ${e.message}`);
    }
}

console.log("\n✅ Concluído! Modelos em public/models/");
