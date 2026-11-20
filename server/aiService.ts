import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import type { Language } from '../src/shared/types';
import { UPLOADS_DIR, ensureMediaDirs, generateThumbnailFromVideo } from './ffmpegEngine';

function getAiClient(timeoutMs = 30000, apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Clé API Gemini non configurée côté serveur. Veuillez vérifier Settings > Secrets (GEMINI_API_KEY).',
    );
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`TIMEOUT: ${timeoutMessage}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function formatGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let message = raw;
  let statusCode = 0;

  // Unwrap SDK JSON error strings like '{"error":{"code":503,"message":"..."}}'
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        statusCode = Number(parsed.error.code || 0);
        if (parsed.error.message) {
          message = parsed.error.message;
        }
      }
    } catch {
      // Keep raw message if not JSON
    }
  }

  if (
    message.includes('TIMEOUT:') ||
    message.includes('AbortError') ||
    message.includes('aborted') ||
    message.includes('Deadline expired')
  ) {
    return message.startsWith('TIMEOUT:')
      ? message.replace(/^TIMEOUT:\s*/, '')
      : 'Le service IA est temporairement surchargé (délai expiré). Veuillez réessayer dans un instant.';
  }
  if (
    statusCode === 503 ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('503')
  ) {
    return 'Le modèle IA est temporairement très sollicité (503). Veuillez réessayer dans quelques secondes.';
  }
  if (
    statusCode === 403 ||
    (statusCode === 400 && raw.includes('API_KEY_INVALID')) ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID')
  ) {
    return 'Clé API invalide ou modèle payant requis : vérifiez votre clé dans Settings > Secrets.';
  }
  if (statusCode === 429 || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return 'Quota API dépassé ou modèle réservé à un palier facturable (Settings > Secrets).';
  }
  if (statusCode === 404 || raw.includes('NOT_FOUND') || raw.includes('404')) {
    return `Modèle introuvable ou non disponible sur cette clé : ${message}`;
  }
  return message;
}

function isTransientHighDemandError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('TIMEOUT:') ||
    msg.includes('aborted')
  );
}

async function generateJsonWithFallback(params: {
  contents: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  timeoutMessage: string;
}): Promise<string> {
  const ai = getAiClient(params.timeoutMs);
  const candidates: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastErr: unknown;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    try {
      const response = await withTimeout(
        (abortSignal) =>
          ai.models.generateContent({
            model: candidate.model,
            contents: params.contents,
            config: {
              abortSignal,
              thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
              responseMimeType: 'application/json',
              responseSchema: params.schema as never,
            },
          }),
        params.timeoutMs,
        params.timeoutMessage,
      );
      return (response.text ?? '{}').trim();
    } catch (err) {
      lastErr = err;
      if (i < candidates.length - 1 && isTransientHighDemandError(err)) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function analyzePromptWithOrchestrator(params: {
  prompt: string;
  mode: string;
  durationSeconds: number;
  resolution: string;
  style: string;
  language: Language;
}): Promise<{
  enhancedPrompt: string;
  cameraSuggestion: string;
  lightingSuggestion: string;
  recommendedModelId: string;
  rationale: string;
}> {
  const langLabel = params.language === 'fr' ? 'French' : 'English';

  const jsonText = await generateJsonWithFallback({
    contents: `Analyze and enrich this audiovisual production prompt for NOVA MOTION AI.
Mode: ${params.mode}
Duration: ${params.durationSeconds}s (max 15s)
Target Resolution: ${params.resolution}
Visual Style: ${params.style}
User Prompt: "${params.prompt}"

