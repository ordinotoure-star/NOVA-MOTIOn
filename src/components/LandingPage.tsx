import { ArrowRight, Check, Clapperboard, Film, Layers, Shield, Sliders, Volume2 } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { PLANS, calculateFilmProductionPlan } from '../shared/pricingAndFilmMath';
import type { Language } from '../shared/types';

interface LandingPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenAuth: () => void;
  onQuickEnterStudio: () => void;
}

export function LandingPage({
  language,
  onLanguageChange,
  onOpenAuth,
  onQuickEnterStudio,
}: LandingPageProps) {
  const isFr = language === 'fr';
  const nav = TRANSLATIONS[language].navPublic;
  const film60 = calculateFilmProductionPlan(60, 15);

  return (
    <div className="min-h-screen bg-[#080D19] text-[#F4F7FB]">
      {/* Top Bar Contract: exactly 3 zones separated by gap-8 */}
      <header className="border-b border-[#1E3254]/70 bg-[#080D19]/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-[0.04em] text-[#F4F7FB] whitespace-nowrap shrink-0"
          >
            NOVA MOTION AI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#94A3B8]">
            <a href="#engines" className="hover:text-[#F4F7FB] transition-colors whitespace-nowrap shrink-0">
              {nav.engines}
            </a>
            <a href="#film-engine" className="hover:text-[#F4F7FB] transition-colors whitespace-nowrap shrink-0">
              {nav.filmEngine}
            </a>
            <a href="#pricing" className="hover:text-[#F4F7FB] transition-colors whitespace-nowrap shrink-0">
              {nav.pricing}
            </a>
            <a href="#security" className="hover:text-[#F4F7FB] transition-colors whitespace-nowrap shrink-0">
              {nav.enterprise}
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {nav.openStudio}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-[1240px] mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <div className="flex items-center gap-3 text-xs text-[#94A3B8] mb-5">
                  <span>NOVAHUB TECHNOLOGIES</span>
                  <span aria-hidden="true">·</span>
                  <span>{isFr ? 'Édition Studio 2026' : '2026 Studio Edition'}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onLanguageChange(isFr ? 'en' : 'fr')}
                    className="text-[#A78BFA] hover:underline font-medium"
                  >
                    {isFr ? 'English' : 'Français'}
                  </button>
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-[#F4F7FB] leading-[1.08]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
                >
                  {isFr
                    ? 'Du scénario au film complet de 60 minutes par intelligence artificielle.'
                    : 'From screenplay idea to assembled 60-minute cinema productions.'}
                </h1>

                <p className="mt-5 text-base text-[#94A3B8] leading-relaxed max-w-xl">
                  {isFr
                    ? 'NOVA MOTION AI orchestre la génération vidéo jusqu’à 15 secondes par plan, la création d’images haute résolution, la synthèse vocale multi-locuteurs et le montage FFmpeg automatisé dans un studio unifié.'
                    : 'NOVA MOTION AI orchestrates up to 15-second video sequences, high-resolution imagery, multi-speaker dialogue audio, and automated FFmpeg film assembly in one unified production studio.'}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onQuickEnterStudio}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    <span>{isFr ? 'Accéder au Studio Démo' : 'Launch Demo Studio'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="px-5 py-3 rounded-lg bg-[#14243D] hover:bg-[#1B3052] text-[#F4F7FB] text-sm font-medium border border-[#243B63] transition-colors whitespace-nowrap"
                  >
                    {isFr ? 'Connexion / Inscription' : 'Sign in / Register'}
                  </button>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-[#1E3254] grid grid-cols-3 gap-6">
                <div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB]">15 s</div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {isFr ? 'Plafond par séquence IA' : 'Max per single shot'}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB]">60 min</div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {isFr ? 'Assemblage film long' : 'Assembled feature length'}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[#A78BFA]">4K</div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {isFr ? 'Images & masters vérifiés' : 'Verified masters & stills'}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full bg-[#0E1629] border border-[#1E3254] rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-3">
                  <span>{isFr ? 'Aperçu du rendu · Horizons d’Obsidienne' : 'Studio render preview · Obsidian Horizons'}</span>
                  <span className="font-mono tabular-nums text-[#CBD5E1]">1280×720 · H.264</span>
                </div>
                <div className="flex-1 rounded-lg overflow-hidden bg-[#050811] border border-[#1E3254]">
                  <video
                    src="/uploads/seed/seed-horizons-01.mp4"
                    poster="/uploads/seed/seed-horizons-01.png"
                    controls
                    playsInline
                    muted
                    preload="none"
                    className="w-full h-full object-cover min-h-[260px] lg:min-h-[340px]"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>{isFr ? 'Plan 01 · Bible cinématographique active' : 'Shot 01 · Active Cinema Bible'}</span>
                  <span className="font-mono tabular-nums">00:05 · 24 fps</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Engines Bento Grid */}
        <section id="engines" className="border-t border-[#1E3254]/70 bg-[#0B1221]">
          <div className="max-w-[1240px] mx-auto px-6 py-20">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#F4F7FB]">
                {isFr ? 'Quatre moteurs spécialisés sous une orchestration autonome' : 'Four specialized engines under autonomous orchestration'}
              </h2>
              <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed">
                {isFr
                  ? 'Chaque moteur est relié à une file asynchrone avec estimation de coût préalable, contrôle qualité et remboursement automatique des crédits en cas d’échec.'
                  : 'Every engine connects to an async queue with upfront cost estimation, quality checks, and automatic credit refunds on failure.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#3978FF] font-medium mb-3">
                    <Film className="w-4 h-4" />
                    <span>01. {isFr ? 'Moteur Vidéo Multi-Modèles' : 'Multi-Model Video Engine'}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F4F7FB]">
                    {isFr ? 'Text-to-Video, Image-to-Video, First/Last Frame & Cohérence Personnage' : 'Text-to-Video, Image-to-Video, First/Last Frame & Character Reference'}
                  </h3>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    {isFr
                      ? 'Pilotez Google Veo / Gemini Omni, Runway, Sora, Kling et Luma depuis une interface unique. Sélection automatique du meilleur modèle ou contrôle manuel des mouvements de caméra, cadrages et lumières, de 3 à 15 secondes.'
                      : 'Drive Google Veo / Gemini Omni, Runway, Sora, Kling, and Luma from one console. Automatic model routing or manual control over camera motion, framing, and lighting from 3s to 15s.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1E3254] flex flex-wrap gap-4 text-xs text-[#94A3B8] font-mono tabular-nums">
                  <span>720p Standard</span>
                  <span>·</span>
                  <span>1080p HD</span>
                  <span>·</span>
                  <span>1440p Upscale FFmpeg</span>
                  <span>·</span>
                  <span>2160p / 4K</span>
                </div>
              </div>

              <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                    <Layers className="w-4 h-4" />
                    <span>02. {isFr ? 'Générateur d’Images HD' : 'High-Res Image Engine'}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F4F7FB]">
                    {isFr ? 'Photoréalisme jusqu’à 4096 × 4096' : 'Photorealism up to 4096 × 4096'}
                  </h3>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    {isFr
                      ? 'Text-to-Image, Image-to-Image, inpainting, détourage, correction colorimétrique et agrandissement sans fausse mention de résolution native.'
                      : 'Text-to-Image, Image-to-Image, inpainting, cutout, color grading, and transparent native vs upscaled resolution labeling.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1E3254] text-xs text-[#94A3B8] font-mono tabular-nums">
                  1024² · 1536×1024 · 2048² · 4096²
                </div>
              </div>

              <div className="bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#3978FF] font-medium mb-3">
                    <Volume2 className="w-4 h-4" />
                    <span>03. {isFr ? 'Audio, Voix & Lyria' : 'Audio, Voice & Lyria'}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F4F7FB]">
                    {isFr ? 'Dialogues multi-locuteurs & Bandes originales' : 'Multi-speaker dialogues & Film scores'}
                  </h3>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    {isFr
                      ? 'Génération vocale Gemini 3.8 TTS avec direction d’acteur, pistes musicales Lyria et normalisation audio FFmpeg.'
                      : 'Gemini 3.8 TTS dramatic voice synthesis, Lyria original music scores, and FFmpeg audio normalization.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1E3254] text-xs text-[#94A3B8] font-mono">
                  WAV 24kHz · MP3 Stereo · SRT
                </div>
              </div>

              <div className="md:col-span-2 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                    <Sliders className="w-4 h-4" />
                    <span>04. {isFr ? 'Orchestrateur IA & Contrôle Budgétaire' : 'AI Orchestrator & Budget Guardrails'}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#F4F7FB]">
                    {isFr ? 'Autonomie technique contrôlée sans dépassement de crédits' : 'Controlled technical autonomy with strict budget limits'}
                  </h3>
                  <p className="mt-2.5 text-sm text-[#94A3B8] leading-relaxed">
                    {isFr
                      ? 'Enrichissement de prompt, sélection automatique de moteur selon la résolution, réservation préalable de crédits et remboursement immédiat en cas d’incident GPU.'
                      : 'Prompt enrichment, resolution-aware model selection, upfront credit reservation, and instant automatic refund on GPU errors.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1E3254] text-xs text-[#94A3B8]">
                  {isFr ? '8 états de file en temps réel (SSE) · Annulation & reprise de projet' : '8 real-time SSE queue states · Project cancellation & resume'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NOVA FILM ENGINE Section */}
        <section id="film-engine" className="border-t border-[#1E3254]/70">
          <div className="max-w-[1240px] mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-medium mb-3">
                <Clapperboard className="w-4 h-4" />
                <span>NOVA FILM ENGINE</span>
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#F4F7FB]" style={{ textWrap: 'balance' }}>
                {isFr ? 'Architecture cinématographique jusqu’à 60 minutes en continu' : 'Feature-length architecture up to 60 continuous minutes'}
              </h2>
              <p className="mt-4 text-sm text-[#94A3B8] leading-relaxed">
                {isFr
                  ? 'Le moteur décompose automatiquement votre idée en scénario structuré, génère la Bible cinématographique (fiches personnages, costumes, décors et règles de continuité), produit chaque plan de 15 secondes maximum et assemble le master final par blocs.'
                  : 'Automatically expands your idea into a structured screenplay, creates the Cinema Bible (characters, costumes, locations, continuity rules), produces shots up to 15s each, and assembles the final master in synchronized blocks.'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0E1629] border border-[#1E3254]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[#F4F7FB]">
                    {film60.totalSeconds} s
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {isFr ? 'Durée d’un long-métrage 60 min' : '60-minute total runtime'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[#0E1629] border border-[#1E3254]">
                  <div className="font-mono text-2xl font-semibold tabular-nums text-[#3978FF]">
                    {film60.minimumSequences}+
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {isFr ? 'Séquences de 15s assemblées' : 'Assembled 15s sequences'}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#0E1629] border border-[#1E3254] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#F4F7FB] mb-4">
                {isFr ? 'Pipeline de production en 9 étapes' : '9-stage automated film pipeline'}
              </h3>
              <ol className="space-y-2.5 text-sm text-[#CBD5E1]">
                {[
                  isFr ? '01. Idée initiale & calibrage de durée (1 à 60 min)' : '01. Initial concept & duration planning (1 to 60 min)',
                  isFr ? '02. Développement du scénario et des dialogues par IA' : '02. AI screenplay and dialogue development',
                  isFr ? '03. Bible cinématographique (personnages, décors, costumes)' : '03. Cinema Bible (characters, locations, costumes)',
                  isFr ? '04. Découpage technique en plans de 15 secondes max' : '04. Technical shot breakdown (15s max per shot)',
                  isFr ? '05. Génération vidéo parallèle ou séquentielle' : '05. Parallel or sequential shot generation',
                  isFr ? '06. Contrôle automatique de continuité & cohérence' : '06. Automated continuity & coherence inspection',
                  isFr ? '07. Production vocale TTS & musique originale Lyria' : '07. TTS dialogue synthesis & Lyria score',
                  isFr ? '08. Montage timeline, transitions & sous-titres SRT' : '08. Timeline editing, transitions & SRT subtitles',
                  isFr ? '09. Assemblage FFmpeg par blocs & exportation MP4' : '09. Block-based FFmpeg assembly & MP4 export',
                ].map((step) => (
                  <li key={step} className="py-1.5 border-b border-[#1E3254]/60 last:border-b-0">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-t border-[#1E3254]/70 bg-[#0B1221]">
          <div className="max-w-[1240px] mx-auto px-6 py-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl font-semibold tracking-tight text-[#F4F7FB]">
                  {isFr ? 'Abonnements transparents et gestion fine des crédits' : 'Transparent plans and predictable credit accounting'}
                </h2>
                <p className="mt-3 text-sm text-[#94A3B8]">
                  {isFr
                    ? 'Profitez de -10 % de réduction sur le premier mois sur toutes les offres mensuelles payantes, ou passez aux forfaits annuels haute capacité.'
                    : 'Enjoy 10% off your first month on all paid monthly subscriptions, or scale up with high-capacity annual plans.'}
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-lg bg-[#14243D] border border-[#3978FF]/60 text-xs font-medium text-[#F4F7FB] whitespace-nowrap shrink-0">
                {isFr ? 'Offre de lancement : -10 % sur le 1er mois' : 'Launch offer: 10% off first month'}
              </div>
            </div>

            {/* Monthly Plans (4 cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.filter((p) => p.billingCycle === 'monthly').map((plan) => {
                const hasFirstMonthPromo = plan.firstMonthDiscountPercent > 0 && plan.priceUsd > 0;
                const firstMonthPrice = hasFirstMonthPromo
                  ? Number((plan.priceUsd * (1 - plan.firstMonthDiscountPercent / 100)).toFixed(2))
                  : plan.priceUsd;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl p-6 flex flex-col justify-between border ${
                      plan.recommended
                        ? 'bg-[#14243D] border-[#3978FF]'
                        : 'bg-[#0E1629] border-[#1E3254]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tracking-wide text-[#F4F7FB]">
                          {isFr ? plan.name : plan.nameEn}
                        </span>
                        {plan.recommended && (
                          <span className="text-xs font-medium text-[#A78BFA]">
                            {isFr ? 'Recommandé' : 'Recommended'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {isFr ? plan.taglineFr : plan.taglineEn}
                      </p>

                      <div className="mt-5 pb-5 border-b border-[#1E3254]">
                        {hasFirstMonthPromo ? (
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">
                                ${Number.isInteger(firstMonthPrice) ? firstMonthPrice : firstMonthPrice.toFixed(2)}
                              </span>
                              <span className="font-mono text-sm line-through text-[#64748B] tabular-nums">
                                ${plan.priceUsd}
                              </span>
                              <span className="text-xs text-[#94A3B8]">/ {isFr ? '1er mois' : '1st mo'}</span>
                            </div>
                            <div className="text-[11px] text-[#A78BFA] mt-1 font-medium">
                              {isFr
                                ? `-10 % le 1er mois · puis $${plan.priceUsd}/mois`
                                : `10% off 1st month · then $${plan.priceUsd}/mo`}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">
                              ${plan.priceUsd}
                            </span>
                            <span className="text-xs text-[#94A3B8]">/ {isFr ? 'mois' : 'mo'}</span>
                          </div>
                        )}
                        <div className="mt-2 font-mono text-xs font-semibold text-[#3978FF] tabular-nums">
                          {plan.includedCredits.toLocaleString('fr-FR')} {isFr ? 'crédits offerts' : 'credits included'}
                        </div>
                      </div>

                      <ul className="mt-5 space-y-2.5 text-xs text-[#CBD5E1]">
                        {(isFr ? plan.featuresFr : plan.featuresEn).map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#3978FF] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                        plan.recommended
                          ? 'bg-[#3978FF] hover:bg-[#2E67E5] text-white'
                          : 'bg-[#14243D] hover:bg-[#1D3152] text-[#F4F7FB] border border-[#243B63]'
                      }`}
                    >
                      {isFr ? 'Choisir cette offre' : 'Select plan'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Annual High-Volume Plans (2 cards) */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              {PLANS.filter((p) => p.billingCycle === 'yearly').map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl p-6 bg-[#0E1629] border border-[#243B63] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold tracking-wide text-[#A78BFA]">
                        {isFr ? plan.name : plan.nameEn}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{isFr ? plan.taglineFr : plan.taglineEn}</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-bold tabular-nums text-[#F4F7FB]">${plan.priceUsd}</span>
                      <span className="text-xs text-[#94A3B8]">/ {isFr ? 'an' : 'year'}</span>
                      <span className="ml-2 font-mono text-xs font-semibold text-[#3978FF] tabular-nums">
                        {plan.includedCredits.toLocaleString('fr-FR')} {isFr ? 'crédits offerts' : 'credits included'}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
                      {(isFr ? plan.featuresFr : plan.featuresEn).map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#A78BFA] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="px-5 py-2.5 rounded-lg bg-[#14243D] hover:bg-[#1D3152] border border-[#243B63] text-xs font-medium text-[#F4F7FB] whitespace-nowrap shrink-0"
                  >
                    {isFr ? 'Activer l’offre annuelle' : 'Select annual plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise & Security */}
        <section id="security" className="border-t border-[#1E3254]/70">
          <div className="max-w-[1240px] mx-auto px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-[#3978FF] font-medium mb-2">
                <Shield className="w-4 h-4" />
                <span>{isFr ? 'Sécurité & Conformité Entreprise' : 'Enterprise Security & Compliance'}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#F4F7FB]">
                {isFr
                  ? 'Isolation stricte des données, MFA, audit logs et clés API rotatives'
                  : 'Strict tenant isolation, MFA, audit logs, and rotatable API keys'}
              </h2>
              <p className="mt-2 text-sm text-[#94A3B8]">
                {isFr
                  ? 'Contrôle d’accès par rôle côté serveur, filtrage des prompts, traçabilité des générations et exportation RGPD en un clic.'
                  : 'Server-side RBAC, prompt safety filtering, generation traceability, and one-click personal data export.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onQuickEnterStudio}
              className="px-6 py-3 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {isFr ? 'Tester le Studio maintenant' : 'Try Studio Now'}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1E3254]/70 bg-[#060A14] py-8">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <span>© 2026 NOVAHUB TECHNOLOGIES · NOVA MOTION AI</span>
          <div className="flex items-center gap-5">
            <a href="#engines" className="hover:text-white transition-colors">
              {nav.engines}
            </a>
            <a href="#film-engine" className="hover:text-white transition-colors">
              {nav.filmEngine}
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              {nav.pricing}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
