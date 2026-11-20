import type {
  AIModelConfig,
  FilmProductionPlan,
  ImageMode,
  ImageResolution,
  ModelCategory,
  PlanDefinition,
  PlanTierId,
  UserRole,
  VideoMode,
  VideoResolution,
} from './types';

export const MAX_SEQUENCE_DURATION_SECONDS = 15;
export const MIN_SEQUENCE_DURATION_SECONDS = 3;
export const MAX_FILM_DURATION_MINUTES = 60;

export const FIRST_MONTH_DISCOUNT_PERCENT = 10;

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'FREE',
    nameEn: 'FREE',
    billingCycle: 'monthly',
    taglineFr: 'Découverte de la plateforme',
    taglineEn: 'Explore the studio',
    priceUsd: 0,
    firstMonthDiscountPercent: 0,
    includedCredits: 200,
    dailyCreditCap: 100,
    maxVideoResolution: '720p',
    maxFilmMinutes: 2,
    priorityQueue: 'standard',
    teamSeats: 1,
    apiAccess: false,
    featuresFr: [
      '200 crédits offerts à l’inscription',
      'Vidéos jusqu’à 15s en 720p standard',
      'Images haute netteté 1024 × 1024',
      'File de génération standard',
    ],
    featuresEn: [
      '200 free credits included',
      'Videos up to 15s at 720p standard',
      '1024 × 1024 image generation',
      'Standard generation queue',
    ],
  },
  {
    id: 'basic',
    name: 'MENSUEL BASIQUE',
    nameEn: 'MONTHLY BASIC',
    billingCycle: 'monthly',
    taglineFr: 'Créateurs indépendants',
    taglineEn: 'Independent creators',
    priceUsd: 10,
    firstMonthDiscountPercent: 10,
    includedCredits: 1000,
    dailyCreditCap: 500,
    maxVideoResolution: '1080p',
    maxFilmMinutes: 10,
    priorityQueue: 'elevated',
    teamSeats: 1,
    apiAccess: false,
    featuresFr: [
      '1 000 crédits offerts chaque mois',
      '-10 % sur le 1er mois ($9 au lieu de $10)',
      'Vidéos 1080p HD jusqu’à 15s par plan',
      'Images 2048 × 2048 & films jusqu’à 10 min',
    ],
    featuresEn: [
      '1,000 credits included monthly',
      '10% off first month ($9 instead of $10)',
      '1080p HD videos up to 15s per shot',
      '2048 × 2048 images & films up to 10 min',
    ],
  },
  {
    id: 'plus',
    name: 'MENSUEL PLUS',
    nameEn: 'MONTHLY PLUS',
    billingCycle: 'monthly',
    taglineFr: 'Production régulière',
    taglineEn: 'Regular production',
    priceUsd: 20,
    firstMonthDiscountPercent: 10,
    includedCredits: 10000,
    dailyCreditCap: 4000,
    maxVideoResolution: '1440p',
    maxFilmMinutes: 30,
    priorityQueue: 'elevated',
    teamSeats: 2,
    apiAccess: true,
    featuresFr: [
      '10 000 crédits offerts chaque mois',
      '-10 % sur le 1er mois ($18 au lieu de $20)',
      'Vidéos 1080p / 1440p & films jusqu’à 30 min',
      'Orchestration multi-modèles + Bible cinéma',
    ],
    featuresEn: [
      '10,000 credits included monthly',
      '10% off first month ($18 instead of $20)',
      '1080p / 1440p videos & films up to 30 min',
      'Multi-model orchestration + Cinema Bible',
    ],
  },
  {
    id: 'pro',
    name: 'MENSUEL PRO',
    nameEn: 'MONTHLY PRO',
    billingCycle: 'monthly',
    taglineFr: 'Créateurs professionnels',
    taglineEn: 'Professional filmmakers',
    priceUsd: 45,
    firstMonthDiscountPercent: 10,
    includedCredits: 100000,
    dailyCreditCap: 25000,
    maxVideoResolution: '4k',
    maxFilmMinutes: 60,
    priorityQueue: 'high',
    teamSeats: 5,
    apiAccess: true,
    recommended: true,
    featuresFr: [
      '100 000 crédits offerts chaque mois',
      '-10 % sur le 1er mois ($40.50 au lieu de $45)',
      'Films complets jusqu’à 60 min (240+ plans)',
      'Export 4K / Upscaling FFmpeg & file prioritaire',
    ],
    featuresEn: [
      '100,000 credits included monthly',
      '10% off first month ($40.50 instead of $45)',
      'Full-length films up to 60 min (240+ shots)',
      '4K export / FFmpeg upscale & priority queue',
    ],
  },
  {
    id: 'annual_1',
    name: 'ANNUEL PLAN 1',
    nameEn: 'ANNUAL PLAN 1',
    billingCycle: 'yearly',
    taglineFr: 'Studio annuel · Volume élevé',
    taglineEn: 'Annual studio · High volume',
    priceUsd: 100,
    firstMonthDiscountPercent: 0,
    includedCredits: 1000000,
    dailyCreditCap: 100000,
    maxVideoResolution: '4k',
    maxFilmMinutes: 60,
    priorityQueue: 'high',
    teamSeats: 10,
    apiAccess: true,
    featuresFr: [
      '1 000 000 crédits offerts à l’année',
      'Facturation annuelle unique ($100 / an)',
      'Films 60 min, Bible cinéma & montage FFmpeg',
      'Accès API complet & support prioritaire',
    ],
    featuresEn: [
      '1,000,000 credits included per year',
      'Single annual billing ($100 / yr)',
      '60-min films, Cinema Bible & FFmpeg studio',
      'Full API access & priority support',
    ],
  },
  {
    id: 'annual_2',
    name: 'ANNUEL PLAN 2',
    nameEn: 'ANNUAL PLAN 2',
    billingCycle: 'yearly',
    taglineFr: 'Entreprise & Production intensive',
    taglineEn: 'Enterprise & High-scale studios',
    priceUsd: 200,
    firstMonthDiscountPercent: 0,
    includedCredits: 100000000,
    dailyCreditCap: 1000000,
    maxVideoResolution: '4k',
    maxFilmMinutes: 60,
    priorityQueue: 'dedicated',
    teamSeats: 25,
    apiAccess: true,
    featuresFr: [
      '100 000 000 crédits offerts à l’année',
      'Facturation annuelle unique ($200 / an)',
      'Capacité GPU dédiée & multi-équipes (25 sièges)',
      'Webhooks signés & SLA support 24/7',
    ],
    featuresEn: [
      '100,000,000 credits included per year',
      'Single annual billing ($200 / yr)',
      'Dedicated GPU capacity & 25 team seats',
      'Signed webhooks & 24/7 SLA engineering support',
    ],
  },
];