Respond in JSON with:
- enhancedPrompt: rich, vivid, production-ready cinematic prompt in English (for video/image model fidelity) preserving every user intent.
- cameraSuggestion: concise camera movement in ${langLabel}.
- lightingSuggestion: concise lighting mood in ${langLabel}.
- recommendedModelId: one of ["gemini-omni-video", "runway-gen4-adapter", "sora-cinema-adapter", "kling-luma-adapter", "gemini-flash-image", "nano-banana-pro"].
- rationale: 1 concise sentence in ${langLabel} explaining why this setup maximizes visual quality and credit efficiency.`,
    schema: {
      type: Type.OBJECT,
      properties: {
        enhancedPrompt: { type: Type.STRING },
        cameraSuggestion: { type: Type.STRING },
        lightingSuggestion: { type: Type.STRING },
        recommendedModelId: { type: Type.STRING },
        rationale: { type: Type.STRING },
      },
      required: ['enhancedPrompt', 'cameraSuggestion', 'lightingSuggestion', 'recommendedModelId', 'rationale'],
    },
    timeoutMs: 25000,
    timeoutMessage: "L'orchestrateur IA n'a pas répondu dans le délai imparti (25s). Vérifiez la connexion ou la clé Gemini.",
  });

  const parsed = JSON.parse(jsonText);
  return {
    enhancedPrompt: parsed.enhancedPrompt || params.prompt,
    cameraSuggestion: parsed.cameraSuggestion || 'Travelling avant fluide',
    lightingSuggestion: parsed.lightingSuggestion || 'Éclairage cinématographique équilibré',
    recommendedModelId: parsed.recommendedModelId || 'gemini-omni-video',
    rationale: parsed.rationale || 'Sélection optimisée par Nova Orchestrator.',
  };
}

export async function generateFilmPlanWithAI(params: {
  title: string;
  genre: string;
  targetMinutes: number;
  idea: string;
  language: Language;
}): Promise<{
  synopsis: string;
  characters: Array<{ name: string; role: string; physicalTraits: string; costume: string; voiceStyle: string }>;
  locations: Array<{ name: string; atmosphere: string; lighting: string; continuityNotes: string }>;
  scenes: Array<{
    chapterTitle: string;
    title: string;
    visualPrompt: string;
    dialogue: string;
    speakerName: string;
    cameraMovement: string;
    framing: string;
    lightingMood: string;
    durationSeconds: number;
  }>;
}> {
  const langName = params.language === 'fr' ? 'French' : 'English';
  const sampleSceneCount = Math.min(8, Math.max(4, Math.ceil(params.targetMinutes / 2)));

  const jsonText = await generateJsonWithFallback({
    contents: `You are NOVA FILM ENGINE, a senior film director and cinematographer.
Develop a cohesive Cinema Bible and technical shot breakdown in ${langName} for:
Title: "${params.title}"
Genre: "${params.genre}"
Target Final Film Duration: ${params.targetMinutes} minutes (note: each individual AI video shot is strictly capped between 5s and 15s).
Initial Idea: "${params.idea}"

Create:
- synopsis: 2-3 sentence narrative arc in ${langName}.
- characters: 2 to 3 recurring characters with consistent physical traits, costume, and voice style.
- locations: 2 to 3 recurring locations with lighting & continuity rules.
- scenes: ${sampleSceneCount} key narrative shots (each durationSeconds strictly between 5 and 15) representing the opening & key acts of the film, with vivid visualPrompt, natural dialogue, speakerName, cameraMovement, framing, and lightingMood.`,
    schema: {
      type: Type.OBJECT,
      properties: {
        synopsis: { type: Type.STRING },
        characters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              physicalTraits: { type: Type.STRING },
              costume: { type: Type.STRING },
              voiceStyle: { type: Type.STRING },
            },
            required: ['name', 'role', 'physicalTraits', 'costume', 'voiceStyle'],
          },
        },
        locations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              atmosphere: { type: Type.STRING },
              lighting: { type: Type.STRING },
              continuityNotes: { type: Type.STRING },
            },
            required: ['name', 'atmosphere', 'lighting', 'continuityNotes'],
          },
        },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapterTitle: { type: Type.STRING },
              title: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
              dialogue: { type: Type.STRING },
              speakerName: { type: Type.STRING },
              cameraMovement: { type: Type.STRING },
              framing: { type: Type.STRING },
              lightingMood: { type: Type.STRING },
              durationSeconds: { type: Type.INTEGER },
            },
            required: [
              'chapterTitle',
              'title',
              'visualPrompt',
              'dialogue',
              'speakerName',
              'cameraMovement',
              'framing',
              'lightingMood',
              'durationSeconds',
            ],
          },
        },
      },
      required: ['synopsis', 'characters', 'locations', 'scenes'],
    },
    timeoutMs: 45000,
    timeoutMessage: 'La génération du découpage film a expiré (45s). Veuillez réessayer.',
  });

  const parsed = JSON.parse(jsonText);
  const clampedScenes = (parsed.scenes ?? []).map((s: Record<string, unknown>) => ({
    chapterTitle: String(s.chapterTitle ?? 'Acte I'),
    title: String(s.title ?? 'Séquence'),
    visualPrompt: String(s.visualPrompt ?? params.idea),
    dialogue: String(s.dialogue ?? ''),
    speakerName: String(s.speakerName ?? ''),
    cameraMovement: String(s.cameraMovement ?? 'Travelling lent'),
    framing: String(s.framing ?? 'Plan large'),
    lightingMood: String(s.lightingMood ?? 'Cinématographique'),
    durationSeconds: Math.max(5, Math.min(15, Number(s.durationSeconds ?? 8))),
  }));

  return {
    synopsis: parsed.synopsis || params.idea,
    characters: parsed.characters || [],
    locations: parsed.locations || [],
    scenes: clampedScenes,
  };
}

export async function checkFilmCoherenceWithAI(params: {
  projectTitle: string;
  characters: Array<{ name: string; physicalTraits: string; costume: string }>;
  locations: Array<{ name: string; lighting: string; continuityNotes: string }>;
  scenes: Array<{ orderIndex: number; title: string; visualPrompt: string; lightingMood: string; durationSeconds: number }>;
  language: Language;
}): Promise<{
  statusLabel: string;
  issues: string[];
  recommendations: string[];
}> {
  const langName = params.language === 'fr' ? 'French' : 'English';

  const jsonText = await generateJsonWithFallback({
    contents: `Review cinematographic continuity for "${params.projectTitle}".
