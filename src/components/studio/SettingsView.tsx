import { Download, KeyRound, Laptop, LogOut, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { ApiKeyRecord, Language, UserProfile } from '../../shared/types';

interface SettingsViewProps {
  language: Language;
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onLanguageChange: (lang: Language) => void;
  onLoggedOut: () => void;
}

export function SettingsView({
  language,
  user,
  onUserUpdated,
  onLanguageChange,
  onLoggedOut,
}: SettingsViewProps) {
  const isFr = language === 'fr';
  const [fullName, setFullName] = useState(user.fullName);
  const [organization, setOrganization] = useState(user.organization);
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled);

  const [devices, setDevices] = useState<Array<Record<string, unknown>>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSecurityData() {
    try {
      const [devRes, keyRes] = await Promise.all([
        apiFetch<{ devices: Array<Record<string, unknown>>; currentSessionId: string }>('/api/auth/devices'),
        apiFetch<{ apiKeys: Array<Record<string, unknown>> }>('/api/api-keys'),
      ]);
      setDevices(devRes.devices);
      setCurrentSessionId(devRes.currentSessionId);
      setApiKeys(
        keyRes.apiKeys.map((k) => ({
          id: String(k.id),
          userId: String(k.user_id),
          name: String(k.name),
          prefix: String(k.prefix),
          lastUsedAt: k.last_used_at ? String(k.last_used_at) : null,
          revoked: Boolean(k.revoked),
          createdAt: String(k.created_at),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void loadSecurityData();
  }, []);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, organization, language }),
      });
      onUserUpdated(res.user);
      setNotice(isFr ? 'Profil enregistré.' : 'Profile saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleMfa() {
    try {
      const res = await apiFetch<{ mfaEnabled: boolean }>('/api/auth/mfa/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: !mfaEnabled }),
      });
      setMfaEnabled(res.mfaEnabled);
      onUserUpdated({ ...user, mfaEnabled: res.mfaEnabled });
      setNotice(
        res.mfaEnabled
          ? isFr
            ? 'Authentification multifacteur activée.'
            : 'Multi-factor authentication enabled.'
          : isFr
            ? 'Authentification multifacteur désactivée.'
            : 'Multi-factor authentication disabled.',
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleVerifyEmail() {
    try {
      await apiFetch('/api/auth/verify-email', { method: 'POST' });
      onUserUpdated({ ...user, emailVerified: true });
      setNotice(isFr ? 'Adresse e-mail vérifiée.' : 'Email address verified.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateApiKey(e: FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await apiFetch<{ secretOnce: string }>('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setRevealedSecret(res.secretOnce);
      setNewKeyName('');
      await loadSecurityData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRevokeKey(id: string) {
    try {
      await apiFetch(`/api/api-keys/${id}/revoke`, { method: 'POST' });
      await loadSecurityData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleExportPersonalData() {
    try {
      const data = await apiFetch('/api/auth/export-data');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-motion-export-${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleLogoutAll() {
    await apiFetch('/api/auth/logout-all', { method: 'POST' });
    onLoggedOut();
  }

  async function handleDeleteAccount() {
    try {
      await apiFetch('/api/auth/delete-account', { method: 'DELETE' });
      onLoggedOut();
    } catch (err) {
      setError((err as Error).message);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#1E3254] pb-5">
        <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
          {isFr ? 'Paramètres, Sécurité & Confidentialité' : 'Settings, Security & Privacy'}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          {isFr
            ? 'Profil, langue, authentification multifacteur, appareils connectés, clés API et conformité RGPD.'
            : 'Profile, language, MFA security, connected devices, API keys, and personal data export.'}
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile & Language */}
        <form onSubmit={handleSaveProfile} className="lg:col-span-6 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
            {isFr ? 'Profil & Langue' : 'Profile & Language'}
          </h2>

          <div>
            <label htmlFor="set-email" className="block text-xs text-[#94A3B8] mb-1">
              {isFr ? 'Adresse e-mail' : 'Email address'}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="set-email"
                type="email"
                disabled
                value={user.email}
                className="flex-1 px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#94A3B8]"
              />
              {!user.emailVerified ? (
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  className="px-3 py-2 rounded-lg bg-[#14243D] text-xs text-[#3978FF] font-medium whitespace-nowrap"
                >
                  {isFr ? 'Vérifier' : 'Verify'}
                </button>
              ) : (
                <span className="text-xs text-emerald-300 shrink-0">{isFr ? 'Vérifié' : 'Verified'}</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="set-name" className="block text-xs text-[#94A3B8] mb-1">
              {isFr ? 'Nom complet' : 'Full name'}
            </label>
            <input
              id="set-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
            />
          </div>

          <div>
            <label htmlFor="set-org" className="block text-xs text-[#94A3B8] mb-1">
              {isFr ? 'Studio / Organisation' : 'Studio / Organization'}
            </label>
            <input
              id="set-org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
            />
          </div>

          <div>
            <span className="block text-xs text-[#94A3B8] mb-1.5">{isFr ? 'Langue de l’interface' : 'Interface language'}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLanguageChange('fr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  language === 'fr' ? 'bg-[#3978FF] text-white' : 'bg-[#080D19] border border-[#1E3254] text-[#94A3B8]'
                }`}
              >
                Français
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  language === 'en' ? 'bg-[#3978FF] text-white' : 'bg-[#080D19] border border-[#1E3254] text-[#94A3B8]'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium"
          >
            {isFr ? 'Enregistrer les modifications' : 'Save changes'}
          </button>
        </form>

        {/* Security & MFA */}
        <div className="lg:col-span-6 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#A78BFA]" />
              <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
                {isFr ? 'Sécurité du compte' : 'Account security'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleToggleMfa}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                mfaEnabled ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-200' : 'bg-[#14243D] text-[#F4F7FB]'
              }`}
            >
              {mfaEnabled ? (isFr ? 'MFA Activée' : 'MFA Enabled') : isFr ? 'Activer la MFA' : 'Enable MFA'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#CBD5E1]">
                {isFr ? 'Appareils et sessions actives' : 'Connected devices & active sessions'}
              </span>
              <button
                type="button"
                onClick={handleLogoutAll}
                className="inline-flex items-center gap-1 text-xs text-amber-300 hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isFr ? 'Déconnecter toutes les sessions' : 'Sign out all devices'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto">
              {devices.map((dev) => (
                <div key={String(dev.id)} className="p-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Laptop className="w-3.5 h-3.5 text-[#3978FF] shrink-0" />
                    <span className="text-[#F4F7FB] truncate">{String(dev.device_label)}</span>
                  </div>
                  <span className="font-mono text-[#94A3B8] shrink-0">
                    {dev.id === currentSessionId ? (isFr ? 'Session actuelle' : 'Current') : dev.revoked ? (isFr ? 'Révoquée' : 'Revoked') : String(dev.ip_address)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Export & Delete */}
          <div className="pt-4 border-t border-[#1E3254] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExportPersonalData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#14243D] hover:bg-[#1E3356] text-xs font-medium text-[#F4F7FB]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isFr ? 'Exporter mes données (JSON)' : 'Export personal data (JSON)'}</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] hover:border-red-800 text-xs font-medium text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isFr ? 'Supprimer le compte' : 'Delete account'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
                >
                  {isFr ? 'Confirmer suppression' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#14243D] text-xs text-[#CBD5E1]"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <section className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#3978FF]" />
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Clés d’intégration Studio API (Rotation sécurisée)' : 'Studio Integration Keys (Secure Rotation)'}
            </h2>
          </div>

          <form onSubmit={handleCreateApiKey} className="flex items-center gap-2">
            <input
              type="text"
              aria-label={isFr ? 'Nom de la clé' : 'Key label'}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={isFr ? 'Ex. Pipeline Render Studio' : 'E.g. Studio Render Pipeline'}
              className="px-3 py-1.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs text-[#F4F7FB]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-xs font-medium whitespace-nowrap"
            >
              {isFr ? 'Générer une clé' : 'Generate key'}
            </button>
          </form>
        </div>

        {revealedSecret && (
          <div className="p-3 rounded-lg bg-[#080D19] border border-[#3978FF] text-xs">
            <div className="text-[#CBD5E1] mb-1">
              {isFr ? 'Copiez cette clé maintenant (elle ne sera plus affichée) :' : 'Copy this key now (shown once):'}
            </div>
            <code className="font-mono text-[#A78BFA] break-all">{revealedSecret}</code>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucune clé générée.' : 'No integration keys created yet.'}</p>
          ) : (
            apiKeys.map((k) => (
              <div key={k.id} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-[#F4F7FB]">{k.name}</span>
                  <span className="ml-3 font-mono text-[#94A3B8]">{k.prefix}</span>
                </div>
                {k.revoked ? (
                  <span className="text-red-300">{isFr ? 'Révoquée' : 'Revoked'}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id)}
                    className="text-amber-300 hover:underline"
                  >
                    {isFr ? 'Révoquer' : 'Revoke'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
