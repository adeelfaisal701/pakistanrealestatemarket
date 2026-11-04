const { randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const path = require("node:path");

if (process.env.NODE_ENV === "production") {
  console.error("The development analytics server cannot run with NODE_ENV=production.");
  process.exit(1);
}

process.env.NODE_ENV = "development";
process.env.ANALYTICS_DEMO_MODE = "true";
process.env.JWT_SECRET = randomBytes(48).toString("hex");

const nestCli = require.resolve("@nestjs/cli/bin/nest");
const child = spawn(process.execPath, [nestCli, "start", "--watch"], {
  cwd: path.resolve(__dirname, ".."),
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Unable to start the Nest development analytics server.", error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
