// Windows-only convenience launcher for this isolated, non-sending development workspace.
// No installer, Windows service, remote connection, or credential output.
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { MongoClient } = require("mongodb");
const { config, validateConfig } = require("../config");

const root = path.resolve(__dirname, "../..");
const local = path.join(root, ".local");
const expectedUri = "mongodb://127.0.0.1:27018/outreach_v2_dev";
function startChild(name, executable, args) {
  const output = fs.openSync(path.join(local, name + ".stdout.log"), "a");
  const errors = fs.openSync(path.join(local, name + ".stderr.log"), "a");
  const child = spawn(executable, args, { cwd: root, detached: true, windowsHide: true,
    stdio: ["ignore", output, errors] });
  fs.closeSync(output);
  fs.closeSync(errors);
  child.on("error", (error) => console.error(name + " failed: " + error.message));
  child.unref();
  fs.writeFileSync(path.join(local, name + ".pid"), String(child.pid));
}
async function pingDatabase() {
  const client = new MongoClient(expectedUri, { serverSelectionTimeoutMS: 500, connectTimeoutMS: 500 });
  try { await client.connect(); await client.db().command({ ping: 1 }); return true; }
  catch { return false; }
  finally { await client.close(); }
}
async function pingHttp(url, check) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return response.ok && await check(response);
  } catch { return false; }
}
async function waitFor(check, label) {
  for (let count = 0; count < 30; count++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(label + " did not become ready. Inspect the logs in .local.");
}
async function main() {
  process.chdir(root);
  if (process.platform !== "win32") throw new Error("This portable launcher targets Windows. Use the standard development commands on other systems.");
  validateConfig();
  if (config.databaseUri !== expectedUri || config.port !== 5000 || config.host !== "127.0.0.1" ||
    config.sendingEnabled || config.jobsEnabled || config.aiEnabled || config.provider !== "disabled") {
    throw new Error("local:up requires the isolated localhost:27018 development database and all integrations disabled.");
  }
  fs.mkdirSync(local, { recursive: true });
  if (!await pingDatabase()) {
    const runtime = path.join(local, "mongodb/runtime");
    const candidates = fs.existsSync(runtime) ? fs.readdirSync(runtime)
      .map((name) => path.join(runtime, name, "bin/mongod.exe")).filter((file) => fs.existsSync(file)) : [];
    if (candidates.length !== 1) throw new Error("Expected one official portable mongod.exe in .local/mongodb/runtime. See README.");
    const data = path.join(local, "mongodb/data");
    fs.mkdirSync(data, { recursive: true });
    startChild("mongodb", candidates[0], ["--dbpath", data, "--logpath", path.join(local, "mongodb/mongod.log"),
      "--logappend", "--bind_ip", "127.0.0.1", "--port", "27018", "--setParameter", "diagnosticDataCollectionEnabled=false"]);
    await waitFor(pingDatabase, "MongoDB");
  }
  const backendReady = () => pingHttp("http://127.0.0.1:5000/health", async (response) => (await response.json()).status === "ready");
  if (!await backendReady()) {
    startChild("backend", process.execPath, ["server/index.js"]);
    await waitFor(backendReady, "Backend");
  }
  const frontendReady = () => pingHttp("http://127.0.0.1:5173/", async (response) => (await response.text()).includes("GET Logistics"));
  if (!await frontendReady()) {
    startChild("frontend", process.execPath, ["client/node_modules/vite/bin/vite.js", "client", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]);
    await waitFor(frontendReady, "Frontend");
  }
  console.log("Local workspace: http://127.0.0.1:5173/");
  console.log("Database: localhost:27018/outreach_v2_dev");
  console.log("Sending, scheduled jobs, and AI: disabled.");
  console.log("Local login details: .local/dev-access.json (keep private; never commit).");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