export function calculatePlanCheckoutPrice(
  plan: PlanDefinition,
  firstMonthDiscountEligible: boolean,
): {
  basePriceUsd: number;
  discountPercent: number;
  discountAmountUsd: number;
  finalPriceUsd: number;
  discountApplied: boolean;
} {
  const basePriceUsd = plan.priceUsd;
  const eligible =
    firstMonthDiscountEligible &&
    plan.billingCycle === 'monthly' &&
    plan.firstMonthDiscountPercent > 0 &&
    basePriceUsd > 0;
  if (!eligible) {
    return {
      basePriceUsd,
      discountPercent: 0,
      discountAmountUsd: 0,
      finalPriceUsd: basePriceUsd,
      discountApplied: false,
    };
  }
  const discountAmountUsd = Number(((basePriceUsd * plan.firstMonthDiscountPercent) / 100).toFixed(2));
  const finalPriceUsd = Number((basePriceUsd - discountAmountUsd).toFixed(2));
  return {
    basePriceUsd,
    discountPercent: plan.firstMonthDiscountPercent,
    discountAmountUsd,
    finalPriceUsd,
    discountApplied: true,
  };
}

export function validateVideoDuration(seconds: number): {
  valid: boolean;
  clampedSeconds: number;
  reason?: string;
} {
  if (!Number.isFinite(seconds)) {
    return {
      valid: false,
      clampedSeconds: 5,
      reason: 'Duration must be a finite number.',
    };
  }
  const rounded = Math.round(seconds);
  if (rounded < MIN_SEQUENCE_DURATION_SECONDS) {
    return {
      valid: false,
      clampedSeconds: MIN_SEQUENCE_DURATION_SECONDS,
      reason: `Minimum sequence duration is ${MIN_SEQUENCE_DURATION_SECONDS}s.`,
    };
  }
  if (rounded > MAX_SEQUENCE_DURATION_SECONDS) {
    return {
      valid: false,
      clampedSeconds: MAX_SEQUENCE_DURATION_SECONDS,
      reason: `Single sequence duration cannot exceed ${MAX_SEQUENCE_DURATION_SECONDS}s.`,
    };
  }
  return { valid: true, clampedSeconds: rounded };
}

