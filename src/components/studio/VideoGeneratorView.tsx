import { Upload, XCircle } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { tStatus } from '../../i18n/translations';
import { apiFetch } from '../../services/api';
import { estimateVideoCost } from '../../shared/pricingAndFilmMath';
import type {
  AIModelConfig,
  GenerationJobRecord,
  Language,
  ProjectRecord,
  VideoMode,
  VideoResolution,
} from '../../shared/types';
import { MediaThumb } from '../MediaThumb';
import { IconOrchestrator, IconVideoEngine } from './StudioIcons';

interface VideoGeneratorViewProps {
  language: Language;
  models: AIModelConfig[];
  projects: ProjectRecord[];
  generations: GenerationJobRecord[];
  onJobCreated: () => void;
}

export function VideoGeneratorView({
  language,
  models,
  projects,
  generations,
  onJobCreated,
}: VideoGeneratorViewProps) {
  const isFr = language === 'fr';
  const videoModels = models.filter((m) => m.category === 'video' && m.enabled);

  const [mode, setMode] = useState<VideoMode>('text_to_video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [modelId, setModelId] = useState('auto');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [fps, setFps] = useState('24');
  const [visualStyle, setVisualStyle] = useState('Cinématographique 35mm');
  const [cameraMovement, setCameraMovement] = useState('Travelling avant lent');
  const [framing, setFraming] = useState('Plan large anamorphique');
  const [lightingMood, setLightingMood] = useState('Bleu nuit & tungstène');
  const [motionIntensity, setMotionIntensity] = useState('Modérée');
  const [variants, setVariants] = useState(1);

  const [refBase64, setRefBase64] = useState<string | undefined>();
  const [refMime, setRefMime] = useState<string | undefined>();
  const [refName, setRefName] = useState<string>('');
  const [endBase64, setEndBase64] = useState<string | undefined>();
  const [endMime, setEndMime] = useState<string | undefined>();

  const [analyzing, setAnalyzing] = useState(false);
  const [orchestratorNote, setOrchestratorNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = estimateVideoCost({
    durationSeconds,
    resolution,
    variants,
    mode,
  });

  function handleFileRead(e: ChangeEvent<HTMLInputElement>, target: 'start' | 'end') {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1];
      if (target === 'start') {
        setRefBase64(base64);
        setRefMime(file.type || 'image/png');
        setRefName(file.name);
      } else {
        setEndBase64(base64);
        setEndMime(file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyzePrompt() {
    if (prompt.trim().length < 3) {
      setError(isFr ? 'Veuillez saisir une description avant l’analyse.' : 'Please enter a prompt first.');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const res = await apiFetch<{
        enhancedPrompt: string;
        cameraSuggestion: string;
        lightingSuggestion: string;
        recommendedModelId: string;
        rationale: string;
      }>('/api/orchestrator/analyze', {
        method: 'POST',
        body: JSON.stringify({ prompt, mode, durationSeconds, resolution, style: visualStyle }),
      });
      setPrompt(res.enhancedPrompt);
      setCameraMovement(res.cameraSuggestion);
      setLightingMood(res.lightingSuggestion);
      setOrchestratorNote(res.rationale);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/generations/video', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          prompt,
          negativePrompt,
          modelId,
          projectId: projectId || null,
          durationSeconds,
          resolution,
          aspectRatio,
          fps: Number(fps),
          visualStyle,
          cameraMovement,
          framing,
          lightingMood,
          motionIntensity,
          variants,
          referenceImageBase64: refBase64,
          referenceMimeType: refMime,
          endImageBase64: endBase64,
          endMimeType: endMime,
        }),
      });
      onJobCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelJob(jobId: string) {
    try {
      await apiFetch(`/api/generations/${jobId}/cancel`, { method: 'POST' });
      onJobCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const videoJobs = generations.filter((g) => g.category === 'video');

  const modes: Array<{ id: VideoMode; labelFr: string; labelEn: string }> = [
    { id: 'text_to_video', labelFr: 'Text-to-Video', labelEn: 'Text-to-Video' },
    { id: 'image_to_video', labelFr: 'Image-to-Video', labelEn: 'Image-to-Video' },
    { id: 'video_to_video', labelFr: 'Video-to-Video', labelEn: 'Video-to-Video' },
    { id: 'first_last_frame', labelFr: 'First / Last Frame', labelEn: 'First / Last Frame' },
    { id: 'character_reference', labelFr: 'Réf. Personnage', labelEn: 'Character Ref' },
    { id: 'scene_generation', labelFr: 'Scène Scénario', labelEn: 'Scene Generation' },
  ];

  return (
    <div className="space-y-8">
      <div className="border-b border-[#1E3254] pb-5">
        <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
          {isFr ? 'Générateur Vidéo Multi-Modèles' : 'Multi-Model Video Generator'}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          {isFr
            ? 'Séquences individuelles jusqu’à 15 secondes · Distinction transparente entre résolution native et agrandissement FFmpeg.'
            : 'Single sequences up to 15 seconds · Transparent distinction between native generation and FFmpeg upscaling.'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit} className="xl:col-span-7 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-5">
          {/* Mode selector */}
          <div>
            <span className="block text-xs font-medium text-[#CBD5E1] mb-2">
              {isFr ? 'Mode de génération' : 'Generation mode'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left truncate ${
                    mode === m.id
                      ? 'bg-[#3978FF] text-white'
                      : 'bg-[#080D19] text-[#94A3B8] border border-[#1E3254] hover:text-white'
                  }`}
                >
                  {isFr ? m.labelFr : m.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt + AI Orchestrator enrichment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="vid-prompt" className="text-xs font-medium text-[#CBD5E1]">
                {isFr ? 'Description de la scène' : 'Scene prompt'}
              </label>
              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyzePrompt}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] hover:text-white transition-colors"
              >
                <IconOrchestrator className="w-4 h-4" />
                <span>
                  {analyzing
                    ? isFr
                      ? 'Analyse IA...'
                      : 'Analyzing...'
                    : isFr
                      ? 'Enrichir via Orchestrateur IA'
                      : 'Enrich via AI Orchestrator'}
                </span>
              </button>
            </div>
            <textarea
              id="vid-prompt"
              rows={4}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isFr
                  ? 'Ex. Travelling avant lent sur une astronaute approchant une arche d’obsidienne dans la brume cobalt au crépuscule...'
                  : 'E.g. Slow dolly shot of an astronaut approaching an obsidian monolith arch in misty cobalt twilight...'
              }
              className="w-full p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
            />
            {orchestratorNote && (
              <p className="mt-2 text-xs text-[#A78BFA]">{orchestratorNote}</p>
            )}
          </div>

          {/* Reference Image uploaders for Image-to-Video / First-Last / Character Ref */}
          {(mode === 'image_to_video' ||
            mode === 'first_last_frame' ||
            mode === 'character_reference' ||
            mode === 'video_to_video') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-[#080D19] border border-[#1E3254]">
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  {mode === 'first_last_frame'
                    ? isFr
                      ? 'Image de départ (First Frame)'
                      : 'First Frame Image'
                    : isFr
                      ? 'Référence visuelle (Image)'
                      : 'Visual Reference (Image)'}
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14243D] hover:bg-[#1C3254] text-xs text-[#F4F7FB] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">{refName || (isFr ? 'Importer un fichier' : 'Upload file')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileRead(e, 'start')} />
                </label>
              </div>
              {mode === 'first_last_frame' && (
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    {isFr ? 'Image de fin (Last Frame)' : 'Last Frame Image'}
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14243D] hover:bg-[#1C3254] text-xs text-[#F4F7FB] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">{endBase64 ? 'Image chargée' : isFr ? 'Importer image finale' : 'Upload end frame'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileRead(e, 'end')} />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Core technical controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vid-model" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                {isFr ? 'Moteur IA' : 'AI Engine'}
              </label>
              <select
                id="vid-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
              >
                <option value="auto">{isFr ? 'Sélection automatique (Orchestrateur)' : 'Auto-select (Orchestrator)'}</option>
                {videoModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="vid-project" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                {isFr ? 'Projet associé' : 'Linked project'}
              </label>
              <select
                id="vid-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
              >
                <option value="">{isFr ? 'Sans projet' : 'Standalone'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration Slider capped strictly at 15s */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="vid-duration" className="font-medium text-[#CBD5E1]">
                {isFr ? 'Durée de la séquence (max 15s)' : 'Sequence duration (max 15s)'}
              </label>
              <span className="font-mono tabular-nums text-[#3978FF] font-semibold">{durationSeconds} s</span>
            </div>
            <input
              id="vid-duration"
              type="range"
              min={3}
              max={15}
              step={1}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="w-full accent-[#3978FF]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="vid-res" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Résolution' : 'Resolution'}
              </label>
              <select
                id="vid-res"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as VideoResolution)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="720p">720p Standard</option>
                <option value="1080p">1080p HD</option>
                <option value="1440p">1440p (Upscale)</option>
                <option value="4k">2160p / 4K</option>
              </select>
            </div>

            <div>
              <label htmlFor="vid-ratio" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                Format
              </label>
              <select
                id="vid-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="16:9">16:9 Cinéma</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="1:1">1:1 Carré</option>
              </select>
            </div>

            <div>
              <label htmlFor="vid-fps" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                FPS
              </label>
              <select
                id="vid-fps"
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>

            <div>
              <label htmlFor="vid-variants" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Variantes' : 'Variants'}
              </label>
              <select
                id="vid-variants"
                value={variants}
                onChange={(e) => setVariants(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>

          {/* Cinematography Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vid-style" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Style visuel' : 'Visual style'}
              </label>
              <input
                id="vid-style"
                type="text"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="vid-cam" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Mouvement de caméra' : 'Camera movement'}
              </label>
              <input
                id="vid-cam"
                type="text"
                value={cameraMovement}
                onChange={(e) => setCameraMovement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="vid-framing" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Cadrage' : 'Framing'}
              </label>
              <input
                id="vid-framing"
                type="text"
                value={framing}
                onChange={(e) => setFraming(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="vid-light" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Ambiance lumineuse' : 'Lighting mood'}
              </label>
              <input
                id="vid-light"
                type="text"
                value={lightingMood}
                onChange={(e) => setLightingMood(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vid-motion" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Intensité du mouvement' : 'Motion intensity'}
              </label>
              <select
                id="vid-motion"
                value={motionIntensity}
                onChange={(e) => setMotionIntensity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="Subtile">Subtile</option>
                <option value="Modérée">Modérée</option>
                <option value="Dynamique">Dynamique</option>
              </select>
            </div>
            <div>
              <label htmlFor="vid-neg" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Prompt négatif (optionnel)' : 'Negative prompt (optional)'}
              </label>
              <input
                id="vid-neg"
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder={isFr ? 'Flou, distorsion, texte incrusté...' : 'Blur, distortion, watermark...'}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Pre-execution Cost Summary + Submit */}
          <div className="pt-4 border-t border-[#1E3254] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-[#94A3B8]">
              <div>
                {isFr ? 'Coût estimé :' : 'Estimated cost:'}{' '}
                <span className="font-mono font-semibold tabular-nums text-[#F4F7FB]">
                  {cost.totalCredits} {isFr ? 'crédits' : 'credits'}
                </span>
              </div>
              <div className="mt-0.5">
                {cost.isUpscaled
                  ? isFr
                    ? `Génération native ${cost.nativeResolution} puis agrandissement FFmpeg vers ${cost.outputResolution}`
                    : `Native ${cost.nativeResolution} generation then FFmpeg upscale to ${cost.outputResolution}`
                  : isFr
                    ? `Génération native ${cost.nativeResolution}`
                    : `Native ${cost.nativeResolution} generation`}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <IconVideoEngine className="w-[18px] h-[18px]" />
              <span>{submitting ? (isFr ? 'Envoi...' : 'Submitting...') : isFr ? 'Lancer la génération' : 'Generate video'}</span>
            </button>
          </div>
        </form>

        {/* Live Video Queue & Output Previews */}
        <section className="xl:col-span-5 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
            {isFr ? 'File de rendu & résultats vidéo' : 'Render queue & video outputs'}
          </h2>
          {videoJobs.length === 0 ? (
            <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-8 text-center text-sm text-[#94A3B8]">
              {isFr ? 'Vos séquences vidéo générées apparaîtront ici.' : 'Your generated video clips will appear here.'}
            </div>
          ) : (
            <div className="space-y-4">
              {videoJobs.slice(0, 6).map((job) => (
                <div key={job.id} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F4F7FB] line-clamp-1">{job.prompt}</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5 font-mono tabular-nums">
                        {tStatus(language, job.status)} · {job.progress}% · {job.reservedCredits} cr.
                      </div>
                    </div>
                    {['pending', 'preparing', 'generating'].includes(job.status) && (
                      <button
                        type="button"
                        onClick={() => handleCancelJob(job.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isFr ? 'Annuler' : 'Cancel'}</span>
                      </button>
                    )}
                  </div>

                  <div className="h-1.5 w-full bg-[#14243D] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${job.status === 'failed' ? 'bg-red-500' : 'bg-[#3978FF]'}`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  {job.errorMessage && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-200">
                      {job.errorMessage}
                    </div>
                  )}

                  {job.outputUrl && (
                    <div className="space-y-2">
                      <MediaThumb kind="video" src={job.outputUrl} title={job.prompt} playable />
                      <a
                        href={job.outputUrl}
                        download
                        className="inline-block text-xs text-[#3978FF] hover:underline"
                      >
                        {isFr ? 'Télécharger le fichier MP4' : 'Download MP4 file'}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
