import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const manifestArg = process.argv[2] || 'media/clips.manifest.json';
const manifestPath = path.resolve(workspaceRoot, manifestArg);

function toMutationPayload(manifestJson) {
  const clips = Array.isArray(manifestJson) ? manifestJson : manifestJson.clips || [];
  return clips.map((clip) => ({
    exerciseName: clip.exerciseName,
    mediaGifUrl: clip.mediaGifUrl,
    mediaMp4Url: clip.mediaMp4Url,
    sourceProvider: clip.sourceProvider || 'youtube',
    youtubeUrl: clip.youtubeUrl,
    sourceLabel: clip.sourceLabel,
    sourceStartSec: clip.startSec,
    sourceEndSec: clip.endSec,
  }));
}

function runConvex(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`convex command failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  const clips = toMutationPayload(parsed);
  if (!clips.length) {
    throw new Error('No clips found in manifest');
  }
  const missingMediaUrls = clips.filter((clip) => !clip.mediaGifUrl && !clip.mediaMp4Url);
  if (missingMediaUrls.length) {
    const names = missingMediaUrls.map((clip) => clip.exerciseName).join(', ');
    throw new Error(
      `Missing media URLs for ${missingMediaUrls.length} clip(s): ${names}. Add mediaGifUrl and/or mediaMp4Url before applying.`
    );
  }

  await runConvex([
    'convex',
    'run',
    'media:applyExerciseMediaManifest',
    JSON.stringify({ clips }),
  ]);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

