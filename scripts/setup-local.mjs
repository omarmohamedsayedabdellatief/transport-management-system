import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args, cwd = root, env = process.env) {
  const r = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Command failed: ${command}`);
}
const pg = [
  process.env.PG_BIN,
  "/usr/local/opt/postgresql@17/bin",
  "/opt/homebrew/opt/postgresql@17/bin",
]
  .filter(Boolean)
  .find((dir) => existsSync(path.join(dir, "pg_ctl")));
if (!pg)
  throw new Error(
    "PostgreSQL 17 is required. Set PG_BIN to its bin directory, or follow the Docker instructions in README.md.",
  );
mkdirSync(path.join(root, ".local"), { recursive: true });
const data = path.join(root, ".local/postgres");
if (!existsSync(path.join(data, "PG_VERSION")))
  run(path.join(pg, "initdb"), [
    "-D",
    data,
    "-U",
    "tms_local",
    "-A",
    "trust",
    "--encoding=UTF8",
    "--locale=C",
  ]);
if (
  spawnSync(path.join(pg, "pg_ctl"), ["-D", data, "status"], {
    stdio: "ignore",
  }).status !== 0
)
  run(path.join(pg, "pg_ctl"), [
    "-D",
    data,
    "-l",
    path.join(root, ".local/postgres.log"),
    "-o",
    "-h 127.0.0.1 -p 55432 -k /tmp",
    "start",
  ]);
const result = spawnSync(
  path.join(pg, "psql"),
  [
    "-h",
    "127.0.0.1",
    "-p",
    "55432",
    "-U",
    "tms_local",
    "-d",
    "postgres",
    "-tAc",
    "SELECT 1 FROM pg_database WHERE datname='tms_db'",
  ],
  { encoding: "utf8" },
);
if (!result.stdout?.trim())
  run(path.join(pg, "createdb"), [
    "-h",
    "127.0.0.1",
    "-p",
    "55432",
    "-U",
    "tms_local",
    "tms_db",
  ]);
const envPath = path.join(root, "server/.env");
if (!existsSync(envPath))
  writeFileSync(
    envPath,
    `PORT=5001\nHOST=127.0.0.1\nNODE_ENV=development\nDATABASE_URL="postgresql://tms_local@127.0.0.1:55432/tms_db"\nJWT_ACCESS_SECRET="${randomBytes(32).toString("hex")}"\nJWT_REFRESH_SECRET="${randomBytes(32).toString("hex")}"\nCLIENT_ORIGIN="http://localhost:5173"\n`,
    { mode: 0o600 },
  );
if (!readFileSync(envPath, "utf8").includes("127.0.0.1:55432/tms_db"))
  throw new Error(
    "An existing custom server/.env was found. It was preserved. Follow manual setup to migrate that database.",
  );
run("npm", ["ci", "--no-audit", "--no-fund"], path.join(root, "server"));
run("npm", ["ci", "--no-audit", "--no-fund"], path.join(root, "client"));
run("npx", ["prisma", "migrate", "deploy"], path.join(root, "server"));
run("npx", ["prisma", "generate"], path.join(root, "server"));
console.log(
  "Local setup is ready. Create an administrator with npm run admin:create, or load examples using npm run demo:seed. Then npm run dev.",
);
