import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(root, 'backend');

const pythonCandidates = [
  path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
  path.join(backendDir, '.venv', 'bin', 'python'),
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

const uvicornArgs = [
  '-m',
  'uvicorn',
  'main:app',
  '--reload',
  '--reload-dir',
  'src',
  '--port',
  '8000',
];

const result = spawnSync(python, uvicornArgs, {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
});

process.exit(result.status ?? 1);
