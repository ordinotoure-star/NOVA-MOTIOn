import { ArrowUpRight, Download, Flag, Trash2, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { Language, MediaAssetRecord } from '../../shared/types';
import { MediaThumb } from '../MediaThumb';

interface LibraryViewProps {
  language: Language;
  assets: MediaAssetRecord[];
  onRefresh: () => void;
}

export function LibraryView({ language, assets, onRefresh }: LibraryViewProps) {
  const isFr = language === 'fr';
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio' | 'film_export'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = assets.filter((a) => {
    if (filter !== 'all' && a.kind !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.prompt.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiFetch('/api/assets/upload', { method: 'POST', body: form });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleUpscale(assetId: string) {
    setBusyId(assetId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/assets/${assetId}/upscale`, { method: 'POST' });
      onRefresh();
      setNotice(isFr ? 'Version agrandie (FFmpeg Lanczos) ajoutée à votre bibliothèque.' : 'FFmpeg-upscaled version added to library.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReport(assetId: string) {
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ assetId, reason: 'Vérification droits / contenu', details: 'Signalé depuis la bibliothèque' }),
      });
      setNotice(isFr ? 'Signalement enregistré pour examen par l’équipe modération.' : 'Content report logged for moderation review.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(assetId: string) {
    try {
      await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Ma Bibliothèque' : 'My Library'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Tous vos médias générés, importés et exportés avec traçabilité résolution native vs améliorée.'
              : 'All generated, uploaded, and exported media with transparent native vs upscaled metadata.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label={isFr ? 'Filtrer les médias' : 'Filter assets'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isFr ? 'Rechercher...' : 'Search...'}
            className="px-3 py-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-sm text-[#F4F7FB] w-44"
          />
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium cursor-pointer whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span>{uploading ? (isFr ? 'Import...' : 'Uploading...') : isFr ? 'Importer un média' : 'Upload media'}</span>
            <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-[#0E1629] border border-[#1E3254] w-fit">
        {(
          [
            ['all', isFr ? 'Tout' : 'All'],
            ['video', isFr ? 'Vidéos' : 'Videos'],
            ['image', isFr ? 'Images' : 'Images'],
            ['audio', isFr ? 'Audio / Voix' : 'Audio'],
            ['film_export', isFr ? 'Films exportés' : 'Film Exports'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === k ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200">
          {notice}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-10 text-center text-sm text-[#94A3B8]">
          {isFr ? 'Aucun média trouvé dans cette catégorie.' : 'No assets found in this category.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((asset) => (
            <div key={asset.id} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <MediaThumb
                  kind={asset.kind}
                  src={asset.fileUrl}
                  thumbnailUrl={asset.thumbnailUrl}
                  title={asset.title}
                  playable={asset.kind === 'video' || asset.kind === 'film_export'}
                />
                <h2 className="text-sm font-semibold text-[#F4F7FB] mt-3 truncate">{asset.title}</h2>
                <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{asset.prompt}</p>
                <div className="mt-2 text-xs text-[#64748B] font-mono tabular-nums">
                  {asset.outputResolution} · {asset.isUpscaled ? (isFr ? 'Amélioré' : 'Upscaled') : isFr ? 'Natif' : 'Native'} ·{' '}
                  {(asset.fileSizeBytes / 1024).toFixed(0)} KB
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E3254] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(asset.kind === 'image' || asset.kind === 'video') && (
                    <button
                      type="button"
                      disabled={busyId === asset.id}
                      onClick={() => handleUpscale(asset.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#A78BFA] hover:text-white"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{busyId === asset.id ? '...' : 'Upscale'}</span>
                    </button>
                  )}
                  <a
                    href={asset.fileUrl}
                    download
                    className="inline-flex items-center gap-1 text-xs text-[#3978FF] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isFr ? 'Télécharger' : 'Download'}</span>
                  </a>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Signaler' : 'Report'} ${asset.title}`}
                    onClick={() => handleReport(asset.id)}
                    className="p-1.5 rounded text-[#94A3B8] hover:text-amber-300"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isFr ? 'Supprimer' : 'Delete'} ${asset.title}`}
                    onClick={() => handleDelete(asset.id)}
                    className="p-1.5 rounded text-[#94A3B8] hover:text-red-300"
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
