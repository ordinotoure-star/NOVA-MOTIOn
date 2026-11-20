import { ArrowLeft, ArrowRight, Download, Subtitles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import type { FilmExportRecord, Language, ProjectRecord, SceneRecord } from '../../shared/types';
import { MediaThumb } from '../MediaThumb';
import { IconFilmEngine } from './StudioIcons';

interface EditingStudioViewProps {
  language: Language;
  projects: ProjectRecord[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onRefreshAssets: () => void;
}

export function EditingStudioView({
  language,
  projects,
  selectedProjectId,
  onSelectProject,
  onRefreshAssets,
}: EditingStudioViewProps) {
  const isFr = language === 'fr';
  const activeId = selectedProjectId || projects[0]?.id || '';

  const [scenes, setScenes] = useState<SceneRecord[]>([]);
  const [exportsList, setExportsList] = useState<FilmExportRecord[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [exportResolution, setExportResolution] = useState('1080p');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTimeline(id: string) {
    if (!id) return;
    try {
      const res = await apiFetch<{
        scenes: Array<Record<string, unknown>>;
        exports: Array<Record<string, unknown>>;
      }>(`/api/projects/${id}`);
      setScenes(
        res.scenes.map((s) => ({
          id: String(s.id),
          projectId: String(s.project_id),
          orderIndex: Number(s.order_index),
          chapterTitle: String(s.chapter_title),
          title: String(s.title),
          visualPrompt: String(s.visual_prompt),
          dialogue: String(s.dialogue),
          speakerName: String(s.speaker_name),
          cameraMovement: String(s.camera_movement),
          framing: String(s.framing),
          lightingMood: String(s.lighting_mood),
          durationSeconds: Number(s.duration_seconds),
          transitionType: s.transition_type as SceneRecord['transitionType'],
          subtitleText: String(s.subtitle_text),
          videoAssetId: s.video_asset_id ? String(s.video_asset_id) : null,
          videoUrl: s.video_url ? String(s.video_url) : null,
          audioAssetId: s.audio_asset_id ? String(s.audio_asset_id) : null,
          audioUrl: s.audio_url ? String(s.audio_url) : null,
          keyframeUrl: s.keyframe_url ? String(s.keyframe_url) : null,
          status: s.status as SceneRecord['status'],
        })),
      );
      setExportsList(
        res.exports.map((e) => ({
          id: String(e.id),
          projectId: String(e.project_id),
          userId: String(e.user_id),
          title: String(e.title),
          fileUrl: String(e.file_url),
          durationSeconds: Number(e.duration_seconds),
          resolution: String(e.resolution),
          subtitlesIncluded: Boolean(e.subtitles_included),
          sceneCount: Number(e.scene_count),
          status: e.status as FilmExportRecord['status'],
          createdAt: String(e.created_at),
        })),
      );
      setActiveSceneIndex(0);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (activeId) void loadTimeline(activeId);
  }, [activeId]);

  const currentScene = scenes[activeSceneIndex] ?? null;
  const totalSeconds = scenes.reduce((acc, s) => acc + s.durationSeconds, 0);

  async function moveScene(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setScenes(next);
    setActiveSceneIndex(target);

    try {
      await apiFetch(`/api/projects/${activeId}/scenes/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateScenePatch(sceneId: string, patch: Partial<SceneRecord>) {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)));
    try {
      await apiFetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleExportFilm() {
    if (!activeId) return;
    setError(null);
    setNotice(null);
    setExporting(true);
    try {
      await apiFetch('/api/film-engine/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeId,
          resolution: exportResolution,
          includeSubtitles,
        }),
      });
      await loadTimeline(activeId);
      onRefreshAssets();
      setNotice(
        isFr
          ? 'Film assemblé et normalisé avec FFmpeg. Prêt au téléchargement ci-dessous.'
          : 'Film assembled and normalized with FFmpeg. Ready to download below.',
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Studio de montage & Assemblage FFmpeg' : 'Editing & FFmpeg Assembly Studio'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Ordonnancement des plans, transitions, synchronisation audio, sous-titres et exportation MP4.'
              : 'Shot ordering, transitions, audio synchronization, subtitles, and MP4 master export.'}
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2.5 shrink-0">
          <select
            aria-label={isFr ? 'Projet sur la timeline' : 'Timeline project'}
            value={activeId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="min-w-[180px] px-3 py-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-sm text-[#F4F7FB]"
          >
            {projects.length === 0 ? (
              <option value="">{isFr ? 'Aucun projet' : 'No projects yet'}</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))
            )}
          </select>

          <select
            aria-label={isFr ? 'Résolution d’exportation' : 'Export resolution'}
            value={exportResolution}
            onChange={(e) => setExportResolution(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-sm text-[#F4F7FB]"
          >
            <option value="720p">720p Standard</option>
            <option value="1080p">1080p HD</option>
            <option value="1440p">1440p Upscale</option>
          </select>

          <button
            type="button"
            disabled={exporting || scenes.length === 0}
            onClick={handleExportFilm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] disabled:opacity-50 text-white text-sm font-medium whitespace-nowrap shrink-0"
          >
            <IconFilmEngine className="w-[18px] h-[18px]" />
            <span>{exporting ? (isFr ? 'Assemblage FFmpeg...' : 'Assembling...') : isFr ? 'Exporter le film MP4' : 'Export MP4 Film'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 flex flex-wrap items-center justify-between gap-3">
          <span>{notice}</span>
          {exportsList[0] && (
            <a
              href={exportsList[0].fileUrl}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white font-medium whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isFr ? 'Télécharger le Master MP4' : 'Download Master MP4'}</span>
            </a>
          )}
        </div>
      )}

      {/* Preview Monitor + Scene Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0E1629] border border-[#1E3254] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>{currentScene ? currentScene.title : isFr ? 'Aucune scène' : 'No scene'}</span>
            <span className="font-mono tabular-nums">
              {isFr ? 'Durée totale :' : 'Total runtime:'} {totalSeconds}s ({scenes.length} {isFr ? 'plans' : 'clips'})
            </span>
          </div>
          {currentScene ? (
            <MediaThumb
              kind="video"
              src={currentScene.videoUrl || '/uploads/seed/seed-horizons-01.mp4'}
              thumbnailUrl={currentScene.keyframeUrl}
              title={currentScene.title}
              playable
            />
          ) : (
            <div className="aspect-video rounded-lg bg-[#080D19] border border-[#1E3254] flex items-center justify-center text-sm text-[#94A3B8]">
              {isFr ? 'Sélectionnez ou générez des scènes dans Film Engine.' : 'Select or generate scenes in Film Engine.'}
            </div>
          )}
          {includeSubtitles && currentScene?.subtitleText && (
            <div className="p-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-center text-[#F4F7FB]">
              {currentScene.subtitleText}
            </div>
          )}
        </div>

        {/* Selected Clip Inspector */}
        <div className="lg:col-span-5 bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Inspecteur de séquence' : 'Clip inspector'}
            </h2>
            <label className="inline-flex items-center gap-1.5 text-xs text-[#CBD5E1] cursor-pointer">
              <input
                type="checkbox"
                checked={includeSubtitles}
                onChange={(e) => setIncludeSubtitles(e.target.checked)}
                className="accent-[#3978FF]"
              />
              <Subtitles className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>{isFr ? 'Sous-titres SRT' : 'SRT Subtitles'}</span>
            </label>
          </div>

          {currentScene ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="ed-title" className="block text-xs text-[#94A3B8] mb-1">
                  {isFr ? 'Titre du plan' : 'Shot title'}
                </label>
                <input
                  id="ed-title"
                  type="text"
                  value={currentScene.title}
                  onChange={(e) => void updateScenePatch(currentScene.id, { title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-dur" className="block text-xs text-[#94A3B8] mb-1">
                    {isFr ? 'Durée (3–15s)' : 'Duration (3–15s)'}
                  </label>
                  <input
                    id="ed-dur"
                    type="number"
                    min={3}
                    max={15}
                    value={currentScene.durationSeconds}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 3 && val <= 15) {
                        void updateScenePatch(currentScene.id, { durationSeconds: val });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm font-mono tabular-nums text-[#F4F7FB]"
                  />
                </div>
                <div>
                  <label htmlFor="ed-trans" className="block text-xs text-[#94A3B8] mb-1">
                    {isFr ? 'Transition' : 'Transition'}
                  </label>
                  <select
                    id="ed-trans"
                    value={currentScene.transitionType}
                    onChange={(e) =>
                      void updateScenePatch(currentScene.id, {
                        transitionType: e.target.value as SceneRecord['transitionType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
                  >
                    <option value="cut">{isFr ? 'Coupe franche' : 'Hard Cut'}</option>
                    <option value="crossfade">{isFr ? 'Fondu enchaîné' : 'Crossfade'}</option>
                    <option value="fade_black">{isFr ? 'Fondu au noir' : 'Fade to black'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ed-sub" className="block text-xs text-[#94A3B8] mb-1">
                  {isFr ? 'Sous-titre synchronisé' : 'Synced subtitle'}
                </label>
                <textarea
                  id="ed-sub"
                  rows={2}
                  value={currentScene.subtitleText}
                  onChange={(e) => void updateScenePatch(currentScene.id, { subtitleText: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#94A3B8]">
                  {isFr ? 'Réordonner sur la timeline' : 'Reorder on timeline'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeSceneIndex === 0}
                    onClick={() => moveScene(activeSceneIndex, -1)}
                    aria-label={isFr ? 'Déplacer à gauche' : 'Move left'}
                    className="p-2 rounded-lg bg-[#14243D] disabled:opacity-40 text-[#F4F7FB]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={activeSceneIndex >= scenes.length - 1}
                    onClick={() => moveScene(activeSceneIndex, 1)}
                    aria-label={isFr ? 'Déplacer à droite' : 'Move right'}
                    className="p-2 rounded-lg bg-[#14243D] disabled:opacity-40 text-[#F4F7FB]"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Multi-Track Visual Timeline */}
      <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="font-medium text-[#CBD5E1]">{isFr ? 'Piste Vidéo & Piste Audio' : 'Video & Audio Tracks'}</span>
          <span className="font-mono tabular-nums">24 fps · AAC 44.1kHz</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {scenes.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setActiveSceneIndex(idx)}
              className={`min-w-[180px] p-3 rounded-lg text-left border transition-colors shrink-0 ${
                idx === activeSceneIndex
                  ? 'bg-[#14243D] border-[#3978FF]'
                  : 'bg-[#080D19] border-[#1E3254] hover:border-[#2C4775]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono tabular-nums">
                <span>#{idx + 1}</span>
                <span>{sc.durationSeconds}s</span>
              </div>
              <div className="text-xs font-medium text-[#F4F7FB] truncate mt-1">{sc.title}</div>
              <div className="text-[11px] text-[#A78BFA] mt-1 truncate">
                {sc.audioUrl ? 'Audio TTS' : isFr ? 'Silence / Ambiance' : 'Silent / Ambient'}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Exported Master Films */}
      <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
        <h2 className="font-display text-base font-semibold text-[#F4F7FB] mb-3">
          {isFr ? 'Exportations finalisées' : 'Finalized film exports'}
        </h2>
        {exportsList.length === 0 ? (
          <p className="text-xs text-[#94A3B8]">
            {isFr
              ? 'Cliquez sur « Exporter le film MP4 » pour assembler toutes les scènes avec FFmpeg.'
              : 'Click "Export MP4 Film" to assemble all scenes using FFmpeg.'}
          </p>
        ) : (
          <div className="space-y-3">
            {exportsList.map((exp) => (
              <div key={exp.id} className="p-3.5 rounded-lg bg-[#080D19] border border-[#1E3254] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[#F4F7FB]">{exp.title}</div>
                  <div className="text-xs text-[#94A3B8] font-mono tabular-nums mt-0.5">
                    {exp.durationSeconds}s · {exp.resolution} · {exp.sceneCount} {isFr ? 'plans' : 'shots'} ·{' '}
                    {exp.subtitlesIncluded ? 'SRT' : isFr ? 'Sans sous-titres' : 'No subtitles'}
                  </div>
                </div>
                <a
                  href={exp.fileUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14243D] hover:bg-[#1E3356] text-xs font-medium text-[#3978FF] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Télécharger MP4' : 'Download MP4'}</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
