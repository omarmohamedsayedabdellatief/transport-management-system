import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pgCandidates = [
  process.env.PG_BIN,
  "/usr/local/opt/postgresql@17/bin",
  "/opt/homebrew/opt/postgresql@17/bin",
].filter(Boolean);
const pg = pgCandidates.find((dir) => existsSync(path.join(dir, "pg_ctl")));
if (pg && existsSync(path.join(root, ".local/postgres"))) {
  const result = spawnSync(
    path.join(pg, "pg_ctl"),
    ["-D", path.join(root, ".local/postgres"), "status"],
    { stdio: "ignore" },
  );
  if (result.status !== 0) {
    const started = spawnSync(
      path.join(pg, "pg_ctl"),
      [
        "-D",
        path.join(root, ".local/postgres"),
        "-l",
        path.join(root, ".local/postgres.log"),
        "-o",
        "-h 127.0.0.1 -p 55432 -k /tmp",
        "start",
      ],
      { stdio: "inherit" },
    );
    if (started.status !== 0) process.exit(1);
  }
}
const children = [];
function launch(args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (!stopping) {
      stop();
      process.exit(code || 0);
    }
  });
}
let stopping = false;
function stop() {
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
if (process.platform === "win32") {
  try {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `$ports = @(5000, 5173); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } }`,
      ],
      { stdio: "ignore" }
    );
  } catch {}
}

console.log("On Time → http://localhost:5173 · Ctrl+C stops the web services.");
launch(
  ["node_modules/tsx/dist/cli.mjs", "watch", "src/server.ts"],
  path.join(root, "server"),
);
launch(
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--strictPort"],
  path.join(root, "client"),
);