Characters: ${JSON.stringify(params.characters)}
Locations: ${JSON.stringify(params.locations)}
Ordered Scenes: ${JSON.stringify(params.scenes)}

Check character costume/trait consistency, lighting transitions, and shot duration rules (<=15s per shot). Respond in ${langName} JSON.`,
    schema: {
      type: Type.OBJECT,
      properties: {
        statusLabel: { type: Type.STRING },
        issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['statusLabel', 'issues', 'recommendations'],
    },
    timeoutMs: 25000,
    timeoutMessage: "L'audit de cohérence IA a expiré (25s).",
  });

  const parsed = JSON.parse(jsonText);
  return {
    statusLabel: parsed.statusLabel || 'Vérification terminée',
    issues: parsed.issues || [],
    recommendations: parsed.recommendations || [],
  };
}

export async function generateSpeechAudioWithAI(params: {
  text: string;
  voiceName: string;
  style: string;
  multiSpeaker?: boolean;
  secondSpeakerText?: string;
  secondVoiceName?: string;
}): Promise<{ fileUrl: string; filePath: string; fileSizeBytes: number }> {
  ensureMediaDirs();
  const ai = getAiClient(45000, 'v1beta');

  const useFlagship = Boolean(params.multiSpeaker && params.secondSpeakerText?.trim());
  const model = useFlagship ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';

  const interaction = await withTimeout(
    (signal) =>
      ai.interactions.create(
        {
          model,
          input: useFlagship
            ? [
                {
                  type: 'text',
                  text: `Speaker1: ${params.text}`,
                  annotations: [
                    {
                      type: 'speech_metadata',
                      speaker: 'Speaker1',
                      style: params.style || 'Cinematic voice',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: `Speaker2: ${params.secondSpeakerText}`,
                  annotations: [
                    {
                      type: 'speech_metadata',
                      speaker: 'Speaker2',
                      style: 'Responding character',
                    },
                  ],
                },
              ]
            : [
                {
                  type: 'text',
                  text: params.text,
                  annotations: [
                    {
                      type: 'speech_metadata',
                      style: params.style || 'Clear cinematic narration',
                    },
                  ],
                },
              ],
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: useFlagship
              ? {
                  speakers: [
                    { speaker: 'Speaker1', voice: params.voiceName || 'Kore' },
                    { speaker: 'Speaker2', voice: params.secondVoiceName || 'Charon' },
                  ],
                }
              : [{ voice: params.voiceName || 'Kore' }],
          } as never,
        },
        { timeout: 45000, signal },
      ),
    45000,
    'La synthèse vocale TTS a expiré (45s). Veuillez réessayer.',
  );

  const audio = interaction.output_audio;
  if (!audio?.data) {
    throw new Error('Aucune piste audio retournée par le modèle TTS.');
  }

  const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const wavBuffer = Buffer.from(audio.data, 'base64');
  await fs.promises.writeFile(filePath, wavBuffer);

  return {
    fileUrl: `/uploads/${filename}`,
    filePath,
    fileSizeBytes: wavBuffer.length,
  };
}

export async function generateImageWithAI(params: {
  prompt: string;
  sdkModelId: string;
  aspectRatio: string;
  resolution: string;
  referenceImageBase64?: string;
  referenceMimeType?: string;
}): Promise<{ fileUrl: string; filePath: string; mimeType: string; fileSizeBytes: number }> {
  ensureMediaDirs();
  const ai = getAiClient(60000);
  const useNanoPro = params.sdkModelId === 'gemini-nano-banana-2.1' || params.sdkModelId === 'gemini-3-pro-image';
  const model = useNanoPro ? params.sdkModelId : 'gemini-3.1-flash-lite-image';

  const parts: Array<Record<string, unknown>> = [];
  if (params.referenceImageBase64 && params.referenceMimeType) {
    parts.push({
      inlineData: {
        data: params.referenceImageBase64,
        mimeType: params.referenceMimeType,
      },
    });
  }
  parts.push({ text: params.prompt });

  const imageSize =
    params.resolution === '4096x4096'
      ? '4K'
      : params.resolution === '2048x2048' || params.resolution === '1536x1536'
        ? '2K'
        : '1K';

  const config: Record<string, unknown> = useNanoPro
    ? {
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1',
          imageSize,
        },
      }
    : {
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1',
        },
      };

  const response = await withTimeout(
    (abortSignal) =>
      ai.models.generateContent({
        model,
        contents: { parts: parts as never },
        config: { ...config, abortSignal } as never,
      }),
    60000,
    'La génération d’image a expiré (60s). Vérifiez votre clé facturable ou réessayez.',
  );

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? 'image/png';
      const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
      const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      const buf = Buffer.from(part.inlineData.data, 'base64');
      await fs.promises.writeFile(filePath, buf);
      return {
        fileUrl: `/uploads/${filename}`,
        filePath,
        mimeType,
        fileSizeBytes: buf.length,
      };
    }
  }

  throw new Error('Le modèle image n’a retourné aucun média exploitable.');
}

export async function generateVideoWithAI(params: {
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  endImageBase64?: string;
  endMimeType?: string;
}): Promise<{ fileUrl: string; thumbUrl: string | null; filePath: string; fileSizeBytes: number }> {
  ensureMediaDirs();
  const ai = getAiClient(300000, 'v1beta');

  const inputParts: Array<Record<string, unknown>> = [];
  if (params.referenceImageBase64 && params.referenceMimeType) {
    inputParts.push({
      type: 'image',
      mime_type: params.referenceImageBase64 ? params.referenceMimeType : 'image/png',
      data: params.referenceImageBase64,
    });
  }
  if (params.endImageBase64 && params.endMimeType) {
    inputParts.push({
      type: 'image',
      mime_type: params.endMimeType,
      data: params.endImageBase64,
    });
  }
  inputParts.push({
    type: 'text',
    text: params.prompt,
  });

  const apiResolution = params.resolution === '1440p' ? '1080p' : params.resolution;
  const maxDur = params.referenceImageBase64 && params.endImageBase64 ? 10 : 15;
  const clampedDuration = Math.max(3, Math.min(maxDur, Math.round(params.durationSeconds)));

  const interaction = await withTimeout(
    (signal) =>
      ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: inputParts.length === 1 ? params.prompt : (inputParts as never),
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
            duration: `${clampedDuration}s`,
            resolution: apiResolution,
          } as never,
        },
        { timeout: 300000, signal },
      ),
    305000,
    'La génération vidéo Gemini Omni a expiré (5 min).',
  );

  const videoPart = interaction.output_video;
  if (!videoPart?.data) {
    throw new Error('Le moteur vidéo Gemini Omni n’a retourné aucun flux vidéo.');
  }

  const baseName = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const filename = `${baseName}.mp4`;
  const thumbFilename = `${baseName}.png`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const thumbPath = path.join(UPLOADS_DIR, thumbFilename);
  const buf = Buffer.from(videoPart.data, 'base64');
  await fs.promises.writeFile(filePath, buf);

  const hasThumb = await generateThumbnailFromVideo(filePath, thumbPath);

  return {
    fileUrl: `/uploads/${filename}`,
    thumbUrl: hasThumb ? `/uploads/${thumbFilename}` : null,
    filePath,
    fileSizeBytes: buf.length,
  };
}

export async function generateMusicWithAI(params: {
  prompt: string;
}): Promise<{ fileUrl: string; lyrics: string; mimeType: string; fileSizeBytes: number }> {
  ensureMediaDirs();
  const ai = getAiClient(90000, 'v1beta');

  const { audioChunks, lyrics, mimeType } = await withTimeout(
    async (abortSignal) => {
      const response = await ai.models.generateContentStream({
        model: 'lyria-3-clip-preview',
        contents: params.prompt,
        config: { abortSignal },
      });

      const chunks: Buffer[] = [];
      let collectedLyrics = '';
      let detectedMime = 'audio/mpeg';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (chunks.length === 0 && part.inlineData.mimeType) {
              detectedMime = part.inlineData.mimeType;
            }
            chunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            collectedLyrics += part.text;
          }
        }
      }
      return { audioChunks: chunks, lyrics: collectedLyrics, mimeType: detectedMime };
    },
    90000,
    'La génération musicale Lyria a expiré (90s).',
  );

  if (audioChunks.length === 0) {
    throw new Error('Aucune piste musicale retournée par Lyria.');
  }

  const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
  const filename = `music-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const fullBuf = Buffer.concat(audioChunks);
  await fs.promises.writeFile(filePath, fullBuf);

  return {
    fileUrl: `/uploads/${filename}`,
    lyrics: lyrics.trim(),
    mimeType,
    fileSizeBytes: fullBuf.length,
  };
}
