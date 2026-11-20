import { Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '../services/api';
import type { Language, UserProfile } from '../shared/types';

interface AuthModalProps {
  open: boolean;
  language: Language;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthModal({ open, language, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isFr = language === 'fr';

  function switchMode(next: 'login' | 'register' | 'reset') {
    setMode(next);
    setError(null);
    setNotice(null);
    setMfaRequired(false);
    setMfaCode('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await apiFetch<{ user: UserProfile; verificationNotice?: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName, organization, language }),
        });
        onAuthenticated(res.user);
      } else if (mode === 'reset') {
        const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, newPassword: password }),
        });
        setNotice(res.message);
      } else {
        const res = await apiFetch<{ user?: UserProfile; mfaRequired?: boolean; hint?: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, mfaCode: mfaRequired ? mfaCode : undefined }),
        });
        if (res.mfaRequired) {
          setMfaRequired(true);
          setNotice(res.hint || (isFr ? 'Code MFA requis.' : 'MFA code required.'));
        } else if (res.user) {
          onAuthenticated(res.user);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess(account: 'creator' | 'admin') {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ account }),
      });
      onAuthenticated(res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#04070E]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-md bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-semibold text-[#F4F7FB]">
              {mode === 'login'
                ? isFr
                  ? 'Connexion au Studio'
                  : 'Sign in to Studio'
                : mode === 'register'
                  ? isFr
                    ? 'Créer un compte NOVA MOTION AI'
                    : 'Create NOVA MOTION AI account'
                  : isFr
                    ? 'Réinitialiser le mot de passe'
                    : 'Reset password'}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              {isFr ? 'Espace créatif sécurisé · NOVAHUB TECHNOLOGIES' : 'Secure creative workspace · NOVAHUB TECHNOLOGIES'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isFr ? 'Fermer la fenêtre' : 'Close dialog'}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#14243D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fast Demo Access */}
        <div className="mb-5 p-3.5 rounded-lg bg-[#14243D]/70 border border-[#243B63]">
          <p className="text-xs font-medium text-[#CBD5E1] mb-2.5">
            {isFr ? 'Accès immédiat de démonstration' : 'Instant demo workspace access'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess('creator')}
              className="px-3 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              {isFr ? 'Créateur PRO' : 'PRO Creator'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess('admin')}
              className="px-3 py-2 rounded-lg bg-[#1D3152] hover:bg-[#27416B] text-[#F4F7FB] text-xs font-medium transition-colors whitespace-nowrap"
            >
              {isFr ? 'Super Admin' : 'Super Admin'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  {isFr ? 'Nom complet' : 'Full name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Camille Laurent"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-org" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                  {isFr ? 'Studio ou entreprise (optionnel)' : 'Studio or company (optional)'}
                </label>
                <input
                  id="auth-org"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Studio Lumière"
                  className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              {isFr ? 'Adresse e-mail' : 'Email address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@novamotion.ai"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              {mode === 'reset'
                ? isFr
                  ? 'Nouveau mot de passe (min. 8 caractères)'
                  : 'New password (min. 8 chars)'
                : isFr
                  ? 'Mot de passe'
                  : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#3978FF]"
              />
            </div>
          </div>

          {mfaRequired && mode === 'login' && (
            <div>
              <label htmlFor="auth-mfa" className="block text-xs font-medium text-[#A78BFA] mb-1.5">
                {isFr ? 'Code MFA à 6 chiffres' : '6-digit MFA verification code'}
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#A78BFA] absolute left-3 top-2.5" />
                <input
                  id="auth-mfa"
                  type="text"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="482910"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080D19] border border-[#A78BFA] text-sm font-mono tabular-nums text-[#F4F7FB] focus:outline-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-3 rounded-lg bg-blue-950/50 border border-blue-800/60 text-xs text-blue-200">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading
              ? isFr
                ? 'Traitement...'
                : 'Processing...'
              : mode === 'login'
                ? isFr
                  ? 'Se connecter'
                  : 'Sign in'
                : mode === 'register'
                  ? isFr
                    ? 'Créer mon espace'
                    : 'Create workspace'
                  : isFr
                    ? 'Appliquer la réinitialisation'
                    : 'Reset password'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#1E3254] flex items-center justify-between text-xs text-[#94A3B8]">
          {mode !== 'register' ? (
            <button type="button" onClick={() => switchMode('register')} className="hover:text-white transition-colors">
              {isFr ? 'Créer un compte gratuit' : 'Create free account'}
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} className="hover:text-white transition-colors">
              {isFr ? 'Déjà inscrit ? Connexion' : 'Already have an account? Sign in'}
            </button>
          )}
          {mode !== 'reset' ? (
            <button type="button" onClick={() => switchMode('reset')} className="hover:text-white transition-colors">
              {isFr ? 'Mot de passe oublié' : 'Forgot password'}
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} className="hover:text-white transition-colors">
              {isFr ? 'Retour connexion' : 'Back to sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
