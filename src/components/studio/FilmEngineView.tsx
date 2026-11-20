import { BookOpen, CheckCircle2, MapPin, Music, Plus, Users, Volume2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../services/api';
import { calculateFilmProductionPlan } from '../../shared/pricingAndFilmMath';
import type {
  CharacterRef,
  Language,
  LocationRef,
  ProjectRecord,
  SceneRecord,
} from '../../shared/types';
import type { StudioTab } from './OverviewView';
import { IconAdmin, IconEditingStudio, IconVideoEngine } from './StudioIcons';

interface FilmEngineViewProps {
  language: Language;
  projects: ProjectRecord[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNavigate: (tab: StudioTab, projectId?: string) => void;
  onRefreshProjects: () => void;
}

export function FilmEngineView({
  language,
  projects,
  selectedProjectId,
  onSelectProject,
  onNavigate,
  onRefreshProjects,
}: FilmEngineViewProps) {
  const isFr = language === 'fr';
  const activeId = selectedProjectId || projects[0]?.id || '';

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [scenes, setScenes] = useState<SceneRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterRef[]>([]);
  const [locations, setLocations] = useState<LocationRef[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Science-Fiction');
  const [newMinutes, setNewMinutes] = useState(5);
  const [ideaPrompt, setIdeaPrompt] = useState('');

  const [musicPrompt, setMusicPrompt] = useState('Bande originale symphonique nocturne avec synthés analogiques profonds');
  const [coherenceReport, setCoherenceReport] = useState<{
    statusLabel: string;
    issues: string[];
    recommendations: string[];
  } | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const livePlan = calculateFilmProductionPlan(project?.targetDurationMinutes ?? newMinutes, 15);

  async function loadProjectDetails(id: string) {
    if (!id) return;
    try {
      const res = await apiFetch<{
        project: Record<string, unknown>;
        scenes: Array<Record<string, unknown>>;
        characters: Array<Record<string, unknown>>;
        locations: Array<Record<string, unknown>>;
      }>(`/api/projects/${id}`);

      setProject({
        id: String(res.project.id),
        userId: String(res.project.user_id),
        title: String(res.project.title),
        description: String(res.project.description),
        genre: String(res.project.genre),
        targetDurationMinutes: Number(res.project.target_duration_minutes),
        aspectRatio: String(res.project.aspect_ratio),
        visualStyle: String(res.project.visual_style),
        status: res.project.status as ProjectRecord['status'],
        coherenceScoreText: String(res.project.coherence_score_text),
        createdAt: String(res.project.created_at),
        updatedAt: String(res.project.updated_at),
      });

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

      setCharacters(
        res.characters.map((c) => ({
          id: String(c.id),
          projectId: String(c.project_id),
          name: String(c.name),
          role: String(c.role),
          physicalTraits: String(c.physical_traits),
          costume: String(c.costume),
          voiceStyle: String(c.voice_style),
          imageAssetId: c.image_asset_id ? String(c.image_asset_id) : null,
          imageUrl: c.image_url ? String(c.image_url) : null,
        })),
      );

      setLocations(
        res.locations.map((l) => ({
          id: String(l.id),
          projectId: String(l.project_id),
          name: String(l.name),
          atmosphere: String(l.atmosphere),
          lighting: String(l.lighting),
          continuityNotes: String(l.continuity_notes),
          imageAssetId: l.image_asset_id ? String(l.image_asset_id) : null,
          imageUrl: l.image_url ? String(l.image_url) : null,
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (activeId) {
      void loadProjectDetails(activeId);
    } else {
      setProject(null);
      setScenes([]);
      setCharacters([]);
      setLocations([]);
    }
  }, [activeId]);

  async function handleCreateFilmProject(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    setBusyAction('create');
    try {
      const res = await apiFetch<{ project: Record<string, unknown> }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          genre: newGenre,
          targetDurationMinutes: newMinutes,
          description: ideaPrompt,
        }),
      });
      const createdId = String(res.project.id);
      setNewTitle('');
      onRefreshProjects();
      onSelectProject(createdId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateScreenplayAndBible() {
    if (!project) return;
    setError(null);
    setMessage(null);
    setBusyAction('screenplay');
    try {
      await apiFetch('/api/film-engine/generate-plan', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          idea: ideaPrompt || project.description || project.title,
        }),
      });
      await loadProjectDetails(project.id);
      setMessage(
        isFr
          ? 'Scénario, Bible cinématographique et découpage technique générés par IA.'
          : 'Screenplay, Cinema Bible, and shot breakdown generated by AI.',
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRunCoherenceCheck() {
    if (!project) return;
    setError(null);
    setBusyAction('coherence');
    try {
      const res = await apiFetch<{ statusLabel: string; issues: string[]; recommendations: string[] }>(
        '/api/film-engine/coherence-check',
        {
          method: 'POST',
          body: JSON.stringify({ projectId: project.id }),
        },
      );
      setCoherenceReport(res);
      await loadProjectDetails(project.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateSceneVoice(scene: SceneRecord) {
    if (!scene.dialogue.trim()) {
      setError(isFr ? 'Cette scène ne contient aucun dialogue.' : 'This scene has no dialogue text.');
      return;
    }
    setError(null);
    setBusyAction(`tts_${scene.id}`);
    try {
      await apiFetch('/api/generations/audio', {
        method: 'POST',
        body: JSON.stringify({
          projectId: scene.projectId,
          sceneId: scene.id,
          text: scene.dialogue,
          voiceName: scene.speakerName.toLowerCase().includes('marcus') ? 'Charon' : 'Kore',
          style: 'Dramatic cinema actor',
          title: `Voix · ${scene.title}`,
        }),
      });
      setMessage(isFr ? `Synthèse vocale lancée pour "${scene.title}".` : `Voice synthesis started for "${scene.title}".`);
      setTimeout(() => void loadProjectDetails(scene.projectId), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateSceneVideo(scene: SceneRecord) {
    if (!project) return;
    setError(null);
    setBusyAction(`vid_${scene.id}`);
    try {
      await apiFetch('/api/generations/video', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          sceneId: scene.id,
          mode: 'scene_generation',
          prompt: scene.visualPrompt,
          durationSeconds: Math.max(3, Math.min(15, scene.durationSeconds)),
          resolution: '1080p',
          aspectRatio: project.aspectRatio,
          cameraMovement: scene.cameraMovement,
          framing: scene.framing,
          lightingMood: scene.lightingMood,
          modelId: 'auto',
          title: scene.title,
        }),
      });
      setMessage(isFr ? `Génération vidéo envoyée en file pour "${scene.title}".` : `Video job queued for "${scene.title}".`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateMusicScore() {
    if (!project) return;
    setError(null);
    setBusyAction('music');
    try {
      await apiFetch('/api/generations/music', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          prompt: musicPrompt,
          title: `BO · ${project.title}`,
        }),
      });
      setMessage(isFr ? 'Composition musicale Lyria envoyée en file.' : 'Lyria score generation queued.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            NOVA FILM ENGINE
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Production complète de 1 à 60 minutes : scénario, Bible cinématographique, découpage en plans de 15s max, voix et cohérence.'
              : 'End-to-end production from 1 to 60 minutes: screenplay, Cinema Bible, 15s-max shot breakdown, voiceovers, and continuity.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label={isFr ? 'Sélectionner un film' : 'Select film project'}
            value={activeId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="min-w-[180px] px-3 py-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-sm text-[#F4F7FB]"
          >
            {projects.length === 0 ? (
              <option value="">{isFr ? 'Aucun projet' : 'No projects yet'}</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.targetDurationMinutes} min)
                </option>
              ))
            )}
          </select>

          {project && (
            <button
              type="button"
              onClick={() => onNavigate('editing', project.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium whitespace-nowrap"
            >
              <IconEditingStudio className="w-[18px] h-[18px]" />
              <span>{isFr ? 'Ouvrir dans Studio de montage' : 'Open in Editing Studio'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Create New Long-Form Film Bar + 60-Min Math Calculator */}
      <form onSubmit={handleCreateFilmProject} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-4">
          <label htmlFor="film-new-title" className="block text-xs font-medium text-[#CBD5E1] mb-1">
            {isFr ? 'Nouveau projet de film' : 'New film project'}
          </label>
          <input
            id="film-new-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isFr ? 'Titre du long-métrage ou documentaire' : 'Feature or documentary title'}
            className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
          />
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="film-new-genre" className="block text-xs font-medium text-[#CBD5E1] mb-1">
            {isFr ? 'Genre' : 'Genre'}
          </label>
          <select
            id="film-new-genre"
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
          >
            <option value="Science-Fiction">Science-Fiction</option>
            <option value="Documentaire">Documentaire</option>
            <option value="Drame">Drame narratif</option>
            <option value="Publicité">Film publicitaire</option>
            <option value="Animation">Animation artistique</option>
          </select>
        </div>
        <div className="lg:col-span-3">
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="film-new-min" className="font-medium text-[#CBD5E1]">
              {isFr ? 'Durée cible (1–60 min)' : 'Target duration (1–60 min)'}
            </label>
            <span className="font-mono tabular-nums text-[#A78BFA]">{newMinutes} min</span>
          </div>
          <input
            id="film-new-min"
            type="range"
            min={1}
            max={60}
            value={newMinutes}
            onChange={(e) => setNewMinutes(Number(e.target.value))}
            className="w-full accent-[#3978FF]"
          />
        </div>
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={busyAction === 'create'}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#14243D] hover:bg-[#1E3356] border border-[#243B63] text-sm font-medium text-[#F4F7FB]"
          >
            <Plus className="w-4 h-4" />
            <span>{isFr ? 'Créer' : 'Create'}</span>
          </button>
        </div>
      </form>

      {/* Production Math Strip (§5.3) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4">
          <div className="text-xs text-[#94A3B8]">{isFr ? 'Durée totale cible' : 'Target runtime'}</div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#F4F7FB] mt-1">
            {livePlan.totalSeconds.toLocaleString()} s ({livePlan.targetMinutes} min)
          </div>
        </div>
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4">
          <div className="text-xs text-[#94A3B8]">{isFr ? 'Séquences min. (≤ 15s)' : 'Min. sequences (≤ 15s)'}</div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#3978FF] mt-1">
            {livePlan.minimumSequences} {isFr ? 'plans' : 'shots'}
          </div>
        </div>
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4">
          <div className="text-xs text-[#94A3B8]">{isFr ? 'Avec marge variantes (+12%)' : 'With retake buffer (+12%)'}</div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#A78BFA] mt-1">
            {livePlan.recommendedGenerationsWithBuffer} {isFr ? 'générations' : 'generations'}
          </div>
        </div>
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4">
          <div className="text-xs text-[#94A3B8]">{isFr ? 'Blocs d’assemblage FFmpeg' : 'FFmpeg assembly blocks'}</div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#F4F7FB] mt-1">
            {livePlan.assemblyBlocksCount} {isFr ? 'blocs' : 'blocks'}
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200">
          {message}
        </div>
      )}

      {project && (
        <div className="space-y-6">
          {/* Step 1-4: Screenplay & Idea Orchestration */}
          <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#3978FF]" />
                <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
                  {isFr ? 'Scénario intelligent & Découpage technique' : 'AI Screenplay & Shot Breakdown'}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyAction === 'coherence'}
                  onClick={handleRunCoherenceCheck}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#14243D] hover:bg-[#1E3356] border border-[#243B63] text-xs font-medium text-[#F4F7FB]"
                >
                  <IconAdmin className="w-4 h-4 text-[#A78BFA]" />
                  <span>{busyAction === 'coherence' ? '...' : isFr ? 'Contrôle de cohérence IA' : 'AI Coherence Check'}</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction === 'screenplay'}
                  onClick={handleGenerateScreenplayAndBible}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-xs font-medium text-white"
                >
                  <span>
                    {busyAction === 'screenplay'
                      ? isFr
                        ? 'Développement IA...'
                        : 'Developing...'
                      : isFr
                        ? 'Générer Scénario, Bible & Plans'
                        : 'Generate Script, Bible & Shots'}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-sm text-[#CBD5E1]">{project.description}</p>

            <div>
              <label htmlFor="film-idea-input" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                {isFr ? 'Idée initiale ou instructions de réalisation pour développer de nouvelles scènes' : 'Concept or directing instructions to expand scenes'}
              </label>
              <textarea
                id="film-idea-input"
                rows={2}
                value={ideaPrompt}
                onChange={(e) => setIdeaPrompt(e.target.value)}
                placeholder={isFr ? 'Décrivez l’intrigue, le ton, les dialogues souhaités...' : 'Describe plot, tone, and key dialogue moments...'}
                className="w-full p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
              />
            </div>

            {coherenceReport && (
              <div className="p-4 rounded-lg bg-[#080D19] border border-[#243B63] space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#A78BFA]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{coherenceReport.statusLabel}</span>
                </div>
                {coherenceReport.issues.length > 0 && (
                  <ul className="list-disc pl-4 text-amber-200 space-y-1">
                    {coherenceReport.issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
                {coherenceReport.recommendations.length > 0 && (
                  <ul className="list-disc pl-4 text-[#CBD5E1] space-y-1">
                    {coherenceReport.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Cinema Bible: Characters & Locations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#A78BFA]" />
                <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
                  {isFr ? 'Bible · Personnages de référence' : 'Cinema Bible · Characters'}
                </h2>
              </div>
              {characters.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucun personnage défini.' : 'No characters defined yet.'}</p>
              ) : (
                <div className="space-y-3">
                  {characters.map((ch) => (
                    <div key={ch.id} className="p-3.5 rounded-lg bg-[#080D19] border border-[#1E3254] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#F4F7FB]">{ch.name}</span>
                        <span className="text-xs text-[#A78BFA]">{ch.role}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">{ch.physicalTraits}</p>
                      <p className="text-xs text-[#CBD5E1]">{isFr ? 'Costume :' : 'Costume:'} {ch.costume}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3978FF]" />
                <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
                  {isFr ? 'Bible · Décors & Continuité' : 'Cinema Bible · Locations & Continuity'}
                </h2>
              </div>
              {locations.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucun décor défini.' : 'No locations defined yet.'}</p>
              ) : (
                <div className="space-y-3">
                  {locations.map((loc) => (
                    <div key={loc.id} className="p-3.5 rounded-lg bg-[#080D19] border border-[#1E3254] space-y-1">
                      <div className="text-sm font-medium text-[#F4F7FB]">{loc.name}</div>
                      <p className="text-xs text-[#94A3B8]">{loc.atmosphere} · {loc.lighting}</p>
                      <p className="text-xs text-[#CBD5E1]">{loc.continuityNotes}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Shot Breakdown + Audio Music Score */}
          <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
                {isFr ? `Plans & Séquences (${scenes.length})` : `Shots & Sequences (${scenes.length})`}
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={isFr ? 'Prompt musique Lyria' : 'Lyria music prompt'}
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB] w-64"
                />
                <button
                  type="button"
                  disabled={busyAction === 'music'}
                  onClick={handleGenerateMusicScore}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14243D] hover:bg-[#1E3356] border border-[#243B63] text-xs font-medium text-[#F4F7FB] whitespace-nowrap"
                >
                  <Music className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>{isFr ? 'Générer BO (Lyria)' : 'Score (Lyria)'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {scenes.map((sc, idx) => (
                <div key={sc.id} className="p-4 rounded-lg bg-[#080D19] border border-[#1E3254] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                      <span className="font-mono text-[#3978FF]">#{String(idx + 1).padStart(2, '0')}</span>
                      <span>{sc.chapterTitle}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{sc.durationSeconds}s</span>
                      <span>·</span>
                      <span>{sc.cameraMovement}</span>
                    </div>
                    <div className="text-sm font-medium text-[#F4F7FB]">{sc.title}</div>
                    <p className="text-xs text-[#94A3B8]">{sc.visualPrompt}</p>
                    {sc.dialogue && (
                      <p className="text-xs text-[#CBD5E1] italic">
                        « {sc.dialogue} » {sc.speakerName ? `— ${sc.speakerName}` : ''}
                      </p>
                    )}
                    {sc.audioUrl && (
                      <audio controls src={sc.audioUrl} className="h-8 mt-2 max-w-xs" preload="metadata" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyAction === `tts_${sc.id}`}
                      onClick={() => handleGenerateSceneVoice(sc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14243D] hover:bg-[#1E3356] text-xs font-medium text-[#F4F7FB] whitespace-nowrap"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#A78BFA]" />
                      <span>{busyAction === `tts_${sc.id}` ? '...' : isFr ? 'Voix TTS' : 'TTS Voice'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === `vid_${sc.id}`}
                      onClick={() => handleGenerateSceneVideo(sc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-xs font-medium text-white whitespace-nowrap"
                    >
                      <IconVideoEngine className="w-3.5 h-3.5" />
                      <span>{busyAction === `vid_${sc.id}` ? '...' : isFr ? 'Générer Plan' : 'Render Shot'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
