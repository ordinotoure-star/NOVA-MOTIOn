import { HelpCircle, LifeBuoy, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { Language, SupportTicketRecord } from '../../shared/types';

interface SupportViewProps {
  language: Language;
}

export function SupportView({ language }: SupportViewProps) {
  const isFr = language === 'fr';
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'technical' | 'billing' | 'model_access' | 'abuse_report'>('technical');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    try {
      const res = await apiFetch<{ tickets: Array<Record<string, unknown>> }>('/api/support/tickets');
      setTickets(
        res.tickets.map((t) => ({
          id: String(t.id),
          userId: String(t.user_id),
          userEmail: String(t.user_email),
          subject: String(t.subject),
          category: t.category as SupportTicketRecord['category'],
          message: String(t.message),
          status: t.status as SupportTicketRecord['status'],
          createdAt: String(t.created_at),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, category, message }),
      });
      setSubject('');
      setMessage('');
      setNotice(isFr ? 'Demande d’assistance transmise.' : 'Support ticket submitted.');
      await loadTickets();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#1E3254] pb-5">
        <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
          {isFr ? 'Assistance & Conformité' : 'Support & Compliance'}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          {isFr
            ? 'Ouvrez un ticket technique, signalez un contenu ou consultez les règles d’usage des modèles IA.'
            : 'Open a support ticket, report content, or review AI model usage guidelines.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-6 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#3978FF]" />
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Nouvelle demande d’assistance' : 'New support ticket'}
            </h2>
          </div>

          <div>
            <label htmlFor="sup-cat" className="block text-xs text-[#CBD5E1] mb-1">
              {isFr ? 'Catégorie' : 'Category'}
            </label>
            <select
              id="sup-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportTicketRecord['category'])}
              className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
            >
              <option value="technical">{isFr ? 'Support technique / FFmpeg' : 'Technical / FFmpeg'}</option>
              <option value="billing">{isFr ? 'Crédits & Facturation' : 'Credits & Billing'}</option>
              <option value="model_access">{isFr ? 'Accès aux modèles IA' : 'AI Model Access'}</option>
              <option value="abuse_report">{isFr ? 'Signalement / Droits d’auteur' : 'Abuse / Copyright Report'}</option>
            </select>
          </div>

          <div>
            <label htmlFor="sup-sub" className="block text-xs text-[#CBD5E1] mb-1">
              {isFr ? 'Sujet' : 'Subject'}
            </label>
            <input
              id="sup-sub"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isFr ? 'Résumé de votre demande' : 'Summary of your request'}
              className="w-full px-3 py-2 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
            />
          </div>

          <div>
            <label htmlFor="sup-msg" className="block text-xs text-[#CBD5E1] mb-1">
              {isFr ? 'Message détaillé' : 'Details'}
            </label>
            <textarea
              id="sup-msg"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-sm text-[#F4F7FB]"
            />
          </div>

          {error && <div className="text-xs text-red-300">{error}</div>}
          {notice && <div className="text-xs text-blue-200">{notice}</div>}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            <span>{isFr ? 'Envoyer la demande' : 'Submit ticket'}</span>
          </button>
        </form>

        <div className="lg:col-span-6 space-y-5">
          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#A78BFA]" />
              <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
                {isFr ? 'Garanties opérationnelles' : 'Operational guarantees'}
              </h2>
            </div>
            <ul className="space-y-2 text-xs text-[#CBD5E1] leading-relaxed">
              <li>
                {isFr
                  ? '• Remboursement automatique : toute génération échouée côté moteur recrédite votre portefeuille.'
                  : '• Automatic refund: any engine failure automatically restores reserved credits.'}
              </li>
              <li>
                {isFr
                  ? '• Transparence 4K : les vidéos et images agrandies par FFmpeg sont explicitement marquées comme améliorées.'
                  : '• 4K transparency: FFmpeg-upscaled outputs are clearly distinguished from native resolution.'}
              </li>
              <li>
                {isFr
                  ? '• Durée par séquence : chaque plan vidéo généré est strictement borné entre 3s et 15s pour garantir la cohérence.'
                  : '• Sequence cap: individual video shots are strictly bounded between 3s and 15s for consistency.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6">
            <h2 className="font-display text-base font-semibold text-[#F4F7FB] mb-3">
              {isFr ? `Mes demandes (${tickets.length})` : `My tickets (${tickets.length})`}
            </h2>
            {tickets.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucune demande en cours.' : 'No open tickets.'}</p>
            ) : (
              <div className="space-y-2.5">
                {tickets.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#F4F7FB]">{t.subject}</span>
                      <span className="font-mono text-[#A78BFA]">{t.status}</span>
                    </div>
                    <p className="text-[#94A3B8] mt-1">{t.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
