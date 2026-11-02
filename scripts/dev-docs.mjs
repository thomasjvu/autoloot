import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const home = resolve(root, 'dev-docs');
const runtime = resolve(home, '.papers');
const action = process.argv[2] || 'dev';
if (!['dev', 'build', 'check'].includes(action)) throw new Error('Expected dev, build or check');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(resolve(runtime, 'package.json'))) {
  if (!existsSync(resolve(root, 'documentation/packages/create-papers/index.mjs'))) {
    throw new Error('The local Papers checkout at documentation/ is required. See dev-docs/README.md.');
  }
  run(process.execPath, ['documentation/packages/create-papers/index.mjs', runtime, '--no-install']);
}
// This local framework checkout is isolated from the commerce app and user guides.
rmSync(resolve(runtime, 'src/docs/content'), { recursive: true, force: true });
cpSync(resolve(home, 'content'), resolve(runtime, 'src/docs/content'), { recursive: true });
mkdirSync(resolve(runtime, 'src/docs/content/design'), { recursive: true });
cpSync(resolve(home, 'design.md'), resolve(runtime, 'src/docs/content/design/design.md'));
cpSync(resolve(home, 'documentation-config.js'), resolve(runtime, 'shared/documentation-config.js'));
writeFileSync(resolve(runtime, '.env'), 'VITE_SITE_NAME="Autoloot Dev Docs"\nVITE_SITE_URL="http://localhost:3334"\nVITE_GITHUB_URL=""\nVITE_DEBUG_MODE="false"\nVITE_PAPERS_THEME="autoloot"\n');
let config = readFileSync(resolve(runtime, 'vite.config.ts'), 'utf8');
writeFileSync(resolve(runtime, 'vite.config.ts'), config.replaceAll('port: 3333', 'port: 3334'));
if (!existsSync(resolve(runtime, 'node_modules'))) run('npm', ['ci', '--ignore-scripts'], runtime);
run('npm', ['run', action === 'dev' ? 'dev' : 'build'], runtime);
if (action === 'check') {
  run('npm', ['run', 'docs:check'], runtime);
  run('npm', ['run', 'check:docs-tree'], runtime);
}
