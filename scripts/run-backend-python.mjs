import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptRel = process.argv[2];
const args = process.argv.slice(3);

if (!scriptRel) {
  console.error('Usage: node scripts/run-backend-python.mjs <script.py> [args...]');
  process.exit(1);
}

const scriptPath = path.join(root, scriptRel);

const pythonCandidates = [
  path.join(root, 'backend', '.venv', 'Scripts', 'python.exe'),
  path.join(root, 'backend', '.venv', 'bin', 'python'),
  'python',
  'python3',
];

const python = pythonCandidates.find((c) => {
  if (c === 'python' || c === 'python3') return true;
  return existsSync(c);
});

if (!python) {
  console.error('[FAIL] Python not found. Run: npm run backend:install');
  process.exit(1);
}

const result = spawnSync(python, [scriptPath, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
});

process.exit(result.status ?? 1);
