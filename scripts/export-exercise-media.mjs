import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const outPath = path.resolve(workspaceRoot, process.argv[2] || 'media/exercise-media-export.json');

function runCapture(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { stdio: ['inherit', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`convex command failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function parseJsonFromStdout(stdout) {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {}
  }
  throw new Error('Could not parse JSON output from convex run');
}

async function main() {
  const stdout = await runCapture([
    'convex',
    'run',
    'media:listExerciseMedia',
    '{}',
  ]);
  const data = parseJsonFromStdout(stdout);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2));
  process.stdout.write(`Wrote ${Array.isArray(data) ? data.length : 0} records to ${path.relative(workspaceRoot, outPath)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