export function calculateFilmProductionPlan(
  targetMinutes: number,
  sequenceMaxSeconds: number = MAX_SEQUENCE_DURATION_SECONDS,
): FilmProductionPlan {
  const safeMinutes = Math.max(1, Math.min(MAX_FILM_DURATION_MINUTES, Math.round(targetMinutes)));
  const safeSeqMax = Math.max(
    MIN_SEQUENCE_DURATION_SECONDS,
    Math.min(MAX_SEQUENCE_DURATION_SECONDS, Math.round(sequenceMaxSeconds)),
  );
  const totalSeconds = safeMinutes * 60;
  const minimumSequences = Math.ceil(totalSeconds / safeSeqMax);
  // 12% practical buffer for variants, replacements, continuity retakes
  const recommendedGenerationsWithBuffer = Math.ceil(minimumSequences * 1.12);
  // Average ~28 credits per 15s HD sequence + ~4 credits audio/assembly overhead per sequence
  const estimatedCreditsTotal = recommendedGenerationsWithBuffer * 32;
  // Block assembly every 20 sequences (~5 minutes per block) for sync safety (§5.5)
  const assemblyBlocksCount = Math.max(1, Math.ceil(minimumSequences / 20));

  return {
    targetMinutes: safeMinutes,
    totalSeconds,
    maxSequenceSeconds: safeSeqMax,
    minimumSequences,
    recommendedGenerationsWithBuffer,
    estimatedCreditsTotal,
    assemblyBlocksCount,
  };
}

export interface VideoCostParams {
  durationSeconds: number;
  resolution: VideoResolution;
  variants: number;
  mode: VideoMode;
  upscale4K?: boolean;
}

export function estimateVideoCost(params: VideoCostParams): {
  totalCredits: number;
  baseCredits: number;
  resolutionMultiplier: number;
  upscaleCredits: number;
  nativeResolution: VideoResolution;
  outputResolution: VideoResolution;
  isUpscaled: boolean;
} {
  const { clampedSeconds } = validateVideoDuration(params.durationSeconds);
  const safeVariants = Math.max(1, Math.min(4, Math.round(params.variants || 1)));
  const basePerSec = params.mode === 'video_to_video' || params.mode === 'character_reference' ? 3 : 2;
  const baseCredits = clampedSeconds * basePerSec;

  const multMap: Record<VideoResolution, number> = {
    '720p': 1,
    '1080p': 1.5,
    '1440p': 2,
    '4k': 2.5,
  };

  // Native generation max is 1080p/4k depending on model; 1440p is always FFmpeg upscaled from 1080p
  const isUpscaled = params.resolution === '1440p' || Boolean(params.upscale4K);
  const nativeResolution: VideoResolution =
    params.resolution === '1440p' ? '1080p' : params.upscale4K ? '1080p' : params.resolution;
  const resolutionMultiplier = multMap[nativeResolution];
  const upscaleCredits = isUpscaled ? 8 : 0;
  const totalCredits = Math.ceil((baseCredits * resolutionMultiplier + upscaleCredits) * safeVariants);

  return {
    totalCredits,
    baseCredits,
    resolutionMultiplier,
    upscaleCredits,
    nativeResolution,
    outputResolution: params.resolution,
    isUpscaled,
  };
}

