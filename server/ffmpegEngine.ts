import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const SEED_DIR = path.join(UPLOADS_DIR, 'seed');
export const EXPORTS_DIR = path.join(UPLOADS_DIR, 'exports');

export function ensureMediaDirs(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

interface SeedSpec {
  filename: string;
  thumbFilename: string;
  title: string;
  colorA: string;
  colorB: string;
  duration: number;
}

const SEED_SPECS: SeedSpec[] = [
  {
    filename: 'seed-horizons-01.mp4',
    thumbFilename: 'seed-horizons-01.png',
    title: 'HORIZONS D OBSIDIENNE - PLAN 01',
    colorA: '0x0B1528',
    colorB: '0x3978FF',
    duration: 5,
  },
  {
    filename: 'seed-horizons-02.mp4',
    thumbFilename: 'seed-horizons-02.png',
    title: 'HORIZONS D OBSIDIENNE - PLAN 02',
    colorA: '0x121A33',
    colorB: '0xA78BFA',
    duration: 6,
  },
  {
    filename: 'seed-paris-01.mp4',
    thumbFilename: 'seed-paris-01.png',
    title: 'PARIS NOCTURNE - TRAVELLING',
    colorA: '0x0A101F',
    colorB: '0x2563EB',
    duration: 5,
  },
  {
    filename: 'seed-atelier-01.mp4',
    thumbFilename: 'seed-atelier-01.png',
    title: 'ATELIER LUMIERE - PRODUIT',
    colorA: '0x0F172A',
    colorB: '0x60A5FA',
    duration: 4,
  },
];

async function fileExistsNonEmpty(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile() && stat.size > 1024;
  } catch {
    return false;
  }
}

const SEED_VERSION_FILE = '.seed-v2';

export async function ensureSeedMediaFiles(): Promise<void> {
  ensureMediaDirs();
  const versionMarker = path.join(SEED_DIR, SEED_VERSION_FILE);
  const forceRegen = !fs.existsSync(versionMarker);

  for (const spec of SEED_SPECS) {
    const videoPath = path.join(SEED_DIR, spec.filename);
    const tmpVideoPath = path.join(SEED_DIR, `.tmp-${spec.filename}`);
    const thumbPath = path.join(SEED_DIR, spec.thumbFilename);
    const hasVideo = !forceRegen && (await fileExistsNonEmpty(videoPath));
    const hasThumb = !forceRegen && (await fileExistsNonEmpty(thumbPath));

    if (!hasVideo) {
      try {
        // Fast hardware-friendly cinematic multi-band plate (~0.2s per clip) without gradients center-dot artifact
        await execFileAsync('ffmpeg', [
          '-y',
          '-f',
          'lavfi',
          '-i',
          `color=c=${spec.colorA}:s=1280x720:d=${spec.duration}:r=24`,
          '-f',
          'lavfi',
          '-i',
          `anullsrc=channel_layout=stereo:sample_rate=44100`,
          '-vf',
          `drawbox=x=0:y=360:w=1280:h=360:color=${spec.colorB}@0.42:t=fill,drawbox=x=180:y=220:w=920:h=260:color=${spec.colorB}@0.22:t=fill,gblur=sigma=38,vignette=PI/4`,
          '-t',
          String(spec.duration),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'ultrafast',
          '-c:a',
          'aac',
          '-shortest',
          '-movflags',
          '+faststart',
          tmpVideoPath,
        ]);
        await fs.promises.rename(tmpVideoPath, videoPath);
      } catch (err) {
        console.warn('Seed video generation warning:', (err as Error).message);
      }
    }

    if (!hasThumb && (await fileExistsNonEmpty(videoPath))) {
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-ss',
          '0.5',
          '-i',
          videoPath,
          '-vframes',
          '1',
          thumbPath,
        ]);
      } catch (err) {
        console.warn('Seed thumbnail warning:', (err as Error).message);
      }
    }
  }

  if (forceRegen) {
    await fs.promises.writeFile(versionMarker, new Date().toISOString(), 'utf8').catch(() => {});
  }
}

