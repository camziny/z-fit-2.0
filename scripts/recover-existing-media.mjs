import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const outputDirArg = process.argv[2] || 'media/recovered';
const outputDir = path.resolve(workspaceRoot, outputDirArg);

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout || `command failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

async function checkUrl(url) {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (head.ok) return { ok: true, status: head.status };
    const get = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    return { ok: get.ok, status: get.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function guessExtension(url, contentType) {
  const lowerType = String(contentType || '').toLowerCase();
  if (lowerType.includes('gif')) return 'gif';
  if (lowerType.includes('mp4') || lowerType.includes('video')) return 'mp4';
  if (String(url).toLowerCase().includes('.gif')) return 'gif';
  if (String(url).toLowerCase().includes('.mp4')) return 'mp4';
  return 'bin';
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || '',
  };
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const raw = await runCapture('npx', ['convex', 'run', 'media:listExerciseMedia', '{}']);
  let rows;
  try {
    rows = JSON.parse(raw);
  } catch {
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('could not parse Convex output as JSON');
    }
    rows = JSON.parse(raw.slice(start, end + 1));
  }

  const report = [];
  let aliveCount = 0;
  let downloadedCount = 0;

  for (const row of rows) {
    const exerciseName = row.name || 'unknown';
    const baseSlug = slugify(exerciseName);
    const urls = Array.from(new Set([row.mediaGifUrl, row.mediaMp4Url, row.gifUrl].filter(Boolean)));
    const entry = { exerciseName, urls: [] };

    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      const check = await checkUrl(url);
      const urlInfo = {
        url,
        status: check.status,
        alive: check.ok,
      };
      if (check.ok) {
        aliveCount += 1;
        try {
          const { buffer, contentType } = await download(url);
          const ext = guessExtension(url, contentType);
          const finalPath = path.join(outputDir, `${baseSlug}-${i + 1}.${ext}`);
          await writeFile(finalPath, buffer);
          urlInfo.savedPath = path.relative(workspaceRoot, finalPath);
          urlInfo.contentType = contentType;
          downloadedCount += 1;
          process.stdout.write(`RECOVERED ${exerciseName} -> ${urlInfo.savedPath}\n`);
        } catch (error) {
          urlInfo.downloadError = error instanceof Error ? error.message : String(error);
          process.stdout.write(`ALIVE but download failed ${exerciseName} ${url}\n`);
        }
      } else {
        process.stdout.write(`MISSING ${exerciseName} ${url}\n`);
      }
      entry.urls.push(urlInfo);
    }
    report.push(entry);
  }

  const reportPath = path.join(outputDir, 'recovery-report.json');
  await writeFile(reportPath, JSON.stringify({ totalExercises: report.length, aliveCount, downloadedCount, report }, null, 2));
  process.stdout.write(`Saved recovery report: ${path.relative(workspaceRoot, reportPath)}\n`);
  process.stdout.write(`Alive URLs: ${aliveCount}\n`);
  process.stdout.write(`Downloaded files: ${downloadedCount}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
