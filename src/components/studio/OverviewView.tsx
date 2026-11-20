import { ArrowRight } from 'lucide-react';
import { tStatus } from '../../i18n/translations';
import type {
  GenerationJobRecord,
  Language,
  MediaAssetRecord,
  ProjectRecord,
  UserProfile,
  WalletInfo,
} from '../../shared/types';
import { MediaThumb } from '../MediaThumb';
import {
  IconFilmEngine,
  IconImageEngine,
  IconOrchestrator,
  IconProjects,
  IconSubscriptions,
  IconVideoEngine,
  IconWalletCredit,
} from './StudioIcons';

export type StudioTab =
  | 'overview'
  | 'video'
  | 'image'
  | 'film'
  | 'editing'
  | 'projects'
  | 'library'
  | 'history'
  | 'subscriptions'
  | 'settings'
  | 'support'
  | 'admin';

interface OverviewViewProps {
  language: Language;
  user: UserProfile;
  wallet: WalletInfo | null;
  projects: ProjectRecord[];
  generations: GenerationJobRecord[];
  assets: MediaAssetRecord[];
  onNavigate: (tab: StudioTab, projectId?: string) => void;
}

export function OverviewView({
  language,
  user,
  wallet,
  projects,
  generations,
  assets,
  onNavigate,
}: OverviewViewProps) {
  const isFr = language === 'fr';
  const activeJobs = generations.filter((g) =>
    ['pending', 'preparing', 'generating', 'verifying', 'assembling'].includes(g.status),
  );
  const completedVideos = assets.filter((a) => a.kind === 'video' || a.kind === 'film_export').length;
  const completedImages = assets.filter((a) => a.kind === 'image').length;
  const availableCredits = wallet ? Math.max(0, wallet.balance - wallet.reserved) : 0;

  return (
    <div className="space-y-8">
      {/* Primary Action Header */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-6 border-b border-[#1E3254]">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F4F7FB] tracking-tight">
            {isFr ? `Bonjour, ${user.fullName}` : `Welcome back, ${user.fullName}`}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Votre studio de création audiovisuelle IA — séquences 15s, images HD et films jusqu’à 60 minutes.'
              : 'Your AI audiovisual production studio — 15s shots, high-res images, and feature films up to 60 minutes.'}
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('video')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <IconVideoEngine className="w-[18px] h-[18px]" />
            <span>{isFr ? 'Créer une vidéo' : 'Create video'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('image')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14243D] hover:bg-[#1C3254] text-[#F4F7FB] text-sm font-medium border border-[#243B63] transition-colors whitespace-nowrap"
          >
            <IconImageEngine className="w-[18px] h-[18px] text-[#A78BFA]" />
            <span>{isFr ? 'Générer une image' : 'Generate image'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('film')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14243D] hover:bg-[#1C3254] text-[#F4F7FB] text-sm font-medium border border-[#243B63] transition-colors whitespace-nowrap"
          >
            <IconFilmEngine className="w-[18px] h-[18px] text-[#3978FF]" />
            <span>{isFr ? 'Créer un film' : 'Create film'}</span>
          </button>
        </div>
      </section>

      {/* Key Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>{isFr ? 'Crédits disponibles' : 'Available credits'}</span>
            <IconWalletCredit className="w-4 h-4 text-[#3978FF]" />
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB] mt-1.5">
            {availableCredits.toLocaleString()}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-mono tabular-nums">
            {wallet?.reserved ? `${wallet.reserved} ${isFr ? 'réservés' : 'reserved'}` : isFr ? 'Aucune réservation' : 'No hold'}
          </div>
        </div>

        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>{isFr ? 'Abonnement actif' : 'Active plan'}</span>
            <IconSubscriptions className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div className="font-display text-2xl font-semibold text-[#A78BFA] mt-1.5 uppercase">
            {user.planId}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('subscriptions')}
            className="text-xs text-[#3978FF] hover:underline mt-1"
          >
            {isFr ? 'Gérer l’abonnement' : 'Manage plan'}
          </button>
        </div>

        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>{isFr ? 'Vidéos & Films' : 'Videos & Films'}</span>
            <IconVideoEngine className="w-4 h-4 text-[#3978FF]" />
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB] mt-1.5">
            {completedVideos}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            {isFr ? `${projects.length} projets actifs` : `${projects.length} active projects`}
          </div>
        </div>

        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>{isFr ? 'Images & Références' : 'Images & References'}</span>
            <IconImageEngine className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB] mt-1.5">
            {completedImages}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            {activeJobs.length > 0
              ? `${activeJobs.length} ${isFr ? 'tâches en cours' : 'jobs running'}`
              : isFr
                ? 'File d’attente disponible'
                : 'Queue ready'}
          </div>
        </div>
      </section>

      {/* Active Queue + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
              {isFr ? 'Projets récents' : 'Recent projects'}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs text-[#3978FF] hover:underline inline-flex items-center gap-1"
            >
              <span>{isFr ? 'Tous les projets' : 'All projects'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#94A3B8]">
              {isFr ? 'Aucun projet pour le moment.' : 'No projects yet.'}
            </div>
          ) : (
            <div className="divide-y divide-[#1E3254]">
              {projects.slice(0, 4).map((proj) => (
                <div key={proj.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <IconProjects className="w-[18px] h-[18px] text-[#3978FF] shrink-0" />
                      <span className="text-sm font-medium text-[#F4F7FB] truncate">{proj.title}</span>
                    </div>
                    <div className="text-xs text-[#94A3B8] mt-1 truncate">
                      {proj.genre} · {proj.targetDurationMinutes} min · {proj.aspectRatio} · {proj.coherenceScoreText}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('film', proj.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#14243D] hover:bg-[#1E3356] text-xs font-medium text-[#F4F7FB] whitespace-nowrap shrink-0"
                  >
                    {isFr ? 'Ouvrir' : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
                {isFr ? 'Générations récentes' : 'Recent generations'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs text-[#3978FF] hover:underline"
              >
                {isFr ? 'Historique' : 'History'}
              </button>
            </div>
            {generations.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">
                {isFr ? 'Aucune tâche lancée.' : 'No jobs launched yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {generations.slice(0, 4).map((job) => (
                  <div key={job.id} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#F4F7FB] truncate max-w-[65%]">{job.prompt}</span>
                      <span className="font-mono text-[#A78BFA] shrink-0">{tStatus(language, job.status)}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-[#14243D] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3978FF] transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#A78BFA] mb-2">
              <IconOrchestrator className="w-4 h-4" />
              <span>{isFr ? 'Annonces & Nouveautés' : 'Platform Updates'}</span>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {isFr
                ? 'NOVA FILM ENGINE v1.0 : découpage automatique jusqu’à 60 minutes, synthèse vocale multi-locuteurs Gemini 3.8 TTS et assemblage FFmpeg intégré.'
                : 'NOVA FILM ENGINE v1.0: automated breakdown up to 60 minutes, Gemini 3.8 multi-speaker TTS dialogue, and integrated FFmpeg export.'}
            </p>
          </div>
        </section>
      </div>

      {/* Recent Media Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-[#F4F7FB]">
            {isFr ? 'Derniers médias du studio' : 'Latest studio media'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="text-xs text-[#3978FF] hover:underline"
          >
            {isFr ? 'Explorer la bibliothèque' : 'Browse library'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {assets.slice(0, 4).map((asset) => (
            <div key={asset.id} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-3">
              <MediaThumb
                kind={asset.kind}
                src={asset.fileUrl}
                thumbnailUrl={asset.thumbnailUrl}
                title={asset.title}
                playable={asset.kind === 'video' || asset.kind === 'film_export'}
              />
              <div className="mt-3">
                <div className="text-sm font-medium text-[#F4F7FB] truncate">{asset.title}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5 font-mono tabular-nums">
                  {asset.outputResolution} · {asset.isUpscaled ? (isFr ? 'Amélioré' : 'Upscaled') : isFr ? 'Natif' : 'Native'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