export async function generateThumbnailFromVideo(
  videoPath: string,
  thumbPath: string,
): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      '0.5',
      '-i',
      videoPath,
      '-vframes',
      '1',
      thumbPath,
    ]);
    return await fileExistsNonEmpty(thumbPath);
  } catch {
    return false;
  }
}

export async function upscaleImageWithFfmpeg(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-vf',
    `scale=${width}:${height}:flags=lanczos,unsharp=5:5:0.8:3:3:0.4`,
    outputPath,
  ]);
}

export async function upscaleVideoWithFfmpeg(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-vf',
    `scale=${width}:${height}:flags=lanczos,unsharp=3:3:0.5`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'fast',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
}

export interface AssemblyClipInput {
  videoPath: string;
  audioPath?: string | null;
  durationSeconds: number;
  subtitleText?: string;
}

function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export async function assembleFilmWithFfmpeg(params: {
  clips: AssemblyClipInput[];
  outputPath: string;
  width: number;
  height: number;
  includeSubtitles: boolean;
}): Promise<{ durationSeconds: number; fileSizeBytes: number }> {
  ensureMediaDirs();
  const workDir = path.join(EXPORTS_DIR, `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const normalizedPaths: string[] = [];
    const srtEntries: string[] = [];
    let currentCursor = 0;

    for (let i = 0; i < params.clips.length; i++) {
      const clip = params.clips[i];
      const normPath = path.join(workDir, `seg-${String(i).padStart(4, '0')}.mp4`);
      const hasCustomAudio = clip.audioPath && (await fileExistsNonEmpty(clip.audioPath));

      if (hasCustomAudio && clip.audioPath) {
        await execFileAsync('ffmpeg', [
          '-y',
          '-i',
          clip.videoPath,
          '-i',
          clip.audioPath,
          '-vf',
          `scale=${params.width}:${params.height}:force_original_aspect_ratio=decrease,pad=${params.width}:${params.height}:(ow-iw)/2:(oh-ih)/2,fps=24`,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-t',
          String(clip.durationSeconds),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'ultrafast',
          '-c:a',
          'aac',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-shortest',
          normPath,
        ]);
      } else {
        await execFileAsync('ffmpeg', [
          '-y',
          '-i',
          clip.videoPath,
          '-f',
          'lavfi',
          '-i',
          'anullsrc=channel_layout=stereo:sample_rate=44100',
          '-vf',
          `scale=${params.width}:${params.height}:force_original_aspect_ratio=decrease,pad=${params.width}:${params.height}:(ow-iw)/2:(oh-ih)/2,fps=24`,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-t',
          String(clip.durationSeconds),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'ultrafast',
          '-c:a',
          'aac',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-shortest',
          normPath,
        ]);
      }

      normalizedPaths.push(normPath);

      if (params.includeSubtitles && clip.subtitleText?.trim()) {
        srtEntries.push(
          `${srtEntries.length + 1}\n${formatSrtTime(currentCursor)} --> ${formatSrtTime(
            currentCursor + clip.durationSeconds,
          )}\n${clip.subtitleText.trim()}\n`,
        );
      }
      currentCursor += clip.durationSeconds;
    }

    const concatListPath = path.join(workDir, 'concat.txt');
    const listBody = normalizedPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.promises.writeFile(concatListPath, listBody, 'utf8');

    const rawJoinedPath = path.join(workDir, 'joined.mp4');
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      rawJoinedPath,
    ]);

    if (params.includeSubtitles && srtEntries.length > 0) {
      const srtPath = path.join(workDir, 'subtitles.srt');
      await fs.promises.writeFile(srtPath, srtEntries.join('\n'), 'utf8');
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        rawJoinedPath,
        '-i',
        srtPath,
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        '-c:s',
        'mov_text',
        '-movflags',
        '+faststart',
        params.outputPath,
      ]);
    } else {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        rawJoinedPath,
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        params.outputPath,
      ]);
    }

    const stat = await fs.promises.stat(params.outputPath);
    return {
      durationSeconds: currentCursor,
      fileSizeBytes: stat.size,
    };
  } finally {
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
