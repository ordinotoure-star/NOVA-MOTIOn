import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { AdminView } from './components/studio/AdminView';
import { DashboardLayout } from './components/studio/DashboardLayout';
import { EditingStudioView } from './components/studio/EditingStudioView';
import { FilmEngineView } from './components/studio/FilmEngineView';
import { HistoryView } from './components/studio/HistoryView';
import { ImageGeneratorView } from './components/studio/ImageGeneratorView';
import { LibraryView } from './components/studio/LibraryView';
import { OverviewView, type StudioTab } from './components/studio/OverviewView';
import { ProjectsView } from './components/studio/ProjectsView';
import { SettingsView } from './components/studio/SettingsView';
import { SubscriptionsView } from './components/studio/SubscriptionsView';
import { SupportView } from './components/studio/SupportView';
import { VideoGeneratorView } from './components/studio/VideoGeneratorView';
import { apiFetch } from './services/api';
import type {
  AIModelConfig,
  GenerationJobRecord,
  Language,
  MediaAssetRecord,
  NotificationRecord,
  ProjectRecord,
  TransactionRecord,
  UserProfile,
  WalletInfo,
} from './shared/types';

function mapJob(row: Record<string, unknown>): GenerationJobRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: row.project_id ? String(row.project_id) : null,
    sceneId: row.scene_id ? String(row.scene_id) : null,
    category: row.category as GenerationJobRecord['category'],
    mode: String(row.mode),
    prompt: String(row.prompt),
    enhancedPrompt: row.enhanced_prompt ? String(row.enhanced_prompt) : null,
    modelId: String(row.model_id),
    autoSelected: Boolean(row.auto_selected),
    status: row.status as GenerationJobRecord['status'],
    progress: Number(row.progress ?? 0),
    estimatedCredits: Number(row.estimated_credits ?? 0),
    reservedCredits: Number(row.reserved_credits ?? 0),
    chargedCredits: Number(row.charged_credits ?? 0),
    refundedCredits: Number(row.refunded_credits ?? 0),
    errorMessage: row.error_message ? String(row.error_message) : null,
    outputAssetId: row.output_asset_id ? String(row.output_asset_id) : null,
    outputUrl: row.output_url ? String(row.output_url) : null,
    metadataJson: String(row.metadata_json || '{}'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAsset(row: Record<string, unknown>): MediaAssetRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    projectId: row.project_id ? String(row.project_id) : null,
    kind: row.kind as MediaAssetRecord['kind'],
    title: String(row.title),
    prompt: String(row.prompt),
    fileUrl: String(row.file_url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    mimeType: String(row.mime_type),
    width: Number(row.width ?? 0),
    height: Number(row.height ?? 0),
    durationSeconds: row.duration_seconds !== null && row.duration_seconds !== undefined ? Number(row.duration_seconds) : null,
    nativeResolution: String(row.native_resolution),
    outputResolution: String(row.output_resolution),
    isUpscaled: Boolean(row.is_upscaled),
    modelId: String(row.model_id),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    createdAt: String(row.created_at),
  };
}

function mapProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    description: String(row.description),
    genre: String(row.genre),
    targetDurationMinutes: Number(row.target_duration_minutes),
    aspectRatio: String(row.aspect_ratio),
    visualStyle: String(row.visual_style),
    status: row.status as ProjectRecord['status'],
    coherenceScoreText: String(row.coherence_score_text),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sceneCount: row.scene_count !== undefined ? Number(row.scene_count) : undefined,
    assetCount: row.asset_count !== undefined ? Number(row.asset_count) : undefined,
  };
}

