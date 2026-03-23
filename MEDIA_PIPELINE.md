# Media Pipeline

Use this workflow to make exercise clips reproducible and permanent.

## Requirements

- `yt-dlp`
- `ffmpeg`
- `node`
- Convex CLI available via `npx convex`

## Files

- `media/clips.manifest.json`
- `scripts/generate-clips.mjs`
- `scripts/check-media-links.mjs`
- `scripts/apply-media-manifest.mjs`
- `scripts/export-exercise-media.mjs`

## Manifest format

`media/clips.manifest.json`

```json
{
  "clips": [
    {
      "exerciseName": "Front Squat",
      "slug": "front-squat",
      "youtubeUrl": "https://www.youtube.com/watch?v=REPLACE_ME",
      "sourceLabel": "Source title",
      "startSec": 32,
      "endSec": 41,
      "crop": "1080:1080:420:0",
      "scaleWidth": 720,
      "gifWidth": 560,
      "gifFps": 12,
      "mediaGifUrl": "https://your-cdn/front-squat.gif",
      "mediaMp4Url": "https://your-cdn/front-squat.mp4",
      "sourceProvider": "youtube"
    }
  ]
}
```

## Generate clips

```bash
npm run media:generate
```

Outputs:

- `media/generated/<slug>.mp4`
- `media/generated/<slug>.gif`
- `media/generated/clips.generated.json`

## Upload to permanent storage

Upload generated files to your storage bucket/CDN and update each clip entry with:

- `mediaGifUrl`
- `mediaMp4Url`

## Convex Storage workflow

If you want to keep everything in Convex instead of an external CDN:

1. Generate files:

```bash
npm run media:generate
```

2. Upload generated files from `media/generated/` to Convex Storage and save source metadata:

```bash
npm run media:upload:convex
```

The upload command uses each clip's `slug` and `exerciseName` from `media/clips.manifest.json` and looks for:

- `media/generated/<slug>.gif`
- `media/generated/<slug>.mp4`

When present, files are uploaded and linked to the matching exercise in Convex by `exerciseName`.
The app receives fresh media URLs from Convex at query time.

## Validate links

```bash
npm run media:check
```

Fails with non-zero exit code if any URL is not reachable.

## Apply media metadata to Convex

```bash
npm run media:apply
```

This updates `exercises` with:

- `mediaGifUrl`
- `mediaMp4Url`
- `mediaSource` metadata (`youtubeUrl`, `startSec`, `endSec`, provider, label)

## Export current media mapping

```bash
npm run media:export
```

Writes current Convex media mappings to `media/exercise-media-export.json`.

