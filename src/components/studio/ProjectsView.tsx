import { Archive, Copy, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { Language, ProjectRecord } from '../../shared/types';
import type { StudioTab } from './OverviewView';

interface ProjectsViewProps {
  language: Language;
  projects: ProjectRecord[];
  onRefresh: () => void;
  onOpenProject: (tab: StudioTab, projectId: string) => void;
}

export function ProjectsView({
  language,
  projects,
  onRefresh,
  onOpenProject,
}: ProjectsViewProps) {
  const isFr = language === 'fr';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGenre, setNewGenre] = useState('Science-Fiction');
  const [newMinutes, setNewMinutes] = useState(5);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.genre.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'archived') return p.status === 'archived';
    if (statusFilter === 'active') return p.status !== 'archived';
    return true;
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          genre: newGenre,
          targetDurationMinutes: newMinutes,
        }),
      });
      setNewTitle('');
      setNewDesc('');
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      await apiFetch(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await apiFetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleArchiveToggle(proj: ProjectRecord) {
    try {
      await apiFetch(`/api/projects/${proj.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: proj.status === 'archived' ? 'draft' : 'archived' }),
      });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Mes Projets' : 'My Projects'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Organisez vos films, campagnes publicitaires, scènes et paramètres de continuité.'
              : 'Organize your films, commercials, scenes, and continuity parameters.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label={isFr ? 'Rechercher un projet' : 'Search projects'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isFr ? 'Rechercher...' : 'Search...'}
            className="px-3 py-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-sm text-[#F4F7FB] w-48"
          />
          <div className="flex p-1 rounded-lg bg-[#0E1629] border border-[#1E3254]">
            {(['active', 'archived', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  statusFilter === f ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {f === 'active' ? (isFr ? 'Actifs' : 'Active') : f === 'archived' ? (isFr ? 'Archivés' : 'Archived') : isFr ? 'Tous' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create New Project */}
      <form onSubmit={handleCreate} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-3">
          <label htmlFor="prj-title" className="block text-xs text-[#CBD5E1] mb-1">
            {isFr ? 'Titre du projet' : 'Project title'}
          </label>
          <input
            id="prj-title"
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isFr ? 'Nom du projet' : 'Project name'}
            className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
          />
        </div>
        <div className="lg:col-span-4">
          <label htmlFor="prj-desc" className="block text-xs text-[#CBD5E1] mb-1">
            {isFr ? 'Description' : 'Description'}
          </label>
          <input
            id="prj-desc"
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={isFr ? 'Synopsis ou objectif créatif' : 'Synopsis or creative brief'}
            className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="prj-genre" className="block text-xs text-[#CBD5E1] mb-1">
            {isFr ? 'Genre' : 'Genre'}
          </label>
          <input
            id="prj-genre"
            type="text"
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
          />
        </div>
        <div className="lg:col-span-1">
          <label htmlFor="prj-min" className="block text-xs text-[#CBD5E1] mb-1">
            Min
          </label>
          <input
            id="prj-min"
            type="number"
            min={1}
            max={60}
            value={newMinutes}
            onChange={(e) => setNewMinutes(Number(e.target.value))}
            className="w-full px-2.5 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm font-mono tabular-nums text-[#F4F7FB]"
          />
        </div>
        <div className="lg:col-span-2">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{isFr ? 'Créer' : 'Create'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-10 text-center text-sm text-[#94A3B8]">
          {isFr ? 'Aucun projet ne correspond à vos filtres.' : 'No projects match your filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((proj) => (
            <div key={proj.id} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 flex flex-col justify-between gap-4">
              {editingId === proj.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#3978FF] text-sm text-[#F4F7FB]"
                  />
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(proj.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#3978FF] text-white text-xs font-medium"
                    >
                      {isFr ? 'Enregistrer' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg bg-[#14243D] text-[#CBD5E1] text-xs"
                    >
                      {isFr ? 'Annuler' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">{proj.title}</h2>
                    <span className="text-xs font-mono text-[#A78BFA] shrink-0">
                      {proj.targetDurationMinutes} min · {proj.aspectRatio}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2">{proj.description || proj.genre}</p>
                  <div className="text-xs text-[#64748B] mt-3 font-mono tabular-nums">
                    {proj.genre} · {proj.sceneCount ?? 0} {isFr ? 'scènes' : 'scenes'} · {proj.assetCount ?? 0} {isFr ? 'médias' : 'assets'}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#1E3254] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProject('film', proj.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-xs font-medium"
                  >
                    {isFr ? 'Film Engine' : 'Film Engine'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProject('editing', proj.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#14243D] hover:bg-[#1E3356] text-[#F4F7FB] text-xs font-medium"
                  >
                    {isFr ? 'Montage' : 'Edit'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Renommer' : 'Rename'} ${proj.title}`}
                    onClick={() => {
                      setEditingId(proj.id);
                      setEditTitle(proj.title);
                      setEditDesc(proj.description);
                    }}
                    className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#14243D]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Dupliquer' : 'Duplicate'} ${proj.title}`}
                    onClick={() => handleDuplicate(proj.id)}
                    className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#14243D]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Archiver' : 'Archive'} ${proj.title}`}
                    onClick={() => handleArchiveToggle(proj)}
                    className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#14243D]"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Supprimer' : 'Delete'} ${proj.title}`}
                    onClick={() => handleDelete(proj.id)}
                    className="p-2 rounded-lg text-[#94A3B8] hover:text-red-300 hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
