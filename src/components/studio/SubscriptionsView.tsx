import { Check, CreditCard, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '../../services/api';
import { PLANS, calculatePlanCheckoutPrice } from '../../shared/pricingAndFilmMath';
import type { Language, PlanTierId, UserProfile, WalletInfo } from '../../shared/types';

interface SubscriptionsViewProps {
  language: Language;
  user: UserProfile;
  wallet: WalletInfo | null;
  onRefresh: () => void;
}

export function SubscriptionsView({
  language,
  user,
  wallet,
  onRefresh,
}: SubscriptionsViewProps) {
  const isFr = language === 'fr';
  const [cycleFilter, setCycleFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstMonthEligible = !Boolean(user.firstMonthDiscountUsed);

  async function handleSelectPlan(planId: PlanTierId) {
    setBusy(planId);
    setError(null);
    setNotice(null);
    try {
      const plan = PLANS.find((p) => p.id === planId);
      const res = await apiFetch<{
        ok: boolean;
        pricing?: { finalPriceUsd: number; discountApplied: boolean; discountPercent: number };
      }>('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle: plan?.billingCycle || 'monthly', paymentMethod }),
      });
      const planLabel = plan ? (isFr ? plan.name : plan.nameEn) : planId.toUpperCase();
      const promoSuffix = res.pricing?.discountApplied
        ? isFr
          ? ` (-10 % premier mois appliqué : $${res.pricing.finalPriceUsd.toFixed(2)})`
          : ` (10% first-month discount applied: $${res.pricing.finalPriceUsd.toFixed(2)})`
        : '';
      setNotice(
        isFr
          ? `Abonnement mis à jour vers ${planLabel}${promoSuffix}.`
          : `Plan updated to ${planLabel}${promoSuffix}.`,
      );
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleTopup(credits: number) {
    setBusy(`topup_${credits}`);
    setError(null);
    try {
      await apiFetch('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ topupCredits: credits, paymentMethod }),
      });
      setNotice(isFr ? `+${credits} crédits ajoutés à votre portefeuille.` : `+${credits} credits added to wallet.`);
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setBusy('cancel');
    try {
      await apiFetch('/api/subscriptions/cancel', { method: 'POST' });
      setNotice(isFr ? 'Abonnement annulé · retour au palier FREE.' : 'Subscription cancelled · switched to FREE tier.');
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const currentPlanObj = PLANS.find((p) => p.id === user.planId);
  const monthlyPlans = PLANS.filter((p) => p.billingCycle === 'monthly');
  const annualPlans = PLANS.filter((p) => p.billingCycle === 'yearly');

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#1E3254] pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F7FB]">
            {isFr ? 'Abonnements & Portefeuille de Crédits' : 'Subscriptions & Credit Wallet'}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isFr
              ? `Forfait actuel : ${currentPlanObj?.name || user.planId.toUpperCase()} · Solde : ${(wallet?.balance ?? 0).toLocaleString('fr-FR')} crédits.`
              : `Current plan: ${currentPlanObj?.nameEn || user.planId.toUpperCase()} · Balance: ${(wallet?.balance ?? 0).toLocaleString('en-US')} credits.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-lg bg-[#0E1629] border border-[#1E3254]">
            <button
              type="button"
              onClick={() => setCycleFilter('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                cycleFilter === 'all' ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8]'
              }`}
            >
              {isFr ? 'Toutes les offres' : 'All plans'}
            </button>
            <button
              type="button"
              onClick={() => setCycleFilter('monthly')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                cycleFilter === 'monthly' ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8]'
              }`}
            >
              {isFr ? 'Mensuel (-10% 1er mois)' : 'Monthly (-10% 1st mo)'}
            </button>
            <button
              type="button"
              onClick={() => setCycleFilter('yearly')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                cycleFilter === 'yearly' ? 'bg-[#3978FF] text-white' : 'text-[#94A3B8]'
              }`}
            >
              {isFr ? 'Annuel' : 'Annual'}
            </button>
          </div>

          <div className="flex p-1 rounded-lg bg-[#0E1629] border border-[#1E3254]">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                paymentMethod === 'card' ? 'bg-[#14243D] text-white' : 'text-[#94A3B8]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isFr ? 'Carte bancaire' : 'Card'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('mobile_money')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                paymentMethod === 'mobile_money' ? 'bg-[#14243D] text-white' : 'text-[#94A3B8]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Money</span>
            </button>
          </div>
        </div>
      </div>

      {firstMonthEligible && (
        <div className="p-3.5 rounded-lg bg-[#14243D] border border-[#3978FF]/60 text-xs text-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <span>
            {isFr
              ? 'Réduction de bienvenue active : -10 % sur le 1er mois appliquée automatiquement à votre première souscription mensuelle (Basique $9, Plus $18, Pro $40.50).'
              : 'Welcome discount active: 10% off your 1st month automatically applied on your first monthly subscription (Basic $9, Plus $18, Pro $40.50).'}
          </span>
          <span className="font-mono text-[#A78BFA] font-semibold">-10% 1ER MOIS</span>
        </div>
      )}

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

      {/* Monthly Plans */}
      {(cycleFilter === 'all' || cycleFilter === 'monthly') && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
            {isFr ? 'Offres Mensuelles' : 'Monthly Plans'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {monthlyPlans.map((plan) => {
              const isCurrent = user.planId === plan.id;
              const pricing = calculatePlanCheckoutPrice(plan, firstMonthEligible);

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl p-6 border flex flex-col justify-between ${
                    isCurrent ? 'bg-[#14243D] border-[#3978FF]' : 'bg-[#0E1629] border-[#1E3254]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F4F7FB]">
                        {isFr ? plan.name : plan.nameEn}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-medium text-[#3978FF]">
                          {isFr ? 'Actif' : 'Current'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">{isFr ? plan.taglineFr : plan.taglineEn}</p>

                    <div className="mt-4 pb-4 border-b border-[#1E3254]">
                      {pricing.discountApplied ? (
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">
                              ${Number.isInteger(pricing.finalPriceUsd) ? pricing.finalPriceUsd : pricing.finalPriceUsd.toFixed(2)}
                            </span>
                            <span className="font-mono text-sm line-through text-[#64748B] tabular-nums">
                              ${pricing.basePriceUsd}
                            </span>
                            <span className="text-xs text-[#94A3B8]">/ {isFr ? '1er mois' : '1st mo'}</span>
                          </div>
                          <div className="text-[11px] text-[#A78BFA] mt-1 font-medium">
                            {isFr ? `-10 % le 1er mois · puis $${pricing.basePriceUsd}/mois` : `10% off 1st mo · then $${pricing.basePriceUsd}/mo`}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">${plan.priceUsd}</span>
                          <span className="text-xs text-[#94A3B8]">/ {isFr ? 'mois' : 'mo'}</span>
                        </div>
                      )}
                      <div className="mt-2 font-mono text-xs font-semibold text-[#3978FF] tabular-nums">
                        {plan.includedCredits.toLocaleString('fr-FR')} {isFr ? 'crédits offerts' : 'credits included'}
                      </div>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-[#CBD5E1]">
                      {(isFr ? plan.featuresFr : plan.featuresEn).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#3978FF] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={busy === plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-[#080D19] text-[#94A3B8] border border-[#1E3254]'
                        : 'bg-[#3978FF] hover:bg-[#2E67E5] text-white'
                    }`}
                  >
                    {busy === plan.id
                      ? '...'
                      : isCurrent
                        ? isFr
                          ? 'Renouveler / Activer'
                          : 'Renew / Active'
                        : isFr
                          ? `Passer à ${plan.name}`
                          : `Switch to ${plan.nameEn}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Annual Plans */}
      {(cycleFilter === 'all' || cycleFilter === 'yearly') && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
            {isFr ? 'Offres Annuelles Haute Capacité' : 'Annual High-Capacity Plans'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {annualPlans.map((plan) => {
              const isCurrent = user.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl p-6 border flex flex-col justify-between ${
                    isCurrent ? 'bg-[#14243D] border-[#A78BFA]' : 'bg-[#0E1629] border-[#243B63]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#A78BFA]">
                        {isFr ? plan.name : plan.nameEn}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-medium text-[#3978FF]">
                          {isFr ? 'Actif' : 'Current'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">{isFr ? plan.taglineFr : plan.taglineEn}</p>

                    <div className="mt-4 pb-4 border-b border-[#1E3254]">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">${plan.priceUsd}</span>
                        <span className="text-xs text-[#94A3B8]">/ {isFr ? 'an' : 'year'}</span>
                      </div>
                      <div className="mt-2 font-mono text-xs font-semibold text-[#3978FF] tabular-nums">
                        {plan.includedCredits.toLocaleString('fr-FR')} {isFr ? 'crédits offerts' : 'credits included'}
                      </div>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-[#CBD5E1]">
                      {(isFr ? plan.featuresFr : plan.featuresEn).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={busy === plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-[#080D19] text-[#94A3B8] border border-[#1E3254]'
                        : 'bg-[#3978FF] hover:bg-[#2E67E5] text-white'
                    }`}
                  >
                    {busy === plan.id
                      ? '...'
                      : isCurrent
                        ? isFr
                          ? 'Renouveler / Activer'
                          : 'Renew / Active'
                        : isFr
                          ? `Activer ${plan.name}`
                          : `Activate ${plan.nameEn}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit Top-ups & Cancellation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-[#F4F7FB] mb-3">
            {isFr ? 'Recharges ponctuelles de crédits' : 'One-time credit top-ups'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { credits: 500, price: 19 },
              { credits: 1500, price: 49 },
              { credits: 5000, price: 139 },
            ].map((pack) => (
              <button
                key={pack.credits}
                type="button"
                disabled={busy === `topup_${pack.credits}`}
                onClick={() => handleTopup(pack.credits)}
                className="p-4 rounded-lg bg-[#080D19] hover:bg-[#14243D] border border-[#1E3254] text-left transition-colors"
              >
                <div className="font-mono text-lg font-semibold tabular-nums text-[#F4F7FB]">
                  +{pack.credits.toLocaleString()} cr.
                </div>
                <div className="text-xs text-[#94A3B8] mt-1 font-mono tabular-nums">${pack.price} · {paymentMethod === 'mobile_money' ? 'Mobile Money' : isFr ? 'Carte' : 'Card'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F4F7FB]">
              {isFr ? 'Gestion du renouvellement' : 'Renewal management'}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1.5">
              {isFr
                ? 'Vous pouvez résilier votre abonnement à tout moment sans perte de vos projets existants.'
                : 'Cancel your subscription anytime without losing access to your existing projects.'}
            </p>
          </div>
          {user.planId !== 'free' && (
            <button
              type="button"
              disabled={busy === 'cancel'}
              onClick={handleCancel}
              className="mt-4 px-4 py-2 rounded-lg bg-[#080D19] hover:bg-red-950/40 border border-[#1E3254] hover:border-red-800/60 text-xs font-medium text-red-300"
            >
              {isFr ? 'Annuler l’abonnement' : 'Cancel subscription'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
