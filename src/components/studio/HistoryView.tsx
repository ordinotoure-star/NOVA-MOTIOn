import { useState } from 'react';
import { tStatus } from '../../i18n/translations';
import type { GenerationJobRecord, Language, TransactionRecord } from '../../shared/types';

interface HistoryViewProps {
  language: Language;
  generations: GenerationJobRecord[];
  transactions: TransactionRecord[];
}

export function HistoryView({ language, generations, transactions }: HistoryViewProps) {
  const isFr = language === 'fr';
  const [tab, setTab] = useState<'jobs' | 'ledger'>('jobs');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Historique & Registre des Crédits' : 'History & Credit Ledger'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? 'Suivi complet des tâches IA, réservations, débits confirmés et remboursements automatiques.'
              : 'Complete log of AI jobs, reservations, confirmed debits, and automatic refunds.'}
          </p>
        </div>

        <div className="flex p-1 rounded-lg bg-[#0E1629] border border-[#1E3254] w-fit">
          <button
            type="button"
            onClick={() => setTab('jobs')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              tab === 'jobs' ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {isFr ? `Tâches IA (${generations.length})` : `AI Jobs (${generations.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('ledger')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              tab === 'ledger' ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {isFr ? `Transactions (${transactions.length})` : `Transactions (${transactions.length})`}
          </button>
        </div>
      </div>

      {tab === 'jobs' ? (
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1E3254] text-[#94A3B8]">
              <tr>
                <th className="py-3 px-4 font-medium">{isFr ? 'Type' : 'Type'}</th>
                <th className="py-3 px-4 font-medium">{isFr ? 'Description' : 'Prompt'}</th>
                <th className="py-3 px-4 font-medium">{isFr ? 'Modèle' : 'Model'}</th>
                <th className="py-3 px-4 font-medium">{isFr ? 'Statut' : 'Status'}</th>
                <th className="py-3 px-4 font-medium text-right">{isFr ? 'Débit / Remb.' : 'Charged / Refund'}</th>
                <th className="py-3 px-4 font-medium text-right">{isFr ? 'Date' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3254]/70">
              {generations.map((job) => (
                <tr key={job.id} className="hover:bg-[#14243D]/40">
                  <td className="py-3 px-4 font-mono text-[#A78BFA] whitespace-nowrap">{job.category}</td>
                  <td className="py-3 px-4 text-[#F4F7FB] max-w-md">
                    <div className="truncate">{job.prompt}</div>
                    {job.errorMessage && <div className="text-[11px] text-red-300 mt-0.5">{job.errorMessage}</div>}
                  </td>
                  <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">{job.modelId}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[#CBD5E1]">{tStatus(language, job.status)}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    {job.refundedCredits > 0 ? (
                      <span className="text-emerald-300">+{job.refundedCredits} {isFr ? 'remb.' : 'ref.'}</span>
                    ) : (
                      <span className="text-[#F4F7FB]">-{job.chargedCredits || job.reservedCredits} cr.</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-[#94A3B8] font-mono tabular-nums whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1E3254] text-[#94A3B8]">
              <tr>
                <th className="py-3 px-4 font-medium">{isFr ? 'Opération' : 'Operation'}</th>
                <th className="py-3 px-4 font-medium">{isFr ? 'Libellé' : 'Description'}</th>
                <th className="py-3 px-4 font-medium">{isFr ? 'Méthode' : 'Method'}</th>
                <th className="py-3 px-4 font-medium text-right">{isFr ? 'Montant' : 'Amount'}</th>
                <th className="py-3 px-4 font-medium text-right">{isFr ? 'Solde après' : 'Balance after'}</th>
                <th className="py-3 px-4 font-medium text-right">{isFr ? 'Date' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3254]/70">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#14243D]/40">
                  <td className="py-3 px-4 font-mono text-[#A78BFA] whitespace-nowrap">{tx.type}</td>
                  <td className="py-3 px-4 text-[#F4F7FB]">{tx.description}</td>
                  <td className="py-3 px-4 text-[#94A3B8] whitespace-nowrap">{tx.paymentMethod}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                      tx.amount >= 0 ? 'text-emerald-300' : 'text-[#F4F7FB]'
                    }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} cr.
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#CBD5E1] whitespace-nowrap">
                    {tx.balanceAfter} cr.
                  </td>
                  <td className="py-3 px-4 text-right text-[#94A3B8] font-mono tabular-nums whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
