export type Language = 'fr' | 'en';

export type UserRole =
  | 'visitor'
  | 'free'
  | 'basic'
  | 'plus'
  | 'pro'
  | 'annual_1'
  | 'annual_2'
  | 'admin'
  | 'super_admin';

export type PlanTierId = 'free' | 'basic' | 'plus' | 'pro' | 'annual_1' | 'annual_2';

export type VideoMode =
  | 'text_to_video'
  | 'image_to_video'
  | 'video_to_video'
  | 'first_last_frame'
  | 'character_reference'
  | 'scene_generation';

export type ImageMode =
  | 'text_to_image'
  | 'image_to_image'
  | 'inpainting'
  | 'outpainting'
  | 'object_removal'
  | 'object_replacement'
  | 'cutout'
  | 'upscale'
  | 'color_correction';

export type VideoResolution = '720p' | '1080p' | '1440p' | '4k';
export type ImageResolution = '1024x1024' | '1536x1024' | '2048x2048' | '4096x4096';

export type GenerationQueueStatus =
  | 'pending'
  | 'preparing'
  | 'generating'
  | 'verifying'
  | 'assembling'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AssetKind = 'video' | 'image' | 'audio' | 'film_export';

export type ModelCategory = 'video' | 'image' | 'audio' | 'music' | 'orchestrator';

export interface PlanDefinition {
  id: PlanTierId;
  name: string;
  nameEn: string;
  billingCycle: 'monthly' | 'yearly';
  taglineFr: string;
  taglineEn: string;
  priceUsd: number;
  firstMonthDiscountPercent: number;
  includedCredits: number;
  dailyCreditCap: number;
  maxVideoResolution: VideoResolution;
  maxFilmMinutes: number;
  priorityQueue: 'standard' | 'elevated' | 'high' | 'dedicated';
  teamSeats: number;
  apiAccess: boolean;
  recommended?: boolean;
  featuresFr: string[];
  featuresEn: string[];
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  category: ModelCategory;
  sdkModelId: string;
  isLiveConnected: boolean;
  requiresPaidKey: boolean;
  enabled: boolean;
  fallbackModelId: string | null;
  maxDurationSeconds: number;
  nativeResolutions: string[];
  supportsUpscaleTo4K: boolean;
  creditCostBase: number;
  creditCostPerSecond: number;
  avgLatencyMs: number;
  minPlanTier: PlanTierId;
  descriptionFr: string;
  descriptionEn: string;
  totalCalls?: number;
  failureRate?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  planId: PlanTierId;
  emailVerified: boolean;
  mfaEnabled: boolean;
  suspended: boolean;
  firstMonthDiscountUsed?: boolean;
  language: Language;
  organization: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface WalletInfo {
  userId: string;
  balance: number;
  reserved: number;
  monthlySpent: number;
  dailyLimit: number;
  lowBalanceThreshold: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'credit_grant' | 'reservation' | 'debit_confirm' | 'refund' | 'subscription_charge' | 'topup';
  amount: number;
  balanceAfter: number;
  description: string;
  paymentMethod: string;
  referenceId: string | null;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  genre: string;
  targetDurationMinutes: number;
  aspectRatio: string;
  visualStyle: string;
  status: 'draft' | 'in_production' | 'archived' | 'completed';
  coherenceScoreText: string;
  createdAt: string;
  updatedAt: string;
  sceneCount?: number;
  assetCount?: number;
}

export interface CharacterRef {
  id: string;
  projectId: string;
  name: string;
  role: string;
  physicalTraits: string;
  costume: string;
  voiceStyle: string;
  imageAssetId: string | null;
  imageUrl: string | null;
}

export interface LocationRef {
  id: string;
  projectId: string;
  name: string;
  atmosphere: string;
  lighting: string;
  continuityNotes: string;
  imageAssetId: string | null;
  imageUrl: string | null;
}

export interface SceneRecord {
  id: string;
  projectId: string;
  orderIndex: number;
  chapterTitle: string;
  title: string;
  visualPrompt: string;
  dialogue: string;
  speakerName: string;
  cameraMovement: string;
  framing: string;
  lightingMood: string;
  durationSeconds: number;
  transitionType: 'cut' | 'crossfade' | 'fade_black';
  subtitleText: string;
  videoAssetId: string | null;
  videoUrl: string | null;
  audioAssetId: string | null;
  audioUrl: string | null;
  keyframeUrl: string | null;
  status: 'planned' | 'generating' | 'ready' | 'needs_revision';
}

export interface MediaAssetRecord {
  id: string;
  userId: string;
  projectId: string | null;
  kind: AssetKind;
  title: string;
  prompt: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  nativeResolution: string;
  outputResolution: string;
  isUpscaled: boolean;
  modelId: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface GenerationJobRecord {
  id: string;
  userId: string;
  projectId: string | null;
  sceneId: string | null;
  category: 'video' | 'image' | 'audio' | 'music' | 'film_assembly';
  mode: string;
  prompt: string;
  enhancedPrompt: string | null;
  modelId: string;
  autoSelected: boolean;
  status: GenerationQueueStatus;
  progress: number;
  estimatedCredits: number;
  reservedCredits: number;
  chargedCredits: number;
  refundedCredits: number;
  errorMessage: string | null;
  outputAssetId: string | null;
  outputUrl: string | null;
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilmExportRecord {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  fileUrl: string;
  durationSeconds: number;
  resolution: string;
  subtitlesIncluded: boolean;
  sceneCount: number;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: 'technical' | 'billing' | 'model_access' | 'abuse_report';
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  createdAt: string;
}

export interface FilmProductionPlan {
  targetMinutes: number;
  totalSeconds: number;
  maxSequenceSeconds: number;
  minimumSequences: number;
  recommendedGenerationsWithBuffer: number;
  estimatedCreditsTotal: number;
  assemblyBlocksCount: number;
}