export function estimateImageCost(params: {
  resolution: ImageResolution;
  variants: number;
  mode: ImageMode;
  upscale?: boolean;
}): {
  totalCredits: number;
  nativeResolution: string;
  outputResolution: string;
  isUpscaled: boolean;
} {
  const safeVariants = Math.max(1, Math.min(4, Math.round(params.variants || 1)));
  const resCostMap: Record<ImageResolution, number> = {
    '1024x1024': 4,
    '1536x1024': 6,
    '2048x2048': 9,
    '4096x4096': 14,
  };
  const modeBonus =
    params.mode === 'inpainting' || params.mode === 'outpainting' || params.mode === 'object_replacement'
      ? 2
      : 0;
  const isUpscaled = params.mode === 'upscale' || Boolean(params.upscale);
  const upscaleAdd = isUpscaled ? 4 : 0;
  const totalCredits = (resCostMap[params.resolution] + modeBonus + upscaleAdd) * safeVariants;

  return {
    totalCredits,
    nativeResolution: isUpscaled && params.resolution === '4096x4096' ? '2048x2048' : params.resolution,
    outputResolution: params.resolution,
    isUpscaled,
  };
}

export function estimateAudioCost(params: {
  type: 'tts' | 'music';
  textLength?: number;
  multiSpeaker?: boolean;
}): number {
  if (params.type === 'music') return 12;
  const len = Math.max(1, params.textLength ?? 120);
  const base = Math.ceil(len / 250) * 2;
  return params.multiSpeaker ? base + 3 : base;
}

const TIER_ORDER: Record<PlanTierId, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  pro: 3,
  annual_1: 4,
  annual_2: 5,
};

export function canUserAccessModel(
  role: UserRole,
  planId: PlanTierId,
  model: AIModelConfig,
): boolean {
  if (!model.enabled) return false;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'visitor') return false;
  return TIER_ORDER[planId] >= TIER_ORDER[model.minPlanTier];
}

export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function selectOptimalModel(params: {
  category: ModelCategory;
  requestedResolution?: string;
  durationSeconds?: number;
  userRole: UserRole;
  userPlan: PlanTierId;
  catalog: AIModelConfig[];
  preferLowCost?: boolean;
}): {
  selectedModel: AIModelConfig | null;
  reason: string;
} {
  const candidates = params.catalog.filter(
    (m) => m.category === params.category && canUserAccessModel(params.userRole, params.userPlan, m),
  );

  if (candidates.length === 0) {
    return {
      selectedModel: null,
      reason: 'No enabled model matches your subscription tier.',
    };
  }

  const sorted = [...candidates].sort((a, b) => {
    // Prefer live connected models first so real generation works out of the box
    if (a.isLiveConnected !== b.isLiveConnected) {
      return a.isLiveConnected ? -1 : 1;
    }
    // Check resolution support if specified
    if (params.requestedResolution) {
      const aRes = a.nativeResolutions.includes(params.requestedResolution) ? 1 : 0;
      const bRes = b.nativeResolutions.includes(params.requestedResolution) ? 1 : 0;
      if (aRes !== bRes) return bRes - aRes;
    }
    if (params.preferLowCost) {
      return a.creditCostBase - b.creditCostBase;
    }
    return a.avgLatencyMs - b.avgLatencyMs;
  });

  const best = sorted[0];
  return {
    selectedModel: best,
    reason: `Selected ${best.name} (${best.provider}) based on tier compatibility, resolution support, and queue latency.`,
  };
}

const BLOCKED_SAFETY_PATTERNS: RegExp[] = [
  /\b(csam|child\s*abuse|exploit\s*minor|underage\s*explicit)\b/i,
  /\b(build\s+a\s+bomb|nerve\s+agent|bioweapon|ricin\s+synthesis)\b/i,
  /\b(deepfake\s+non[- ]?consensual|impersonate\s+passport|forge\s+id)\b/i,
  /\b(bypass\s+safety|ignore\s+previous\s+instructions|jailbreak\s+system)\b/i,
];

export function screenPromptSafety(prompt: string): {
  allowed: boolean;
  reason?: string;
} {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    return {
      allowed: false,
      reason: 'Prompt must contain at least 3 characters.',
    };
  }
  for (const pattern of BLOCKED_SAFETY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'Prompt rejected by safety & compliance policy (§11.4).',
      };
    }
  }
  return { allowed: true };
}
