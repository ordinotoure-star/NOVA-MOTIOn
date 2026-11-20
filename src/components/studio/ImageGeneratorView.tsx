import { Upload } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { tStatus } from '../../i18n/translations';
import { apiFetch } from '../../services/api';
import { estimateImageCost } from '../../shared/pricingAndFilmMath';
import type {
  AIModelConfig,
  GenerationJobRecord,
  ImageMode,
  ImageResolution,
  Language,
  MediaAssetRecord,
  ProjectRecord,
} from '../../shared/types';
import { MediaThumb } from '../MediaThumb';
import { IconImageEngine } from './StudioIcons';

interface ImageGeneratorViewProps {
  language: Language;
  models: AIModelConfig[];
  projects: ProjectRecord[];
  generations: GenerationJobRecord[];
  assets: MediaAssetRecord[];
  onRefresh: () => void;
}

export function ImageGeneratorView({
  language,
  models,
  projects,
  generations,
  assets,
  onRefresh,
}: ImageGeneratorViewProps) {
  const isFr = language === 'fr';
  const imageModels = models.filter((m) => m.category === 'image' && m.enabled);

  const [mode, setMode] = useState<ImageMode>('text_to_image');
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('auto');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [resolution, setResolution] = useState<ImageResolution>('1024x1024');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [style, setStyle] = useState('Photoréaliste cinématographique');
  const [colorCorrection, setColorCorrection] = useState('Contraste film 35mm');
  const [variants, setVariants] = useState(1);
  const [upscale, setUpscale] = useState(false);

  const [refBase64, setRefBase64] = useState<string | undefined>();
  const [refMime, setRefMime] = useState<string | undefined>();
  const [refName, setRefName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cost = estimateImageCost({ resolution, variants, mode, upscale });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      setRefBase64(res.split(',')[1]);
      setRefMime(file.type || 'image/png');
      setRefName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/generations/image', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          prompt,
          modelId,
          projectId: projectId || null,
          resolution,
          aspectRatio,
          style,
          colorCorrection,
          variants,
          upscale,
          referenceImageBase64: refBase64,
          referenceMimeType: refMime,
        }),
      });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpscaleAsset(assetId: string) {
    setUpscalingId(assetId);
    setError(null);
    try {
      await apiFetch(`/api/assets/${assetId}/upscale`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpscalingId(null);
    }
  }

  const imageModes: Array<{ id: ImageMode; label: string }> = [
    { id: 'text_to_image', label: 'Text-to-Image' },
    { id: 'image_to_image', label: 'Image-to-Image' },
    { id: 'inpainting', label: 'Inpainting' },
    { id: 'outpainting', label: 'Outpainting' },
    { id: 'object_removal', label: isFr ? 'Suppression' : 'Remove Object' },
    { id: 'object_replacement', label: isFr ? 'Remplacement' : 'Replace Object' },
    { id: 'cutout', label: isFr ? 'Détourage' : 'Cutout' },
    { id: 'upscale', label: 'Upscaling' },
    { id: 'color_correction', label: isFr ? 'Colorimétrie' : 'Color Grading' },
  ];

  const imageJobs = generations.filter((g) => g.category === 'image');
  const imageAssets = assets.filter((a) => a.kind === 'image');

  return (
    <div className="space-y-8">
      <div className="border-b border-[#1E3254] pb-5">
        <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
          {isFr ? 'Générateur d’Images Haute Résolution' : 'High-Resolution Image Studio'}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          {isFr
            ? 'Création photoréaliste, références personnages/décors, retouche et upscaling jusqu’à 4096 × 4096.'
            : 'Photorealistic creation, character/set references, retouching, and upscaling up to 4096 × 4096.'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit} className="xl:col-span-6 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-5">
          <div>
            <span className="block text-xs font-medium text-[#CBD5E1] mb-2">
              {isFr ? 'Mode créatif' : 'Creative mode'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {imageModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium text-left truncate transition-colors ${
                    mode === m.id
                      ? 'bg-[#3978FF] text-white'
                      : 'bg-[#080D19] text-[#94A3B8] border border-[#1E3254] hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="img-prompt" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              {isFr ? 'Description visuelle' : 'Image prompt'}
            </label>
            <textarea
              id="img-prompt"
              rows={4}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isFr
                  ? 'Ex. Portrait studio de la Commandante Elena Vance en veste technique bleu nuit, objectif Leica 50mm...'
                  : 'E.g. Studio portrait of Commander Elena Vance in matte navy flight jacket, Leica 50mm lens...'
              }
              className="w-full p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              {isFr ? 'Image source / référence (optionnel)' : 'Source / reference image (optional)'}
            </label>
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] hover:border-[#3978FF] text-xs text-[#CBD5E1] cursor-pointer">
              <Upload className="w-4 h-4 text-[#3978FF]" />
              <span className="truncate">{refName || (isFr ? 'Importer une image de référence' : 'Upload reference image')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="img-model" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Moteur IA' : 'AI Engine'}
              </label>
              <select
                id="img-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="auto">{isFr ? 'Sélection automatique' : 'Auto-select'}</option>
                {imageModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="img-project" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Projet' : 'Project'}
              </label>
              <select
                id="img-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="">{isFr ? 'Aucun' : 'None'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="img-res" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Résolution' : 'Resolution'}
              </label>
              <select
                id="img-res"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as ImageResolution)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="1024x1024">1024 × 1024</option>
                <option value="1536x1024">1536 × 1024</option>
                <option value="2048x2048">2048 × 2048</option>
                <option value="4096x4096">4096 × 4096</option>
              </select>
            </div>
            <div>
              <label htmlFor="img-ratio" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                Format
              </label>
              <select
                id="img-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
            <div>
              <label htmlFor="img-var" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Variantes' : 'Variants'}
              </label>
              <select
                id="img-var"
                value={variants}
                onChange={(e) => setVariants(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="img-style" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Direction artistique' : 'Art style'}
              </label>
              <input
                id="img-style"
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="img-color" className="block text-xs font-medium text-[#CBD5E1] mb-1">
                {isFr ? 'Correction couleurs & netteté' : 'Color & sharpness'}
              </label>
              <input
                id="img-color"
                type="text"
                value={colorCorrection}
                onChange={(e) => setColorCorrection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
            <input
              type="checkbox"
              checked={upscale}
              onChange={(e) => setUpscale(e.target.checked)}
              className="rounded border-[#1E3254] accent-[#3978FF]"
            />
            <span>
              {isFr
                ? 'Appliquer un agrandissement haute netteté FFmpeg après génération'
                : 'Apply FFmpeg sharpening upscale after generation'}
            </span>
          </label>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-[#1E3254] flex items-center justify-between gap-4">
            <div className="text-xs text-[#94A3B8]">
              <span>{isFr ? 'Coût estimé :' : 'Estimated cost:'} </span>
              <span className="font-mono font-semibold tabular-nums text-[#F4F7FB]">
                {cost.totalCredits} {isFr ? 'crédits' : 'credits'}
              </span>
              <div className="mt-0.5">
                {cost.isUpscaled ? `${cost.nativeResolution} → ${cost.outputResolution} (Amélioré)` : `${cost.nativeResolution} (Natif)`}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <IconImageEngine className="w-[18px] h-[18px]" />
              <span>{submitting ? (isFr ? 'Génération...' : 'Generating...') : isFr ? 'Générer l’image' : 'Generate image'}</span>
            </button>
          </div>
        </form>

        {/* Results & Library Images */}
        <section className="xl:col-span-6 space-y-5">
          {imageJobs.length > 0 && (
            <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
                {isFr ? 'Tâches images récentes' : 'Recent image jobs'}
              </h2>
              {imageJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#F4F7FB] truncate">{job.prompt}</span>
                    <span className="font-mono text-[#A78BFA] shrink-0">{tStatus(language, job.status)}</span>
                  </div>
                  {job.errorMessage && <p className="text-red-300">{job.errorMessage}</p>}
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-semibold text-[#F4F7FB] mb-3">
              {isFr ? 'Galerie d’images & Références' : 'Images & References Gallery'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {imageAssets.map((asset) => (
                <div key={asset.id} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <MediaThumb kind="image" src={asset.fileUrl} title={asset.title} />
                    <div className="mt-2.5 text-sm font-medium text-[#F4F7FB] truncate">{asset.title}</div>
                    <div className="text-xs text-[#94A3B8] font-mono tabular-nums mt-0.5">
                      {asset.outputResolution} · {asset.isUpscaled ? (isFr ? 'Amélioré' : 'Upscaled') : isFr ? 'Natif' : 'Native'}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#1E3254] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={upscalingId === asset.id}
                      onClick={() => handleUpscaleAsset(asset.id)}
                      className="text-xs text-[#A78BFA] hover:text-white transition-colors"
                    >
                      {upscalingId === asset.id
                        ? isFr
                          ? 'Upscaling...'
                          : 'Upscaling...'
                        : isFr
                          ? 'Upscale 2048px (FFmpeg)'
                          : 'Upscale 2048px (FFmpeg)'}
                    </button>
                    <a href={asset.fileUrl} download className="text-xs text-[#3978FF] hover:underline">
                      {isFr ? 'Exporter' : 'Download'}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