export default function App() {
  const [language, setLanguage] = useState<Language>('fr');
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<StudioTab>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [generations, setGenerations] = useState<GenerationJobRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [walletRes, modelsRes, projRes, assetsRes, gensRes, notifRes] = await Promise.all([
        apiFetch<{ wallet: Record<string, unknown>; transactions: Array<Record<string, unknown>> }>('/api/wallet'),
        apiFetch<{ models: AIModelConfig[] }>('/api/models'),
        apiFetch<{ projects: Array<Record<string, unknown>> }>('/api/projects'),
        apiFetch<{ assets: Array<Record<string, unknown>> }>('/api/assets'),
        apiFetch<{ generations: Array<Record<string, unknown>> }>('/api/generations'),
        apiFetch<{ notifications: Array<Record<string, unknown>> }>('/api/notifications'),
      ]);

      if (walletRes.wallet) {
        setWallet({
          userId: String(walletRes.wallet.user_id),
          balance: Number(walletRes.wallet.balance),
          reserved: Number(walletRes.wallet.reserved),
          monthlySpent: Number(walletRes.wallet.monthly_spent),
          dailyLimit: Number(walletRes.wallet.daily_limit),
          lowBalanceThreshold: Number(walletRes.wallet.low_balance_threshold),
        });
      }

      setTransactions(
        walletRes.transactions.map((t) => ({
          id: String(t.id),
          userId: String(t.user_id),
          type: t.type as TransactionRecord['type'],
          amount: Number(t.amount),
          balanceAfter: Number(t.balance_after),
          description: String(t.description),
          paymentMethod: String(t.payment_method),
          referenceId: t.reference_id ? String(t.reference_id) : null,
          createdAt: String(t.created_at),
        })),
      );
      setModels(modelsRes.models);
      setProjects(projRes.projects.map(mapProject));
      setAssets(assetsRes.assets.map(mapAsset));
      setGenerations(gensRes.generations.map(mapJob));
      setNotifications(
        notifRes.notifications.map((n) => ({
          id: String(n.id),
          userId: String(n.user_id),
          title: String(n.title),
          message: String(n.message),
          kind: n.kind as NotificationRecord['kind'],
          read: Boolean(n.read),
          createdAt: String(n.created_at),
        })),
      );
    } catch {
      // Ignore if logged out
    }
  }, []);

  useEffect(() => {
    async function initSession() {
      const params = new URLSearchParams(window.location.search);
      try {
        const session = await apiFetch<{ authenticated: boolean; user: UserProfile | null }>('/api/auth/session');
        if (session.authenticated && session.user) {
          setUser(session.user);
          setLanguage(session.user.language || 'fr');
          await loadWorkspaceData();
        } else if (params.get('autostart') === '1') {
          const demo = await apiFetch<{ user: UserProfile }>('/api/auth/demo-login', {
            method: 'POST',
            body: JSON.stringify({ account: 'creator' }),
          });
          setUser(demo.user);
          await loadWorkspaceData();
        }
      } catch {
        // Fall back to public landing
      } finally {
        setBooting(false);
      }
    }
    void initSession();
  }, [loadWorkspaceData]);

  // Real-time SSE updates for active generation jobs & notifications
  useEffect(() => {
    if (!user) return;
    const source = new EventSource('/api/generations/stream', { withCredentials: true });
    source.addEventListener('generation_update', (ev) => {
      try {
        const updated = mapJob(JSON.parse((ev as MessageEvent).data));
        setGenerations((prev) => {
          const exists = prev.some((g) => g.id === updated.id);
          return exists ? prev.map((g) => (g.id === updated.id ? updated : g)) : [updated, ...prev];
        });
        if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
          void loadWorkspaceData();
        }
      } catch {
        // Ignore parse error
      }
    });
    source.addEventListener('notification', (ev) => {
      try {
        const notif = JSON.parse((ev as MessageEvent).data) as NotificationRecord;
        setNotifications((prev) => [notif, ...prev]);
      } catch {
        // Ignore parse error
      }
    });
    return () => source.close();
  }, [user, loadWorkspaceData]);

  async function handleQuickEnterStudio() {
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ account: 'creator' }),
      });
      setUser(res.user);
      await loadWorkspaceData();
    } catch {
      setAuthModalOpen(true);
    }
  }

  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setActiveTab('overview');
  }

  function handleNavigate(tab: StudioTab, projectId?: string) {
    if (projectId) setSelectedProjectId(projectId);
    setActiveTab(tab);
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-[#080D19] text-[#94A3B8] flex items-center justify-center text-sm">
        NOVA MOTION AI…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          language={language}
          onLanguageChange={setLanguage}
          onOpenAuth={() => setAuthModalOpen(true)}
          onQuickEnterStudio={handleQuickEnterStudio}
        />
        <AuthModal
          open={authModalOpen}
          language={language}
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={(u) => {
            setUser(u);
            setLanguage(u.language || language);
            setAuthModalOpen(false);
            void loadWorkspaceData();
          }}
        />
      </>
    );
  }

  return (
    <DashboardLayout
      language={language}
      user={user}
      wallet={wallet}
      activeTab={activeTab}
      notifications={notifications}
      onSelectTab={setActiveTab}
      onLanguageChange={(lang) => {
        setLanguage(lang);
        void apiFetch('/api/profile', { method: 'PATCH', body: JSON.stringify({ language: lang }) }).catch(() => {});
      }}
      onMarkNotificationsRead={() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        void apiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
      }}
      onLogout={handleLogout}
    >
      {activeTab === 'overview' && (
        <OverviewView
          language={language}
          user={user}
          wallet={wallet}
          projects={projects}
          generations={generations}
          assets={assets}
          onNavigate={handleNavigate}
        />
      )}
      {activeTab === 'video' && (
        <VideoGeneratorView
          language={language}
          models={models}
          projects={projects}
          generations={generations}
          onJobCreated={() => void loadWorkspaceData()}
        />
      )}
      {activeTab === 'image' && (
        <ImageGeneratorView
          language={language}
          models={models}
          projects={projects}
          generations={generations}
          assets={assets}
          onRefresh={() => void loadWorkspaceData()}
        />
      )}
      {activeTab === 'film' && (
        <FilmEngineView
          language={language}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onNavigate={handleNavigate}
          onRefreshProjects={() => void loadWorkspaceData()}
        />
      )}
      {activeTab === 'editing' && (
        <EditingStudioView
          language={language}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onRefreshAssets={() => void loadWorkspaceData()}
        />
      )}
      {activeTab === 'projects' && (
        <ProjectsView
          language={language}
          projects={projects}
          onRefresh={() => void loadWorkspaceData()}
          onOpenProject={handleNavigate}
        />
      )}
      {activeTab === 'library' && (
        <LibraryView
          language={language}
          assets={assets}
          onRefresh={() => void loadWorkspaceData()}
        />
      )}
      {activeTab === 'history' && (
        <HistoryView
          language={language}
          generations={generations}
          transactions={transactions}
        />
      )}
      {activeTab === 'subscriptions' && (
        <SubscriptionsView
          language={language}
          user={user}
          wallet={wallet}
          onRefresh={async () => {
            const me = await apiFetch<{ user: UserProfile }>('/api/auth/me');
            setUser(me.user);
            await loadWorkspaceData();
          }}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsView
          language={language}
          user={user}
          onUserUpdated={setUser}
          onLanguageChange={(lang) => {
            setLanguage(lang);
            void apiFetch('/api/profile', { method: 'PATCH', body: JSON.stringify({ language: lang }) }).catch(() => {});
          }}
          onLoggedOut={() => setUser(null)}
        />
      )}
      {activeTab === 'support' && <SupportView language={language} />}
      {activeTab === 'admin' && (
        <AdminView
          language={language}
          onCatalogUpdated={() => void loadWorkspaceData()}
        />
      )}
    </DashboardLayout>
  );
}
