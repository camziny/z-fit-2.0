import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const manifestArg = process.argv[2] || 'media/clips.manifest.json';
const generatedDirArg = process.argv[3] || 'media/generated';
const manifestPath = path.resolve(workspaceRoot, manifestArg);
const generatedDir = path.resolve(workspaceRoot, generatedDirArg);

function readClips(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.clips)) return json.clips;
  return [];
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runCapture(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
      else reject(new Error(stderr || stdout || `convex command failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function extractJsonObject(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not parse JSON output');
  }
  return JSON.parse(output.slice(start, end + 1));
}

async function getConvexUrl() {
  const specOutput = await runCapture(['convex', 'function-spec']);
  const parsed = extractJsonObject(specOutput);
  if (!parsed.url) throw new Error('Could not determine Convex deployment URL');
  return parsed.url;
}

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  const clips = readClips(parsed);
  if (!clips.length) {
    throw new Error('No clips found in manifest');
  }
  const convexUrl = await getConvexUrl();
  const { ConvexHttpClient } = await import('convex/browser');
  const client = new ConvexHttpClient(convexUrl);

  let uploadedFiles = 0;
  for (const clip of clips) {
    const slug = slugify(clip.slug || clip.exerciseName);
    const gifPath = path.join(generatedDir, `${slug}.gif`);
    const mp4Path = path.join(generatedDir, `${slug}.mp4`);
    const hasGif = await exists(gifPath);
    const hasMp4 = await exists(mp4Path);

    if (!hasGif && !hasMp4) {
      throw new Error(`No generated files found for ${clip.exerciseName} (${slug})`);
    }

    if (hasGif) {
      const gifBase64 = (await readFile(gifPath)).toString('base64');
      const gifResult = await client.action('media:uploadExerciseMediaFile', {
        exerciseName: clip.exerciseName,
        fileKind: 'gif',
        fileBase64: gifBase64,
      });
      process.stdout.write(`Uploaded GIF for ${clip.exerciseName}: ${gifResult.storageId}\n`);
      uploadedFiles += 1;
    }

    if (hasMp4) {
      const mp4Base64 = (await readFile(mp4Path)).toString('base64');
      const mp4Result = await client.action('media:uploadExerciseMediaFile', {
        exerciseName: clip.exerciseName,
        fileKind: 'mp4',
        fileBase64: mp4Base64,
      });
      process.stdout.write(`Uploaded MP4 for ${clip.exerciseName}: ${mp4Result.storageId}\n`);
      uploadedFiles += 1;
    }

    await client.mutation('media:setExerciseMediaSource', {
      exerciseName: clip.exerciseName,
      sourceProvider: clip.sourceProvider || 'youtube',
      youtubeUrl: clip.youtubeUrl,
      sourceLabel: clip.sourceLabel,
      sourceStartSec: clip.startSec,
      sourceEndSec: clip.endSec,
    });
    process.stdout.write(`Updated source metadata for ${clip.exerciseName}\n`);
  }

  process.stdout.write(`Uploaded ${uploadedFiles} media file(s) to Convex Storage\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
