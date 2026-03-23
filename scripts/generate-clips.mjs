import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const manifestArg = process.argv[2] || 'media/clips.manifest.json';
const outputDirArg = process.argv[3] || 'media/generated';
const manifestPath = path.resolve(workspaceRoot, manifestArg);
const outputDir = path.resolve(workspaceRoot, outputDirArg);
const tempDir = path.resolve(workspaceRoot, '.cache', 'clip-sources');
const ytDlpBin = process.env.YT_DLP_BIN || 'yt-dlp';
const ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';

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

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function readManifest(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.clips)) return json.clips;
  return [];
}

function validateClip(clip, index) {
  if (!clip.exerciseName) throw new Error(`clips[${index}] missing exerciseName`);
  if (!clip.youtubeUrl) throw new Error(`clips[${index}] missing youtubeUrl`);
  if (String(clip.youtubeUrl).includes('REPLACE_ME')) {
    throw new Error(
      `clips[${index}] (${clip.exerciseName}) has placeholder youtubeUrl. Replace REPLACE_ME with a real YouTube video ID or URL.`
    );
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(String(clip.youtubeUrl));
  } catch {
    throw new Error(`clips[${index}] (${clip.exerciseName}) has invalid youtubeUrl`);
  }
  const host = parsedUrl.hostname.toLowerCase();
  const isYouTubeHost =
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be';
  if (!isYouTubeHost) {
    throw new Error(`clips[${index}] (${clip.exerciseName}) youtubeUrl must be a youtube.com or youtu.be URL`);
  }
  if (typeof clip.startSec !== 'number') throw new Error(`clips[${index}] missing numeric startSec`);
  if (typeof clip.endSec !== 'number') throw new Error(`clips[${index}] missing numeric endSec`);
  if (clip.endSec <= clip.startSec) throw new Error(`clips[${index}] endSec must be greater than startSec`);
}

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  const clips = readManifest(parsed);

  if (!clips.length) {
    throw new Error(`No clips found in ${manifestPath}`);
  }

  await mkdir(outputDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });

  const generated = [];

  for (let i = 0; i < clips.length; i += 1) {
    const clip = clips[i];
    validateClip(clip, i);

    const slug = slugify(clip.slug || clip.exerciseName || `clip-${i + 1}`);
    const sourcePath = path.join(tempDir, `${slug}.source.mp4`);
    const mp4Path = path.join(outputDir, `${slug}.mp4`);
    const gifPath = path.join(outputDir, `${slug}.gif`);

    if (!(await exists(sourcePath))) {
      await run(
        ytDlpBin,
        [
          '-f',
          'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
          '--merge-output-format',
          'mp4',
          '--no-playlist',
          '-o',
          sourcePath,
          clip.youtubeUrl,
        ],
        `yt-dlp ${clip.exerciseName}`
      );
    }

    const vfParts = [];
    if (clip.crop) vfParts.push(`crop=${clip.crop}`);
    if (clip.scaleWidth) vfParts.push(`scale=${clip.scaleWidth}:-2:flags=lanczos`);
    const mp4Args = [
      '-y',
      '-ss',
      String(clip.startSec),
      '-to',
      String(clip.endSec),
      '-i',
      sourcePath,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      String(clip.crf ?? 24),
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
    ];
    if (vfParts.length) {
      mp4Args.push('-vf', vfParts.join(','));
    }
    mp4Args.push(mp4Path);

    await run(ffmpegBin, mp4Args, `ffmpeg mp4 ${clip.exerciseName}`);

    const gifWidth = clip.gifWidth || clip.scaleWidth || 560;
    const gifFps = clip.gifFps || 12;
    const gifArgs = [
      '-y',
      '-i',
      mp4Path,
      '-vf',
      `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos`,
      '-loop',
      '0',
      gifPath,
    ];
    await run(ffmpegBin, gifArgs, `ffmpeg gif ${clip.exerciseName}`);

    generated.push({
      exerciseName: clip.exerciseName,
      slug,
      youtubeUrl: clip.youtubeUrl,
      sourceLabel: clip.sourceLabel,
      startSec: clip.startSec,
      endSec: clip.endSec,
      mediaMp4Path: path.relative(workspaceRoot, mp4Path),
      mediaGifPath: path.relative(workspaceRoot, gifPath),
    });
  }

  const outManifestPath = path.join(outputDir, 'clips.generated.json');
  await writeFile(outManifestPath, JSON.stringify({ clips: generated }, null, 2));
  process.stdout.write(`Generated ${generated.length} clips\n`);
  process.stdout.write(`Manifest: ${path.relative(workspaceRoot, outManifestPath)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

