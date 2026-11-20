import { Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { AIModelConfig, AuditLogRecord, Language, PlanTierId, UserRole } from '../../shared/types';
import { IconAdmin, IconHistory, IconOrchestrator } from './StudioIcons';

interface AdminViewProps {
  language: Language;
  onCatalogUpdated: () => void;
}

export function AdminView({ language, onCatalogUpdated }: AdminViewProps) {
  const isFr = language === 'fr';
  const [tab, setTab] = useState<'overview' | 'models' | 'users' | 'audit'>('overview');
  const [data, setData] = useState<{
    kpis: Record<string, string | number>;
    users: Array<Record<string, unknown>>;
    models: AIModelConfig[];
    auditLogs: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
    reports: Array<Record<string, unknown>>;
  } | null>(null);

  const [newModelName, setNewModelName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState('');
  const [newModelCategory, setNewModelCategory] = useState('video');
  const [newModelSdkId, setNewModelSdkId] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAdmin() {
    try {
      const res = await apiFetch<typeof data>('/api/admin/overview');
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void loadAdmin();
  }, []);

  async function handleToggleModel(model: AIModelConfig) {
    try {
      await apiFetch(`/api/admin/models/${model.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !model.enabled }),
      });
      await loadAdmin();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleTestModel(modelId: string) {
    setTestResult(null);
    try {
      const res = await apiFetch<{ ok: boolean; statusText: string }>(`/api/admin/models/${modelId}/test`, {
        method: 'POST',
      });
      setTestResult(res.statusText);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddModel(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/models', {
        method: 'POST',
        body: JSON.stringify({
          name: newModelName,
          provider: newModelProvider,
          category: newModelCategory,
          sdkModelId: newModelSdkId,
        }),
      });
      setNewModelName('');
      setNewModelProvider('');
      setNewModelSdkId('');
      await loadAdmin();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateUser(userId: string, patch: { role?: UserRole; suspended?: boolean; planId?: PlanTierId; creditAdjustment?: number }) {
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await loadAdmin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleResolveTicket(id: string) {
    try {
      await apiFetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });
      await loadAdmin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!data) {
    return (
      <div className="p-8 text-sm text-[#94A3B8]">
        {error ? error : isFr ? 'Chargement de la console d’administration...' : 'Loading admin console...'}
      </div>
    );
  }

  const auditLogs: AuditLogRecord[] = data.auditLogs.map((a) => ({
    id: String(a.id),
    actorUserId: a.actor_user_id ? String(a.actor_user_id) : null,
    actorEmail: String(a.actor_email),
    action: String(a.action),
    targetType: String(a.target_type),
    targetId: String(a.target_id),
    details: String(a.details),
    ipAddress: String(a.ip_address),
    createdAt: String(a.created_at),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Administration Générale' : 'Platform Administration'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Supervision GPU, catalogue des modèles IA, gestion des utilisateurs, modération et journaux d’audit.'
              : 'Platform KPIs, AI model catalog, user & role governance, moderation, and security audit logs.'}
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap shrink-0 gap-1 p-1 rounded-lg bg-[#0E1629] border border-[#1E3254]">
          {(
            [
              ['overview', isFr ? 'Tableau de bord' : 'KPIs', IconHistory],
              ['models', isFr ? 'Modèles IA' : 'AI Models', IconOrchestrator],
              ['users', isFr ? 'Utilisateurs' : 'Users', Users],
              ['audit', isFr ? 'Audit & Modération' : 'Audit & Reports', IconAdmin],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                tab === id ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
          {error}
        </div>
      )}
      {testResult && (
        <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200">
          {testResult}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              [isFr ? 'Utilisateurs totaux' : 'Total users', data.kpis.totalUsers],
              [isFr ? 'Utilisateurs actifs' : 'Active users', data.kpis.activeUsers],
              [isFr ? 'Abonnés payants' : 'Paid subscribers', data.kpis.subscribers],
              [isFr ? 'MRR estimé (USD)' : 'Est. MRR (USD)', `$${data.kpis.monthlyRecurringUsd}`],
              [isFr ? 'Tâches générées' : 'Total generations', data.kpis.dailyGenerations],
              [isFr ? 'Vidéos stockées' : 'Video assets', data.kpis.videosGenerated],
              [isFr ? 'Images produites' : 'Image assets', data.kpis.imagesGenerated],
              [isFr ? 'Films exportés' : 'Films exported', data.kpis.filmsExported],
              [isFr ? 'Taux d’échec' : 'Failure rate', `${data.kpis.failureRatePct}%`],
              [isFr ? 'Stockage objet' : 'Object storage', `${data.kpis.storageMb} MB`],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-4">
                <div className="text-xs text-[#94A3B8]">{label}</div>
                <div className="font-mono text-xl font-semibold tabular-nums text-[#F4F7FB] mt-1">{val}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 flex items-center justify-between text-xs">
            <span className="text-[#CBD5E1]">{isFr ? 'État de l’infrastructure' : 'Infrastructure status'}</span>
            <span className="font-mono text-emerald-300">{String(data.kpis.serverStatus)}</span>
          </div>
        </div>
      )}

      {tab === 'models' && (
        <div className="space-y-6">
          <form onSubmit={handleAddModel} className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label htmlFor="adm-m-name" className="block text-xs text-[#94A3B8] mb-1">
                {isFr ? 'Nom du modèle' : 'Model name'}
              </label>
              <input
                id="adm-m-name"
                type="text"
                required
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Ex. Veo 3.1 Adapter"
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="adm-m-prov" className="block text-xs text-[#94A3B8] mb-1">
                {isFr ? 'Fournisseur' : 'Provider'}
              </label>
              <input
                id="adm-m-prov"
                type="text"
                required
                value={newModelProvider}
                onChange={(e) => setNewModelProvider(e.target.value)}
                placeholder="Google / Runway"
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              />
            </div>
            <div>
              <label htmlFor="adm-m-cat" className="block text-xs text-[#94A3B8] mb-1">
                {isFr ? 'Catégorie' : 'Category'}
              </label>
              <select
                id="adm-m-cat"
                value={newModelCategory}
                onChange={(e) => setNewModelCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
              >
                <option value="video">video</option>
                <option value="image">image</option>
                <option value="audio">audio</option>
                <option value="music">music</option>
              </select>
            </div>
            <div>
              <label htmlFor="adm-m-sdk" className="block text-xs text-[#94A3B8] mb-1">
                SDK ID
              </label>
              <input
                id="adm-m-sdk"
                type="text"
                required
                value={newModelSdkId}
                onChange={(e) => setNewModelSdkId(e.target.value)}
                placeholder="veo-3-adapter"
                className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs font-mono text-[#F4F7FB]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isFr ? 'Ajouter' : 'Add model'}</span>
            </button>
          </form>

          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1E3254] text-[#94A3B8]">
                <tr>
                  <th className="py-3 px-4">{isFr ? 'Modèle' : 'Model'}</th>
                  <th className="py-3 px-4">{isFr ? 'Fournisseur' : 'Provider'}</th>
                  <th className="py-3 px-4">{isFr ? 'Catégorie' : 'Category'}</th>
                  <th className="py-3 px-4">{isFr ? 'Palier min.' : 'Min tier'}</th>
                  <th className="py-3 px-4 text-right">{isFr ? 'Appels / Échec' : 'Calls / Fail'}</th>
                  <th className="py-3 px-4 text-right">{isFr ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3254]/70">
                {data.models.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#F4F7FB]">{m.name}</div>
                      <div className="font-mono text-[11px] text-[#64748B]">{m.sdkModelId}</div>
                    </td>
                    <td className="py-3 px-4 text-[#CBD5E1]">{m.provider}</td>
                    <td className="py-3 px-4 font-mono text-[#A78BFA]">{m.category}</td>
                    <td className="py-3 px-4 uppercase font-mono text-[#CBD5E1]">{m.minPlanTier}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#CBD5E1]">
                      {m.totalCalls ?? 0} · {m.failureRate ?? 0}%
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleTestModel(m.id)}
                        className="px-2.5 py-1 rounded bg-[#14243D] text-[#3978FF] hover:text-white"
                      >
                        {isFr ? 'Tester' : 'Test'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleModel(m)}
                        className={`px-2.5 py-1 rounded ${
                          m.enabled ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-300'
                        }`}
                      >
                        {m.enabled ? (isFr ? 'Actif' : 'Enabled') : isFr ? 'Désactivé' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1E3254] text-[#94A3B8]">
              <tr>
                <th className="py-3 px-4">{isFr ? 'Utilisateur' : 'User'}</th>
                <th className="py-3 px-4">{isFr ? 'Rôle' : 'Role'}</th>
                <th className="py-3 px-4">{isFr ? 'Offre' : 'Plan'}</th>
                <th className="py-3 px-4">{isFr ? 'Statut' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{isFr ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3254]/70">
              {data.users.map((u) => (
                <tr key={String(u.id)}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#F4F7FB]">{String(u.full_name)}</div>
                    <div className="text-[#94A3B8]">{String(u.email)}</div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      aria-label={`Role for ${String(u.email)}`}
                      value={String(u.role)}
                      onChange={(e) => handleUpdateUser(String(u.id), { role: e.target.value as UserRole })}
                      className="px-2 py-1 rounded bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
                    >
                      <option value="free">free</option>
                      <option value="basic">basic</option>
                      <option value="plus">plus</option>
                      <option value="pro">pro</option>
                      <option value="annual_1">annual_1</option>
                      <option value="annual_2">annual_2</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 font-mono uppercase text-[#A78BFA]">{String(u.plan_id)}</td>
                  <td className="py-3 px-4">
                    {u.suspended ? (
                      <span className="text-red-300">{isFr ? 'Suspendu' : 'Suspended'}</span>
                    ) : (
                      <span className="text-emerald-300">{isFr ? 'Actif' : 'Active'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(String(u.id), { creditAdjustment: 100 })}
                      className="px-2.5 py-1 rounded bg-[#14243D] text-[#3978FF] hover:text-white"
                    >
                      +100 cr.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(String(u.id), { suspended: !u.suspended })}
                      className="px-2.5 py-1 rounded bg-[#080D19] border border-[#1E3254] text-amber-300"
                    >
                      {u.suspended ? (isFr ? 'Réactiver' : 'Reactivate') : isFr ? 'Suspendre' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Journaux de sécurité & Actions admin' : 'Security Audit Logs'}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-[#3978FF]">{log.action}</span>
                    <span className="font-mono text-[#64748B]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-[#CBD5E1] mt-1">{log.details}</div>
                  <div className="text-[#94A3B8] mt-0.5">{log.actorEmail} · {log.ipAddress}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Tickets & Signalements' : 'Support Tickets & Content Reports'}
            </h2>
            <div className="space-y-2.5">
              {data.tickets.length === 0 && data.reports.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucun élément en attente.' : 'No pending items.'}</p>
              ) : (
                <>
                  {data.tickets.map((t) => (
                    <div key={String(t.id)} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#F4F7FB]">{String(t.subject)}</div>
                        <div className="text-[#94A3B8]">{String(t.user_email)} · {String(t.status)}</div>
                      </div>
                      {t.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => handleResolveTicket(String(t.id))}
                          className="px-2.5 py-1 rounded bg-[#3978FF] text-white"
                        >
                          {isFr ? 'Résoudre' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  ))}
                  {data.reports.map((r) => (
                    <div key={String(r.id)} className="p-3 rounded-lg bg-[#080D19] border border-amber-900/40 text-xs">
                      <div className="font-medium text-amber-200">{String(r.reason)}</div>
                      <div className="text-[#94A3B8]">{String(r.details)}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
