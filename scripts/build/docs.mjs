import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "../..");
const [kind = "user", action = "dev"] = process.argv.slice(2);
if (
  !["user", "dev"].includes(kind) ||
  !["dev", "build", "check", "prepare"].includes(action)
)
  throw Error("Usage: node scripts/build/docs.mjs <user|dev> <dev|build|check>");
const source = resolve(root, "docs", kind),
  runtime = resolve(root, "docs/.papers", kind);
const expected = JSON.parse(
  readFileSync(resolve(source, "papers.lock.json"), "utf8"),
);
function run(command, args, cwd = runtime, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(resolve(runtime, "package.json"))) {
  const temporary = mkdtempSync(resolve(tmpdir(), "autoloot-papers-"));
  try {
    const checkout = resolve(temporary, "upstream");
    mkdirSync(checkout);
    run("git", ["init", "-q"], checkout);
    run(
      "git",
      ["fetch", "--depth=1", expected.repository, expected.commit],
      checkout,
    );
    const archive = execFileSync("git", ["archive", "FETCH_HEAD"], {
      cwd: checkout,
      maxBuffer: 128 * 1024 * 1024,
    });
    writeFileSync(resolve(temporary, "papers.tar"), archive);
    run("tar", ["-xf", resolve(temporary, "papers.tar")], checkout);
    mkdirSync(resolve(root, "docs/.papers"), { recursive: true });
    run(
      process.execPath,
      [
        resolve(checkout, "packages/create-papers/index.mjs"),
        runtime,
        "--no-install",
      ],
      root,
      { ...process.env, PAPERS_TEMPLATE_ROOT: checkout },
    );
    // Explicit work-tree prevents Git from silently skipping paths when this
    // ignored runtime is nested inside the application's repository.
    const patchArgs = [
      `--git-dir=${resolve(checkout, ".git")}`,
      `--work-tree=${runtime}`,
      "apply",
    ];
    run("git", [...patchArgs, "--check", resolve(root, "docs/runtime.patch")]);
    run("git", [...patchArgs, resolve(root, "docs/runtime.patch")]);
    cpSync(
      resolve(root, "docs/runtime-package.json"),
      resolve(runtime, "package.json"),
    );
    cpSync(
      resolve(root, "docs/runtime-package-lock.json"),
      resolve(runtime, "package-lock.json"),
    );
    cpSync(
      resolve(source, "papers.lock.json"),
      resolve(runtime, "papers.lock.json"),
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
const actual = JSON.parse(
  readFileSync(resolve(runtime, "papers.lock.json"), "utf8"),
);
if (actual.commit !== expected.commit)
  throw Error(
    `Papers runtime must match docs/${kind}/papers.lock.json. Upgrade with the supported Papers updater.`,
  );
rmSync(resolve(runtime, "src/docs/content"), { recursive: true, force: true });
cpSync(resolve(source, "content"), resolve(runtime, "src/docs/content"), {
  recursive: true,
});
if (kind === "dev") {
  mkdirSync(resolve(runtime, "src/docs/content/design"), { recursive: true });
  cpSync(
    resolve(source, "design.md"),
    resolve(runtime, "src/docs/content/design/design.md"),
  );
}
cpSync(
  resolve(source, "documentation-config.js"),
  resolve(runtime, "shared/documentation-config.js"),
);
cpSync(resolve(root, "docs/theme"), resolve(runtime, "themes/autoloot"), {
  recursive: true,
});
const registryPath = resolve(runtime, "themes/registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
if (!registry.themes.some((theme) => theme.id === "autoloot")) {
  registry.themes.push({
    id: "autoloot",
    name: "Autoloot",
    path: "autoloot",
    description: "Autoloot documentation theme",
  });
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
cpSync(
  resolve(root, "docs/agent-guidance.md"),
  resolve(runtime, "agent-guidance.md"),
);
if (kind === "dev")
  cpSync(resolve(root, "docs/user/public"), resolve(runtime, "public"), {
    recursive: true,
  });
if (existsSync(resolve(source, "public")))
  cpSync(resolve(source, "public"), resolve(runtime, "public"), {
    recursive: true,
  });
const port = kind === "user" ? 3333 : 3334;
writeFileSync(
  resolve(runtime, ".env"),
  [
    `VITE_SITE_NAME="Autoloot${kind === "dev" ? " Dev Docs" : ""}"`,
    `VITE_SITE_URL="http://localhost:${port}"`,
    'VITE_GITHUB_URL=""',
    'VITE_DEBUG_MODE="false"',
    'VITE_PAPERS_THEME="autoloot"',
    "",
  ].join(String.fromCharCode(10)),
);
const config = readFileSync(resolve(runtime, "vite.config.ts"), "utf8");
writeFileSync(
  resolve(runtime, "vite.config.ts"),
  config.replace(/port: 333[34]/g, `port: ${port}`),
);
if (!existsSync(resolve(runtime, "node_modules")))
  run("npm", ["ci", "--ignore-scripts"]);
if (action === "prepare") process.exit(0);
run("npm", ["run", action === "dev" ? "dev" : "build"]);
if (action === "check") {
  run("npm", ["run", "docs:check"]);
  run("npm", ["run", "check:docs-tree"]);
}
