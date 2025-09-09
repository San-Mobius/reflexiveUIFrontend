import fs from "fs";
import path from "path";
import { CDN_TOKEN } from "./env.js";

const API_URL = "https://ig.gov-cloud.ai/mobius-content-service/v1.0/content/upload";
const AUTH_TOKEN = CDN_TOKEN; // Bearer token in env

const arg = process.argv[2]; // "js" or "html"

const filesToUpload = [
  { file: "index.html", filePath: "MAC", contentTags: "html" },
  { file: "script.js", filePath: "MAC", contentTags: "js" }
];

async function uploadFile({ file, filePath, contentTags }) {
  const form = new FormData();

  // In Node 18+, FormData supports Blob/File
  const fileBuffer = fs.readFileSync(path.resolve(file));
  const blob = new Blob([fileBuffer]); // wrap buffer in Blob
  form.append("file", blob, file);

  const url = `${API_URL}?filePath=${filePath}&contentTags=${contentTags}`;

  try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      return response.json();
  } catch (err) {
      throw new Error(`Network error: ${err.message}`);
  }

}

async function build() {
  const logStream = fs.createWriteStream("log.txt", { flags: "a" });
  logStream.write(`\n--- Build started at ${new Date().toISOString()} ---\n`);

  if (arg === "js" || arg === "html") {
    const file = filesToUpload.find(f => f.contentTags === arg);
    try {
        const result = await uploadFile(file);
        logStream.write(`✅ Uploaded ${file.file} → https://cdn.gov-cloud.ai${result.cdnUrl}\n`);
    } catch (err) {
        logStream.write(`❌ Failed ${file.file} → ${err.message}\n`);
    }
  } else {
    for (const fileConfig of filesToUpload) {
        try {
            const result = await uploadFile(fileConfig);
            logStream.write(`✅ Uploaded ${fileConfig.file} → https://cdn.gov-cloud.ai${result.cdnUrl}\n`);
        } catch (err) {
            logStream.write(`❌ Failed ${fileConfig.file} → ${err.message}\n`);
        }
    }
  }

  logStream.write(`--- Build finished at ${new Date().toISOString()} ---\n`);
  logStream.end();
}

build().catch(err => console.error("Build error:", err));
