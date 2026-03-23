import { readFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const manifestArg = process.argv[2] || 'media/clips.manifest.json';
const manifestPath = path.resolve(workspaceRoot, manifestArg);

function readClips(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.clips)) return json.clips;
  return [];
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

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  const clips = readClips(parsed);
  const failures = [];
  const missingMediaUrls = [];

  for (const clip of clips) {
    const urls = [clip.mediaGifUrl, clip.mediaMp4Url].filter(Boolean);
    if (!urls.length) {
      missingMediaUrls.push(clip.exerciseName || 'unknown');
      process.stdout.write(`MISSING_URLS ${clip.exerciseName || 'unknown'}\n`);
      continue;
    }
    for (const url of urls) {
      const result = await checkUrl(url);
      if (!result.ok) {
        failures.push({ exerciseName: clip.exerciseName, url, status: result.status });
        process.stdout.write(`FAIL ${result.status} ${clip.exerciseName} ${url}\n`);
      } else {
        process.stdout.write(`OK ${result.status} ${clip.exerciseName} ${url}\n`);
      }
    }
  }

  if (missingMediaUrls.length) {
    process.stderr.write(`Missing mediaGifUrl/mediaMp4Url for ${missingMediaUrls.length} clip(s)\n`);
    process.exit(1);
  }
  if (failures.length) {
    process.stderr.write(`Failed links: ${failures.length}\n`);
    process.exit(1);
  }
  process.stdout.write('All media links passed\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

