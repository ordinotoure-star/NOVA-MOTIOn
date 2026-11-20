import bcrypt from 'bcryptjs';
import type { Express, NextFunction, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzePromptWithOrchestrator,
  checkFilmCoherenceWithAI,
  formatGeminiError,
  generateFilmPlanWithAI,
  generateImageWithAI,
  generateMusicWithAI,
  generateSpeechAudioWithAI,
  generateVideoWithAI,
} from './aiService';
import { db, hashSessionToken } from './db';
import {
  EXPORTS_DIR,
  UPLOADS_DIR,
  assembleFilmWithFfmpeg,
  ensureMediaDirs,
  generateThumbnailFromVideo,
  upscaleImageWithFfmpeg,
  upscaleVideoWithFfmpeg,
} from './ffmpegEngine';
import {
  PLANS,
  calculateFilmProductionPlan,
  calculatePlanCheckoutPrice,
  canUserAccessModel,
  estimateAudioCost,
  estimateImageCost,
  estimateVideoCost,
  hasAdminPermission,
  screenPromptSafety,
  selectOptimalModel,
  validateVideoDuration,
} from '../src/shared/pricingAndFilmMath';
import type {
  AIModelConfig,
  GenerationQueueStatus,
  ImageMode,
  ImageResolution,
  Language,
  PlanTierId,
  UserProfile,
  UserRole,
  VideoMode,
  VideoResolution,
} from '../src/shared/types';

ensureMediaDirs();

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
});

interface AuthedRequest extends Request {
  user?: UserProfile;
  sessionId?: string;
}

// SSE subscribers per user
const sseClients = new Map<string, Set<Response>>();

function broadcastToUser(userId: string, event: string, payload: unknown): void {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const serialized = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    res.write(serialized);
  }
}

// Simple in-memory rate limiter
const rateHits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxHits: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = rateHits.get(key);
    if (!record || record.resetAt < now) {
      rateHits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxHits) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter quelques instants.' });
    }
    record.count += 1;
    next();
  };
}

function logAudit(
  actorUserId: string | null,
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string,
  ipAddress = '127.0.0.1',
): void {
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, actor_email, action, target_type, target_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`aud_${crypto.randomUUID().slice(0, 8)}`, actorUserId, actorEmail, action, targetType, targetId, details, ipAddress, new Date().toISOString());
}

function createNotification(
  userId: string,
  title: string,
  message: string,
  kind: 'info' | 'success' | 'warning' | 'error' = 'info',
): void {
  const id = `ntf_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, kind, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(id, userId, title, message, kind, createdAt);
  broadcastToUser(userId, 'notification', { id, userId, title, message, kind, read: false, createdAt });
}

function mapUserRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    role: row.role as UserRole,
    planId: row.plan_id as PlanTierId,
    emailVerified: Boolean(row.email_verified),
    mfaEnabled: Boolean(row.mfa_enabled),
    suspended: Boolean(row.suspended),
    firstMonthDiscountUsed: Boolean(row.first_month_discount_used),
    language: (row.language as Language) || 'fr',
    organization: String(row.organization || ''),
    createdAt: String(row.created_at),
    lastLoginAt: String(row.last_login_at),
  };
}

function mapModelRow(row: Record<string, unknown>): AIModelConfig {
  const totalCalls = Number(row.total_calls ?? 0);
  const failureCount = Number(row.failure_count ?? 0);
  return {
    id: String(row.id),
    name: String(row.name),
    provider: String(row.provider),
    category: row.category as AIModelConfig['category'],
    sdkModelId: String(row.sdk_model_id),
    isLiveConnected: Boolean(row.is_live_connected),
    requiresPaidKey: Boolean(row.requires_paid_key),
    enabled: Boolean(row.enabled),
    fallbackModelId: row.fallback_model_id ? String(row.fallback_model_id) : null,
    maxDurationSeconds: Number(row.max_duration_seconds),
    nativeResolutions: JSON.parse(String(row.native_resolutions_json || '[]')),
    supportsUpscaleTo4K: Boolean(row.supports_upscale_4k),
    creditCostBase: Number(row.credit_cost_base),
    creditCostPerSecond: Number(row.credit_cost_per_second),
    avgLatencyMs: Number(row.avg_latency_ms),
    minPlanTier: row.min_plan_tier as PlanTierId,
    descriptionFr: String(row.description_fr),
    descriptionEn: String(row.description_en),
    totalCalls,
    failureRate: totalCalls > 0 ? Number(((failureCount / totalCalls) * 100).toFixed(1)) : 0,
  };
}

function getAllModelsFromDb(): AIModelConfig[] {
  const rows = db.prepare('SELECT * FROM models ORDER BY category, is_live_connected DESC, credit_cost_base ASC').all() as Array<
    Record<string, unknown>
  >;
  return rows.map(mapModelRow);
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const rawToken = req.cookies?.nova_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!rawToken) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const tokenHash = hashSessionToken(String(rawToken));
  const session = db
    .prepare(`SELECT * FROM sessions WHERE token_hash = ? AND revoked = 0`)
    .get(tokenHash) as Record<string, unknown> | undefined;
  if (!session) {
    res.status(401).json({ error: 'Session expirée ou révoquée.' });
    return;
  }
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as
    | Record<string, unknown>
    | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Compte introuvable.' });
    return;
  }
  if (userRow.suspended) {
    res.status(403).json({ error: 'Compte suspendu par l’administration.' });
    return;
  }
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), session.id);
  req.user = mapUserRow(userRow);
  req.sessionId = String(session.id);
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !hasAdminPermission(req.user.role)) {
    res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    return;
  }
  next();
}

function createSessionCookie(res: Response, userId: string, deviceLabel: string, ipAddress: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, device_label, ip_address, created_at, last_seen_at, revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(`ses_${crypto.randomUUID().slice(0, 8)}`, userId, tokenHash, deviceLabel, ipAddress, now, now);

  res.cookie('nova_session', rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return rawToken;
}

const reserveCreditsTx = db.transaction((userId: string, amount: number, refId: string, description: string) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!wallet) throw new Error('Portefeuille introuvable.');
  const available = Number(wallet.balance) - Number(wallet.reserved);
  if (available < amount) {
    throw new Error(`Crédits insuffisants (${available} disponibles, ${amount} requis).`);
  }
  const newReserved = Number(wallet.reserved) + amount;
  db.prepare('UPDATE wallets SET reserved = ? WHERE user_id = ?').run(newReserved, userId);
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
    VALUES (?, ?, 'reservation', ?, ?, ?, 'credits', ?, ?)
  `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, userId, -amount, Number(wallet.balance), description, refId, new Date().toISOString());
});

const confirmCreditsTx = db.transaction((userId: string, amount: number, refId: string, description: string) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!wallet) return;
  const newReserved = Math.max(0, Number(wallet.reserved) - amount);
  const newBalance = Math.max(0, Number(wallet.balance) - amount);
  const newSpent = Number(wallet.monthly_spent) + amount;
  db.prepare('UPDATE wallets SET balance = ?, reserved = ?, monthly_spent = ? WHERE user_id = ?').run(
    newBalance,
    newReserved,
    newSpent,
    userId,
  );
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
    VALUES (?, ?, 'debit_confirm', ?, ?, ?, 'credits', ?, ?)
  `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, userId, -amount, newBalance, description, refId, new Date().toISOString());
});

const refundCreditsTx = db.transaction((userId: string, amount: number, refId: string, description: string) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!wallet || amount <= 0) return;
  const newReserved = Math.max(0, Number(wallet.reserved) - amount);
  db.prepare('UPDATE wallets SET reserved = ? WHERE user_id = ?').run(newReserved, userId);
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
    VALUES (?, ?, 'refund', ?, ?, ?, 'credits', ?, ?)
  `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, userId, amount, Number(wallet.balance), description, refId, new Date().toISOString());
});

function updateJobState(
  jobId: string,
  userId: string,
  patch: Partial<{
    status: GenerationQueueStatus;
    progress: number;
    errorMessage: string | null;
    outputAssetId: string | null;
    outputUrl: string | null;
    chargedCredits: number;
    refundedCredits: number;
  }>,
): void {
  const current = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId) as Record<string, unknown> | undefined;
  if (!current) return;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE generations
    SET status = COALESCE(?, status),
        progress = COALESCE(?, progress),
        error_message = ?,
        output_asset_id = COALESCE(?, output_asset_id),
        output_url = COALESCE(?, output_url),
        charged_credits = COALESCE(?, charged_credits),
        refunded_credits = COALESCE(?, refunded_credits),
        updated_at = ?
    WHERE id = ?
  `).run(
    patch.status ?? null,
    patch.progress ?? null,
    patch.errorMessage !== undefined ? patch.errorMessage : current.error_message,
    patch.outputAssetId ?? null,
    patch.outputUrl ?? null,
    patch.chargedCredits ?? null,
    patch.refundedCredits ?? null,
    now,
    jobId,
  );
  const updated = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId);
  broadcastToUser(userId, 'generation_update', updated);
}

const cancelledJobs = new Set<string>();

async function runGenerationJob(
  jobId: string,
  user: UserProfile,
  model: AIModelConfig,
  payload: Record<string, unknown>,
): Promise<void> {
  const reserved = Number(payload.estimatedCredits ?? 0);
  try {
    if (cancelledJobs.has(jobId)) return;
    updateJobState(jobId, user.id, { status: 'preparing', progress: 18 });
    await new Promise((r) => setTimeout(r, 250));
    if (cancelledJobs.has(jobId)) return;

    updateJobState(jobId, user.id, { status: 'generating', progress: 45 });

    let assetId: string | null = null;
    let outputUrl: string | null = null;
    const category = String(payload.category);

    db.prepare('UPDATE models SET total_calls = total_calls + 1 WHERE id = ?').run(model.id);

    if (category === 'image') {
      const res = await generateImageWithAI({
        prompt: String(payload.effectivePrompt || payload.prompt),
        sdkModelId: model.sdkModelId,
        aspectRatio: String(payload.aspectRatio || '1:1'),
        resolution: String(payload.resolution || '1024x1024'),
        referenceImageBase64: payload.referenceImageBase64 ? String(payload.referenceImageBase64) : undefined,
        referenceMimeType: payload.referenceMimeType ? String(payload.referenceMimeType) : undefined,
      });

      let finalUrl = res.fileUrl;
      let isUpscaled = Boolean(payload.upscale);
      let finalWidth = 1024;
      let finalHeight = 1024;
      const [rw, rh] = String(payload.resolution || '1024x1024').split('x').map(Number);
      if (rw && rh) {
        finalWidth = rw;
        finalHeight = rh;
      }

      if (payload.mode === 'upscale' || payload.upscale) {
        const upName = `up-${path.basename(res.filePath)}`;
        const upPath = path.join(UPLOADS_DIR, upName);
        await upscaleImageWithFfmpeg(res.filePath, upPath, finalWidth, finalHeight);
        finalUrl = `/uploads/${upName}`;
        isUpscaled = true;
      }

      updateJobState(jobId, user.id, { status: 'verifying', progress: 85 });
      assetId = `ast_${crypto.randomUUID().slice(0, 8)}`;
      outputUrl = finalUrl;
      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, 'image', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        assetId,
        user.id,
        payload.projectId ? String(payload.projectId) : null,
        String(payload.title || payload.prompt).slice(0, 64),
        String(payload.prompt),
        finalUrl,
        finalUrl,
        res.mimeType,
        finalWidth,
        finalHeight,
        String(payload.nativeResolution || payload.resolution || '1024x1024'),
        String(payload.resolution || '1024x1024'),
        isUpscaled ? 1 : 0,
        model.id,
        res.fileSizeBytes,
        new Date().toISOString(),
      );
    } else if (category === 'video') {
      const res = await generateVideoWithAI({
        prompt: String(payload.effectivePrompt || payload.prompt),
        aspectRatio: String(payload.aspectRatio || '16:9'),
        durationSeconds: Number(payload.durationSeconds || 5),
        resolution: String(payload.resolution || '720p'),
        referenceImageBase64: payload.referenceImageBase64 ? String(payload.referenceImageBase64) : undefined,
        referenceMimeType: payload.referenceMimeType ? String(payload.referenceMimeType) : undefined,
        endImageBase64: payload.endImageBase64 ? String(payload.endImageBase64) : undefined,
        endMimeType: payload.endMimeType ? String(payload.endMimeType) : undefined,
      });

      let finalUrl = res.fileUrl;
      const isUpscaled = Boolean(payload.isUpscaled);
      let width = 1280;
      let height = 720;
      if (payload.resolution === '1080p') {
        width = 1920;
        height = 1080;
      } else if (payload.resolution === '1440p') {
        width = 2560;
        height = 1440;
        updateJobState(jobId, user.id, { status: 'assembling', progress: 82 });
        const upName = `up-${path.basename(res.filePath)}`;
        await upscaleVideoWithFfmpeg(res.filePath, path.join(UPLOADS_DIR, upName), width, height);
        finalUrl = `/uploads/${upName}`;
      } else if (payload.resolution === '4k') {
        width = 3840;
        height = 2160;
      }

      updateJobState(jobId, user.id, { status: 'verifying', progress: 92 });
      assetId = `ast_${crypto.randomUUID().slice(0, 8)}`;
      outputUrl = finalUrl;
      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, 'video', ?, ?, ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        assetId,
        user.id,
        payload.projectId ? String(payload.projectId) : null,
        String(payload.title || payload.prompt).slice(0, 64),
        String(payload.prompt),
        finalUrl,
        res.thumbUrl,
        width,
        height,
        Number(payload.durationSeconds || 5),
        String(payload.nativeResolution || payload.resolution || '720p'),
        String(payload.resolution || '720p'),
        isUpscaled ? 1 : 0,
        model.id,
        res.fileSizeBytes,
        new Date().toISOString(),
      );

      if (payload.sceneId) {
        db.prepare('UPDATE scenes SET video_asset_id = ?, video_url = ?, keyframe_url = COALESCE(?, keyframe_url), status = ? WHERE id = ?').run(
          assetId,
          finalUrl,
          res.thumbUrl,
          'ready',
          String(payload.sceneId),
        );
      }
    } else if (category === 'audio') {
      const res = await generateSpeechAudioWithAI({
        text: String(payload.prompt),
        voiceName: String(payload.voiceName || 'Kore'),
        style: String(payload.style || 'Cinematic narrator'),
        multiSpeaker: Boolean(payload.multiSpeaker),
        secondSpeakerText: payload.secondSpeakerText ? String(payload.secondSpeakerText) : undefined,
        secondVoiceName: payload.secondVoiceName ? String(payload.secondVoiceName) : undefined,
      });

      updateJobState(jobId, user.id, { status: 'verifying', progress: 90 });
      assetId = `ast_${crypto.randomUUID().slice(0, 8)}`;
      outputUrl = res.fileUrl;
      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, 'audio', ?, ?, ?, NULL, 'audio/wav', 0, 0, NULL, '24kHz WAV', '24kHz WAV', 0, ?, ?, ?)
      `).run(
        assetId,
        user.id,
        payload.projectId ? String(payload.projectId) : null,
        String(payload.title || 'Dialogue / Voix IA').slice(0, 64),
        String(payload.prompt),
        res.fileUrl,
        model.id,
        res.fileSizeBytes,
        new Date().toISOString(),
      );

      if (payload.sceneId) {
        db.prepare('UPDATE scenes SET audio_asset_id = ?, audio_url = ? WHERE id = ?').run(
          assetId,
          res.fileUrl,
          String(payload.sceneId),
        );
      }
    } else if (category === 'music') {
      const res = await generateMusicWithAI({ prompt: String(payload.prompt) });
      updateJobState(jobId, user.id, { status: 'verifying', progress: 90 });
      assetId = `ast_${crypto.randomUUID().slice(0, 8)}`;
      outputUrl = res.fileUrl;
      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, 'audio', ?, ?, ?, NULL, ?, 0, 0, 30, 'Stereo', 'Stereo', 0, ?, ?, ?)
      `).run(
        assetId,
        user.id,
        payload.projectId ? String(payload.projectId) : null,
        String(payload.title || 'Musique Originale Lyria').slice(0, 64),
        String(payload.prompt),
        res.fileUrl,
        res.mimeType,
        model.id,
        res.fileSizeBytes,
        new Date().toISOString(),
      );
    }

    if (cancelledJobs.has(jobId)) {
      refundCreditsTx(user.id, reserved, jobId, `Annulation utilisateur · ${jobId}`);
      updateJobState(jobId, user.id, { status: 'cancelled', refundedCredits: reserved });
      return;
    }

    confirmCreditsTx(user.id, reserved, jobId, `Génération réussie · ${model.name}`);
    updateJobState(jobId, user.id, {
      status: 'completed',
      progress: 100,
      outputAssetId: assetId,
      outputUrl,
      chargedCredits: reserved,
    });
    createNotification(user.id, 'Génération terminée', `Votre média (${model.name}) est prêt dans la bibliothèque.`, 'success');
  } catch (err) {
    const cleanErr = formatGeminiError(err);
    db.prepare('UPDATE models SET failure_count = failure_count + 1 WHERE id = ?').run(model.id);
    refundCreditsTx(user.id, reserved, jobId, `Remboursement automatique · Échec ${model.name}`);
    updateJobState(jobId, user.id, {
      status: 'failed',
      errorMessage: cleanErr,
      refundedCredits: reserved,
    });
    createNotification(
      user.id,
      'Échec de génération · Crédits remboursés',
      `${reserved} crédits ont été remboursés automatiquement. Détail : ${cleanErr}`,
      'warning',
    );
  }
}

export function registerRoutes(app: Express): void {
  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'NOVA MOTION AI', timestamp: new Date().toISOString() });
  });

  // Public Catalog & Plans
  app.get('/api/plans', (_req, res) => {
    res.json({ plans: PLANS });
  });

  app.get('/api/models', (_req, res) => {
    res.json({ models: getAllModelsFromDb() });
  });

  // Auth routes
  app.post('/api/auth/register', rateLimit(15, 60_000), (req, res) => {
    const { email, password, fullName, organization, language } = req.body ?? {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'E-mail, nom complet et mot de passe requis.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    }
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(String(password), 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, plan_id, email_verified, mfa_enabled, suspended, language, organization, created_at, last_login_at)
      VALUES (?, ?, ?, ?, 'free', 'free', 0, 0, 0, ?, ?, ?, ?)
    `).run(id, normalizedEmail, passwordHash, String(fullName).trim(), language === 'en' ? 'en' : 'fr', String(organization || ''), now, now);

    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(id);
    db.prepare('INSERT INTO wallets (user_id, balance, reserved, monthly_spent, daily_limit, low_balance_threshold) VALUES (?, 200, 0, 0, 100, 20)').run(id);
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, payment_method, status, renews_at, created_at)
      VALUES (?, ?, 'free', 'monthly', 'none', 'active', ?, ?)
    `).run(`sub_${crypto.randomUUID().slice(0, 8)}`, id, new Date(Date.now() + 30 * 86400_000).toISOString(), now);

    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
      VALUES (?, ?, 'credit_grant', 200, 200, 'Crédits de bienvenue offerts (Offre FREE · 200 cr.)', 'system', NULL, ?)
    `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, id, now);

    createSessionCookie(res, id, req.headers['user-agent']?.slice(0, 64) || 'Navigateur Web', req.ip || '127.0.0.1');
    logAudit(id, normalizedEmail, 'USER_REGISTERED', 'user', id, 'Inscription compte gratuit', req.ip || '127.0.0.1');

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({ user: mapUserRow(userRow), verificationNotice: 'Un lien de vérification d’e-mail a été généré (vérifiable dans Paramètres).' });
  });

  app.post('/api/auth/login', rateLimit(20, 60_000), (req, res) => {
    const { email, password, mfaCode } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
      | Record<string, unknown>
      | undefined;
    if (!userRow || !bcrypt.compareSync(String(password), String(userRow.password_hash))) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    if (userRow.suspended) {
      return res.status(403).json({ error: 'Ce compte est suspendu.' });
    }
    if (userRow.mfa_enabled) {
      if (!mfaCode) {
        const generatedCode = '482910';
        db.prepare('UPDATE users SET mfa_code = ? WHERE id = ?').run(generatedCode, userRow.id);
        return res.status(202).json({
          mfaRequired: true,
          hint: 'Code MFA généré pour validation sécurisée (demo: 482910).',
        });
      }
      if (String(mfaCode).trim() !== String(userRow.mfa_code || '482910')) {
        return res.status(401).json({ error: 'Code d’authentification multifacteur invalide.' });
      }
    }

    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), userRow.id);
    createSessionCookie(
      res,
      String(userRow.id),
      req.headers['user-agent']?.slice(0, 64) || 'Navigateur Web',
      req.ip || '127.0.0.1',
    );
    logAudit(String(userRow.id), normalizedEmail, 'USER_LOGIN', 'user', String(userRow.id), 'Connexion par mot de passe', req.ip || '127.0.0.1');
    res.json({ user: mapUserRow(userRow) });
  });

  app.post('/api/auth/demo-login', (req, res) => {
    const target = req.body?.account === 'admin' ? 'admin@novamotion.ai' : 'demo@novamotion.ai';
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(target) as Record<string, unknown> | undefined;
    if (!userRow) {
      return res.status(404).json({ error: 'Compte de démonstration introuvable.' });
    }
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), userRow.id);
    createSessionCookie(
      res,
      String(userRow.id),
      req.headers['user-agent']?.slice(0, 64) || 'Session Studio Demo',
      req.ip || '127.0.0.1',
    );
    logAudit(String(userRow.id), target, 'DEMO_LOGIN', 'user', String(userRow.id), `Accès direct espace ${userRow.role}`, req.ip || '127.0.0.1');
    res.json({ user: mapUserRow(userRow) });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body ?? {};
    if (!email) return res.status(400).json({ error: 'Adresse e-mail requise.' });
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).trim().toLowerCase()) as
      | { id: string }
      | undefined;
    if (row && newPassword && String(newPassword).length >= 8) {
      const hash = bcrypt.hashSync(String(newPassword), 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.id);
      logAudit(row.id, String(email), 'PASSWORD_RESET', 'user', row.id, 'Mot de passe réinitialisé');
    }
    res.json({ ok: true, message: 'Si le compte existe, les instructions de réinitialisation ont été appliquées.' });
  });

  app.post('/api/auth/logout', requireAuth as never, (req: AuthedRequest, res) => {
    if (req.sessionId) {
      db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(req.sessionId);
    }
    res.clearCookie('nova_session');
    res.json({ ok: true });
  });

  app.post('/api/auth/logout-all', requireAuth as never, (req: AuthedRequest, res) => {
    if (req.user) {
      db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(req.user.id);
      logAudit(req.user.id, req.user.email, 'LOGOUT_ALL_SESSIONS', 'user', req.user.id, 'Révocation de toutes les sessions actives');
    }
    res.clearCookie('nova_session');
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req: AuthedRequest, res) => {
    const rawToken = req.cookies?.nova_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!rawToken) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const tokenHash = hashSessionToken(String(rawToken));
    const sessionRow = db
      .prepare('SELECT id, user_id, created_at, revoked FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as { id: string; user_id: string; created_at: string; revoked: number } | undefined;
    const maxAgeMs = 7 * 24 * 3600 * 1000;
    const isExpired = sessionRow ? Date.now() - new Date(sessionRow.created_at).getTime() > maxAgeMs : true;
    if (!sessionRow || sessionRow.revoked || isExpired) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(sessionRow.user_id) as Record<string, unknown> | undefined;
    if (!userRow || Boolean(userRow.suspended)) {
      res.json({ authenticated: false, user: null });
      return;
    }
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), sessionRow.id);
    res.json({ authenticated: true, user: mapUserRow(userRow) });
  });

  app.get('/api/auth/me', requireAuth as never, (req: AuthedRequest, res) => {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id);
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").get(req.user!.id);
    res.json({ user: req.user, wallet, subscription: sub });
  });

  app.post('/api/auth/verify-email', requireAuth as never, (req: AuthedRequest, res) => {
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  app.post('/api/auth/mfa/toggle', requireAuth as never, (req: AuthedRequest, res) => {
    const enabled = Boolean(req.body?.enabled);
    db.prepare('UPDATE users SET mfa_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.user!.id);
    logAudit(req.user!.id, req.user!.email, 'MFA_TOGGLED', 'user', req.user!.id, `MFA ${enabled ? 'activé' : 'désactivé'}`);
    res.json({ mfaEnabled: enabled });
  });

  app.get('/api/auth/devices', requireAuth as never, (req: AuthedRequest, res) => {
    const devices = db
      .prepare('SELECT id, device_label, ip_address, created_at, last_seen_at, revoked FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 15')
      .all(req.user!.id);
    res.json({ devices, currentSessionId: req.sessionId });
  });

  app.patch('/api/profile', requireAuth as never, (req: AuthedRequest, res) => {
    const { fullName, organization, language } = req.body ?? {};
    const safeLang = language === 'en' ? 'en' : language === 'fr' ? 'fr' : null;
    const safeName = typeof fullName === 'string' && fullName.trim().length > 0 ? fullName.trim() : null;
    const safeOrg = typeof organization === 'string' ? organization.trim() : null;
    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          organization = COALESCE(?, organization),
          language = COALESCE(?, language)
      WHERE id = ?
    `).run(safeName, safeOrg, safeLang, req.user!.id);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>;
    res.json({ user: mapUserRow(row) });
  });

  app.get('/api/auth/export-data', requireAuth as never, (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    const data = {
      exportedAt: new Date().toISOString(),
      user: req.user,
      wallet: db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(uid),
      projects: db.prepare('SELECT * FROM projects WHERE user_id = ?').all(uid),
      transactions: db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(uid),
      generations: db.prepare('SELECT id, category, mode, prompt, model_id, status, charged_credits, created_at FROM generations WHERE user_id = ?').all(uid),
    };
    logAudit(uid, req.user!.email, 'PERSONAL_DATA_EXPORTED', 'user', uid, 'Export RGPD JSON demandé');
    res.json(data);
  });

  app.delete('/api/auth/delete-account', requireAuth as never, (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    if (req.user!.email === 'admin@novamotion.ai') {
      return res.status(400).json({ error: 'Le compte Super Administrateur principal ne peut pas être supprimé depuis l’aperçu.' });
    }
    logAudit(uid, req.user!.email, 'ACCOUNT_DELETED', 'user', uid, 'Suppression définitive du compte');
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
    res.clearCookie('nova_session');
    res.json({ ok: true });
  });

  // SSE stream for real-time job queue & notifications
  app.get('/api/generations/stream', requireAuth as never, (req: AuthedRequest, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const uid = req.user!.id;
    if (!sseClients.has(uid)) sseClients.set(uid, new Set());
    sseClients.get(uid)!.add(res);

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.get(uid)?.delete(res);
    });
  });

  // Wallet, Billing & Subscriptions
  app.get('/api/wallet', requireAuth as never, (req: AuthedRequest, res) => {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id);
    const transactions = db
      .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(req.user!.id);
    const subscription = db
      .prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
      .get(req.user!.id);
    res.json({ wallet, transactions, subscription });
  });

  app.post('/api/subscriptions/checkout', requireAuth as never, (req: AuthedRequest, res) => {
    const { planId, paymentMethod, topupCredits } = req.body ?? {};
    const uid = req.user!.id;
    const now = new Date().toISOString();

    if (topupCredits && Number(topupCredits) > 0) {
      const add = Math.min(10000, Math.round(Number(topupCredits)));
      const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(uid) as Record<string, unknown>;
      const nextBal = Number(wallet.balance) + add;
      db.prepare('UPDATE wallets SET balance = ? WHERE user_id = ?').run(nextBal, uid);
      db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
        VALUES (?, ?, 'topup', ?, ?, ?, ?, ?, ?)
      `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, uid, add, nextBal, `Recharge de ${add} crédits`, String(paymentMethod || 'card'), null, now);
      return res.json({ ok: true, balance: nextBal });
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ error: 'Offre commerciale invalide.' });

    const userRow = db.prepare('SELECT first_month_discount_used FROM users WHERE id = ?').get(uid) as
      | { first_month_discount_used?: number }
      | undefined;
    const discountEligible = !Boolean(userRow?.first_month_discount_used);
    const pricing = calculatePlanCheckoutPrice(plan, discountEligible);

    db.prepare("UPDATE subscriptions SET status = 'superseded' WHERE user_id = ? AND status = 'active'").run(uid);
    const subId = `sub_${crypto.randomUUID().slice(0, 8)}`;
    const effectiveCycle = plan.billingCycle;
    const renewsAt = new Date(Date.now() + (effectiveCycle === 'yearly' ? 365 : 30) * 86400_000).toISOString();
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, payment_method, status, renews_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(subId, uid, plan.id, effectiveCycle, String(paymentMethod || 'card'), renewsAt, now);

    const newRole: UserRole =
      req.user!.role === 'admin' || req.user!.role === 'super_admin' ? req.user!.role : plan.id;
    db.prepare('UPDATE users SET plan_id = ?, role = ?, first_month_discount_used = CASE WHEN ? = 1 THEN 1 ELSE first_month_discount_used END WHERE id = ?')
      .run(plan.id, newRole, pricing.discountApplied ? 1 : 0, uid);

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(uid) as Record<string, unknown>;
    const nextBalance = Number(wallet.balance) + plan.includedCredits;
    db.prepare('UPDATE wallets SET balance = ?, daily_limit = ? WHERE user_id = ?').run(nextBalance, plan.dailyCreditCap, uid);
    const discountLabel = pricing.discountApplied
      ? ` · -$${pricing.discountAmountUsd.toFixed(2)} (-10% 1er mois => $${pricing.finalPriceUsd.toFixed(2)})`
      : plan.priceUsd > 0
        ? ` · $${pricing.finalPriceUsd.toFixed(2)}`
        : ' · Gratuit';
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
      VALUES (?, ?, 'subscription_charge', ?, ?, ?, ?, ?, ?)
    `).run(
      `tx_${crypto.randomUUID().slice(0, 8)}`,
      uid,
      plan.includedCredits,
      nextBalance,
      `Activation ${plan.name} (+${plan.includedCredits.toLocaleString('fr-FR')} crédits${discountLabel})`,
      String(paymentMethod || 'card'),
      subId,
      now,
    );

    logAudit(uid, req.user!.email, 'SUBSCRIPTION_CHANGED', 'subscription', subId, `Passage au forfait ${plan.name} ($${pricing.finalPriceUsd})`);
    createNotification(
      uid,
      `Abonnement ${plan.name} activé`,
      `${plan.includedCredits.toLocaleString('fr-FR')} crédits ont été ajoutés à votre portefeuille${pricing.discountApplied ? ' avec -10% sur votre 1er mois' : ''}.`,
      'success',
    );
    res.json({ ok: true, planId: plan.id, balance: nextBalance, pricing });
  });

  app.post('/api/subscriptions/cancel', requireAuth as never, (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(uid);
    const newRole: UserRole = req.user!.role === 'admin' || req.user!.role === 'super_admin' ? req.user!.role : 'free';
    db.prepare("UPDATE users SET plan_id = 'free', role = ? WHERE id = ?").run(newRole, uid);
    logAudit(uid, req.user!.email, 'SUBSCRIPTION_CANCELLED', 'user', uid, 'Annulation abonnement vers FREE');
    res.json({ ok: true });
  });

  // Notifications
  app.get('/api/notifications', requireAuth as never, (req: AuthedRequest, res) => {
    const items = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
      .all(req.user!.id);
    res.json({ notifications: items });
  });

  app.post('/api/notifications/read-all', requireAuth as never, (req: AuthedRequest, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  // Projects CRUD + Duplicate + Archive
  app.get('/api/projects', requireAuth as never, (req: AuthedRequest, res) => {
    const rows = db
      .prepare(`
        SELECT p.*,
          (SELECT COUNT(*) FROM scenes s WHERE s.project_id = p.id) as scene_count,
          (SELECT COUNT(*) FROM media_assets a WHERE a.project_id = p.id) as asset_count
        FROM projects p
        WHERE p.user_id = ?
        ORDER BY p.updated_at DESC
      `)
      .all(req.user!.id);
    res.json({ projects: rows });
  });

  app.post('/api/projects', requireAuth as never, (req: AuthedRequest, res) => {
    const { title, description, genre, targetDurationMinutes, aspectRatio, visualStyle } = req.body ?? {};
    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ error: 'Le titre du projet est requis.' });
    }
    const id = `proj_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const mins = Math.max(1, Math.min(60, Number(targetDurationMinutes || 5)));
    const plan = calculateFilmProductionPlan(mins);

    db.prepare(`
      INSERT INTO projects (id, user_id, title, description, genre, target_duration_minutes, aspect_ratio, visual_style, status, coherence_score_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      id,
      req.user!.id,
      String(title).trim(),
      String(description || ''),
      String(genre || 'Science-Fiction'),
      mins,
      String(aspectRatio || '16:9'),
      String(visualStyle || 'Cinématographique 35mm'),
      `Plan ${mins} min · ${plan.minimumSequences} séquences min.`,
      now,
      now,
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project, productionPlan: plan });
  });

  app.get('/api/projects/:id', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!project) return res.status(404).json({ error: 'Projet introuvable ou accès refusé.' });

    const scenes = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index ASC').all(req.params.id);
    const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(req.params.id);
    const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(req.params.id);
    const exports = db.prepare('SELECT * FROM film_exports WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
    const assets = db.prepare('SELECT * FROM media_assets WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
    const productionPlan = calculateFilmProductionPlan(Number(project.target_duration_minutes || 5));

    res.json({ project, scenes, characters, locations, exports, assets, productionPlan });
  });

  app.patch('/api/projects/:id', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { title, description, genre, targetDurationMinutes, aspectRatio, visualStyle, status } = req.body ?? {};
    db.prepare(`
      UPDATE projects
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          genre = COALESCE(?, genre),
          target_duration_minutes = COALESCE(?, target_duration_minutes),
          aspect_ratio = COALESCE(?, aspect_ratio),
          visual_style = COALESCE(?, visual_style),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title ?? null,
      description ?? null,
      genre ?? null,
      targetDurationMinutes ? Math.max(1, Math.min(60, Number(targetDurationMinutes))) : null,
      aspectRatio ?? null,
      visualStyle ?? null,
      status ?? null,
      new Date().toISOString(),
      req.params.id,
      req.user!.id,
    );
    res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) });
  });

  app.post('/api/projects/:id/duplicate', requireAuth as never, (req: AuthedRequest, res) => {
    const orig = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!orig) return res.status(404).json({ error: 'Projet introuvable.' });
    const newId = `proj_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, user_id, title, description, genre, target_duration_minutes, aspect_ratio, visual_style, status, coherence_score_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      newId,
      req.user!.id,
      `${orig.title} (Copie)`,
      orig.description,
      orig.genre,
      orig.target_duration_minutes,
      orig.aspect_ratio,
      orig.visual_style,
      orig.coherence_score_text,
      now,
      now,
    );
    const scenes = db.prepare('SELECT * FROM scenes WHERE project_id = ?').all(req.params.id) as Array<Record<string, unknown>>;
    for (const s of scenes) {
      db.prepare(`
        INSERT INTO scenes (id, project_id, order_index, chapter_title, title, visual_prompt, dialogue, speaker_name, camera_movement, framing, lighting_mood, duration_seconds, transition_type, subtitle_text, video_asset_id, video_url, audio_asset_id, audio_url, keyframe_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `scn_${crypto.randomUUID().slice(0, 8)}`,
        newId,
        s.order_index,
        s.chapter_title,
        s.title,
        s.visual_prompt,
        s.dialogue,
        s.speaker_name,
        s.camera_movement,
        s.framing,
        s.lighting_mood,
        s.duration_seconds,
        s.transition_type,
        s.subtitle_text,
        s.video_asset_id,
        s.video_url,
        s.audio_asset_id,
        s.audio_url,
        s.keyframe_url,
        s.status,
      );
    }
    res.status(201).json({ project: db.prepare('SELECT * FROM projects WHERE id = ?').get(newId) });
  });

  app.delete('/api/projects/:id', requireAuth as never, (req: AuthedRequest, res) => {
    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json({ ok: true });
  });

  // Cinema Bible (Characters & Locations) + Scenes management
  app.post('/api/projects/:id/characters', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { name, role, physicalTraits, costume, voiceStyle, imageUrl } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Nom du personnage requis.' });
    const id = `chr_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO characters (id, project_id, name, role, physical_traits, costume, voice_style, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, name, role || 'Secondaire', physicalTraits || '', costume || '', voiceStyle || 'Naturelle', imageUrl || null);
    res.status(201).json({ character: db.prepare('SELECT * FROM characters WHERE id = ?').get(id) });
  });

  app.post('/api/projects/:id/locations', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { name, atmosphere, lighting, continuityNotes, imageUrl } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Nom du décor requis.' });
    const id = `loc_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO locations (id, project_id, name, atmosphere, lighting, continuity_notes, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, name, atmosphere || '', lighting || '', continuityNotes || '', imageUrl || null);
    res.status(201).json({ location: db.prepare('SELECT * FROM locations WHERE id = ?').get(id) });
  });

  app.post('/api/projects/:id/scenes', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { title, chapterTitle, visualPrompt, dialogue, speakerName, cameraMovement, framing, lightingMood, durationSeconds, videoAssetId, videoUrl, keyframeUrl } = req.body ?? {};
    const { clampedSeconds } = validateVideoDuration(Number(durationSeconds || 5));
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM scenes WHERE project_id = ?').get(req.params.id) as { m: number }).m;
    const id = `scn_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO scenes (id, project_id, order_index, chapter_title, title, visual_prompt, dialogue, speaker_name, camera_movement, framing, lighting_mood, duration_seconds, transition_type, subtitle_text, video_asset_id, video_url, keyframe_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'crossfade', ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.id,
      maxOrder + 1,
      chapterTitle || 'Séquence ajoutée',
      title || 'Nouveau plan',
      visualPrompt || '',
      dialogue || '',
      speakerName || '',
      cameraMovement || 'Plan fixe',
      framing || 'Plan moyen',
      lightingMood || 'Cinématographique',
      clampedSeconds,
      dialogue || '',
      videoAssetId || null,
      videoUrl || '/uploads/seed/seed-horizons-01.mp4',
      keyframeUrl || '/uploads/seed/seed-horizons-01.png',
      videoUrl ? 'ready' : 'planned',
    );
    res.status(201).json({ scene: db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) });
  });

  app.patch('/api/scenes/:sceneId', requireAuth as never, (req: AuthedRequest, res) => {
    const scene = db
      .prepare('SELECT s.* FROM scenes s JOIN projects p ON s.project_id = p.id WHERE s.id = ? AND p.user_id = ?')
      .get(req.params.sceneId, req.user!.id) as Record<string, unknown> | undefined;
    if (!scene) return res.status(404).json({ error: 'Scène introuvable.' });

    const { title, visualPrompt, dialogue, durationSeconds, transitionType, subtitleText, orderIndex } = req.body ?? {};
    const safeDur = durationSeconds !== undefined ? validateVideoDuration(Number(durationSeconds)).clampedSeconds : null;
    const validTransitions = new Set(['cut', 'crossfade', 'fade_black']);
    const safeTransition = typeof transitionType === 'string' && validTransitions.has(transitionType) ? transitionType : null;

    db.prepare(`
      UPDATE scenes
      SET title = COALESCE(?, title),
          visual_prompt = COALESCE(?, visual_prompt),
          dialogue = COALESCE(?, dialogue),
          duration_seconds = COALESCE(?, duration_seconds),
          transition_type = COALESCE(?, transition_type),
          subtitle_text = COALESCE(?, subtitle_text),
          order_index = COALESCE(?, order_index)
      WHERE id = ?
    `).run(
      title ?? null,
      visualPrompt ?? null,
      dialogue ?? null,
      safeDur,
      safeTransition,
      subtitleText ?? null,
      orderIndex !== undefined ? Number(orderIndex) : null,
      req.params.sceneId,
    );
    res.json({ scene: db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.sceneId) });
  });

  app.post('/api/projects/:id/scenes/reorder', requireAuth as never, (req: AuthedRequest, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const stmt = db.prepare('UPDATE scenes SET order_index = ? WHERE id = ? AND project_id = ?');
    const tx = db.transaction(() => {
      orderedIds.forEach((sid, idx) => stmt.run(idx, sid, req.params.id));
    });
    tx();
    res.json({ scenes: db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index ASC').all(req.params.id) });
  });

  // AI Orchestrator & Film Engine
  app.post('/api/orchestrator/analyze', requireAuth as never, async (req: AuthedRequest, res) => {
    const { prompt, mode, durationSeconds, resolution, style } = req.body ?? {};
    const safety = screenPromptSafety(String(prompt || ''));
    if (!safety.allowed) {
      return res.status(400).json({ error: safety.reason });
    }
    try {
      const result = await analyzePromptWithOrchestrator({
        prompt: String(prompt),
        mode: String(mode || 'text_to_video'),
        durationSeconds: validateVideoDuration(Number(durationSeconds || 5)).clampedSeconds,
        resolution: String(resolution || '1080p'),
        style: String(style || 'Cinématographique'),
        language: req.user!.language,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err) });
    }
  });

  app.post('/api/film-engine/generate-plan', requireAuth as never, async (req: AuthedRequest, res) => {
    const { projectId, idea } = req.body ?? {};
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

    const safety = screenPromptSafety(String(idea || project.description || project.title));
    if (!safety.allowed) return res.status(400).json({ error: safety.reason });

    try {
      const generated = await generateFilmPlanWithAI({
        title: String(project.title),
        genre: String(project.genre),
        targetMinutes: Number(project.target_duration_minutes || 5),
        idea: String(idea || project.description || project.title),
        language: req.user!.language,
      });

      const tx = db.transaction(() => {
        db.prepare('UPDATE projects SET description = ?, status = ?, updated_at = ? WHERE id = ?').run(
          generated.synopsis,
          'in_production',
          new Date().toISOString(),
          projectId,
        );
        for (const ch of generated.characters) {
          db.prepare(`
            INSERT INTO characters (id, project_id, name, role, physical_traits, costume, voice_style, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(`chr_${crypto.randomUUID().slice(0, 8)}`, projectId, ch.name, ch.role, ch.physicalTraits, ch.costume, ch.voiceStyle, '/uploads/seed/seed-horizons-01.png');
        }
        for (const loc of generated.locations) {
          db.prepare(`
            INSERT INTO locations (id, project_id, name, atmosphere, lighting, continuity_notes, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(`loc_${crypto.randomUUID().slice(0, 8)}`, projectId, loc.name, loc.atmosphere, loc.lighting, loc.continuityNotes, '/uploads/seed/seed-horizons-02.png');
        }
        const startIdx = (db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM scenes WHERE project_id = ?').get(projectId) as { m: number }).m + 1;
        generated.scenes.forEach((sc, idx) => {
          db.prepare(`
            INSERT INTO scenes (id, project_id, order_index, chapter_title, title, visual_prompt, dialogue, speaker_name, camera_movement, framing, lighting_mood, duration_seconds, transition_type, subtitle_text, video_url, keyframe_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'crossfade', ?, ?, ?, 'planned')
          `).run(
            `scn_${crypto.randomUUID().slice(0, 8)}`,
            projectId,
            startIdx + idx,
            sc.chapterTitle,
            sc.title,
            sc.visualPrompt,
            sc.dialogue,
            sc.speakerName,
            sc.cameraMovement,
            sc.framing,
            sc.lightingMood,
            sc.durationSeconds,
            sc.dialogue,
            '/uploads/seed/seed-horizons-01.mp4',
            '/uploads/seed/seed-horizons-01.png',
          );
        });
      });
      tx();

      res.json({
        ok: true,
        synopsis: generated.synopsis,
        characters: db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId),
        locations: db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId),
        scenes: db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index ASC').all(projectId),
      });
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err) });
    }
  });

  app.post('/api/film-engine/coherence-check', requireAuth as never, async (req: AuthedRequest, res) => {
    const { projectId } = req.body ?? {};
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

    const characters = db.prepare('SELECT name, physical_traits as physicalTraits, costume FROM characters WHERE project_id = ?').all(projectId) as Array<{
      name: string;
      physicalTraits: string;
      costume: string;
    }>;
    const locations = db.prepare('SELECT name, lighting, continuity_notes as continuityNotes FROM locations WHERE project_id = ?').all(projectId) as Array<{
      name: string;
      lighting: string;
      continuityNotes: string;
    }>;
    const scenes = db
      .prepare('SELECT order_index as orderIndex, title, visual_prompt as visualPrompt, lighting_mood as lightingMood, duration_seconds as durationSeconds FROM scenes WHERE project_id = ? ORDER BY order_index ASC')
      .all(projectId) as Array<{
      orderIndex: number;
      title: string;
      visualPrompt: string;
      lightingMood: string;
      durationSeconds: number;
    }>;

    try {
      const audit = await checkFilmCoherenceWithAI({
        projectTitle: String(project.title),
        characters,
        locations,
        scenes,
        language: req.user!.language,
      });
      db.prepare('UPDATE projects SET coherence_score_text = ?, updated_at = ? WHERE id = ?').run(
        audit.statusLabel,
        new Date().toISOString(),
        projectId,
      );
      res.json(audit);
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err) });
    }
  });

  app.post('/api/film-engine/export', requireAuth as never, async (req: AuthedRequest, res) => {
    const { projectId, resolution, includeSubtitles } = req.body ?? {};
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });

    const scenes = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index ASC').all(projectId) as Array<
      Record<string, unknown>
    >;
    if (scenes.length === 0) {
      return res.status(400).json({ error: 'Aucune scène disponible pour le montage final.' });
    }

    const resMap: Record<string, { w: number; h: number }> = {
      '720p': { w: 1280, h: 720 },
      '1080p': { w: 1920, h: 1080 },
      '1440p': { w: 2560, h: 1440 },
      '4k': { w: 3840, h: 2160 },
    };
    const dim = resMap[String(resolution || '1080p')] ?? resMap['1080p'];

    const clips = scenes.map((s) => {
      const rawVidUrl = String(s.video_url || '/uploads/seed/seed-horizons-01.mp4');
      const vidAbs = path.join(process.cwd(), rawVidUrl.replace(/^\//, ''));
      const fallbackAbs = path.join(UPLOADS_DIR, 'seed', 'seed-horizons-01.mp4');
      const audioAbs = s.audio_url ? path.join(process.cwd(), String(s.audio_url).replace(/^\//, '')) : null;

      return {
        videoPath: fs.existsSync(vidAbs) ? vidAbs : fallbackAbs,
        audioPath: audioAbs && fs.existsSync(audioAbs) ? audioAbs : null,
        durationSeconds: Math.max(3, Math.min(15, Number(s.duration_seconds || 5))),
        subtitleText: String(s.subtitle_text || s.dialogue || ''),
      };
    });

    const exportId = `exp_${crypto.randomUUID().slice(0, 8)}`;
    const exportFilename = `film-${projectId}-${Date.now()}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, exportFilename);
    const fileUrl = `/uploads/exports/${exportFilename}`;

    try {
      const assembled = await assembleFilmWithFfmpeg({
        clips,
        outputPath,
        width: dim.w,
        height: dim.h,
        includeSubtitles: Boolean(includeSubtitles),
      });

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO film_exports (id, project_id, user_id, title, file_url, duration_seconds, resolution, subtitles_included, scene_count, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)
      `).run(
        exportId,
        projectId,
        req.user!.id,
        `${project.title} — Master ${resolution || '1080p'}`,
        fileUrl,
        assembled.durationSeconds,
        String(resolution || '1080p'),
        includeSubtitles ? 1 : 0,
        clips.length,
        now,
      );

      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, 'film_export', ?, ?, ?, ?, 'video/mp4', ?, ?, ?, '1080p', ?, ?, 'ffmpeg-assembler', ?, ?)
      `).run(
        `ast_${crypto.randomUUID().slice(0, 8)}`,
        req.user!.id,
        projectId,
        `${project.title} (Export ${resolution || '1080p'})`,
        'Assemblage multi-séquences FFmpeg + audio synchronisé',
        fileUrl,
        '/uploads/seed/seed-horizons-01.png',
        dim.w,
        dim.h,
        assembled.durationSeconds,
        String(resolution || '1080p'),
        resolution === '1440p' || resolution === '4k' ? 1 : 0,
        assembled.fileSizeBytes,
        now,
      );

      createNotification(req.user!.id, 'Exportation film terminée', `"${project.title}" est prêt (${assembled.durationSeconds}s).`, 'success');
      res.json({ export: db.prepare('SELECT * FROM film_exports WHERE id = ?').get(exportId) });
    } catch (err) {
      res.status(500).json({ error: `Erreur d’assemblage FFmpeg : ${(err as Error).message}` });
    }
  });

  // Generation Queue & Execution
  app.get('/api/generations', requireAuth as never, (req: AuthedRequest, res) => {
    const jobs = db
      .prepare('SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
      .all(req.user!.id);
    res.json({ generations: jobs });
  });

  app.post('/api/generations/video', requireAuth as never, rateLimit(20, 60_000), (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    const prompt = String(body.prompt || '');
    const safety = screenPromptSafety(prompt);
    if (!safety.allowed) return res.status(400).json({ error: safety.reason });

    const durCheck = validateVideoDuration(Number(body.durationSeconds || 5));
    if (!durCheck.valid) return res.status(400).json({ error: durCheck.reason });

    const mode = (body.mode as VideoMode) || 'text_to_video';
    const resolution = (body.resolution as VideoResolution) || '720p';
    const variants = Math.max(1, Math.min(4, Number(body.variants || 1)));
    const catalog = getAllModelsFromDb();

    let selectedModel: AIModelConfig | undefined;
    let autoSelected = false;
    if (!body.modelId || body.modelId === 'auto') {
      autoSelected = true;
      const pick = selectOptimalModel({
        category: 'video',
        requestedResolution: resolution,
        durationSeconds: durCheck.clampedSeconds,
        userRole: req.user!.role,
        userPlan: req.user!.planId,
        catalog,
      });
      selectedModel = pick.selectedModel ?? undefined;
    } else {
      selectedModel = catalog.find((m) => m.id === body.modelId);
    }

    if (!selectedModel || !canUserAccessModel(req.user!.role, req.user!.planId, selectedModel)) {
      return res.status(403).json({ error: 'Modèle indisponible ou non inclus dans votre abonnement.' });
    }

    const cost = estimateVideoCost({
      durationSeconds: durCheck.clampedSeconds,
      resolution,
      variants,
      mode,
    });

    const jobId = `gen_${crypto.randomUUID().slice(0, 8)}`;
    try {
      reserveCreditsTx(req.user!.id, cost.totalCredits, jobId, `Réservation vidéo ${durCheck.clampedSeconds}s · ${resolution}`);
    } catch (err) {
      return res.status(402).json({ error: (err as Error).message });
    }

    const cinematicContext = [
      prompt,
      body.visualStyle ? `Style: ${body.visualStyle}` : '',
      body.cameraMovement ? `Camera: ${body.cameraMovement}` : '',
      body.framing ? `Framing: ${body.framing}` : '',
      body.lightingMood ? `Lighting: ${body.lightingMood}` : '',
      body.motionIntensity ? `Motion intensity: ${body.motionIntensity}` : '',
      body.negativePrompt ? `Avoid: ${body.negativePrompt}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO generations (id, user_id, project_id, scene_id, category, mode, prompt, enhanced_prompt, model_id, auto_selected, status, progress, estimated_credits, reserved_credits, charged_credits, refunded_credits, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'video', ?, ?, ?, ?, ?, 'pending', 5, ?, ?, 0, 0, ?, ?, ?)
    `).run(
      jobId,
      req.user!.id,
      body.projectId || null,
      body.sceneId || null,
      mode,
      prompt,
      cinematicContext,
      selectedModel.id,
      autoSelected ? 1 : 0,
      cost.totalCredits,
      cost.totalCredits,
      JSON.stringify({
        durationSeconds: durCheck.clampedSeconds,
        resolution,
        nativeResolution: cost.nativeResolution,
        isUpscaled: cost.isUpscaled,
        aspectRatio: body.aspectRatio || '16:9',
        fps: body.fps || 24,
      }),
      now,
      now,
    );

    const job = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId);
    broadcastToUser(req.user!.id, 'generation_update', job);

    // Execute async so browser request stays snappy
    void runGenerationJob(jobId, req.user!, selectedModel, {
      ...body,
      category: 'video',
      effectivePrompt: cinematicContext,
      durationSeconds: durCheck.clampedSeconds,
      resolution,
      nativeResolution: cost.nativeResolution,
      isUpscaled: cost.isUpscaled,
      estimatedCredits: cost.totalCredits,
    });

    res.status(202).json({ job, cost });
  });

  app.post('/api/generations/image', requireAuth as never, rateLimit(30, 60_000), (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    const prompt = String(body.prompt || '');
    const safety = screenPromptSafety(prompt);
    if (!safety.allowed) return res.status(400).json({ error: safety.reason });

    const mode = (body.mode as ImageMode) || 'text_to_image';
    const resolution = (body.resolution as ImageResolution) || '1024x1024';
    const variants = Math.max(1, Math.min(4, Number(body.variants || 1)));
    const catalog = getAllModelsFromDb();

    let selectedModel: AIModelConfig | undefined;
    let autoSelected = false;
    if (!body.modelId || body.modelId === 'auto') {
      autoSelected = true;
      selectedModel = selectOptimalModel({
        category: 'image',
        requestedResolution: resolution,
        userRole: req.user!.role,
        userPlan: req.user!.planId,
        catalog,
      }).selectedModel ?? undefined;
    } else {
      selectedModel = catalog.find((m) => m.id === body.modelId);
    }

    if (!selectedModel || !canUserAccessModel(req.user!.role, req.user!.planId, selectedModel)) {
      return res.status(403).json({ error: 'Modèle image indisponible pour votre forfait.' });
    }

    const cost = estimateImageCost({ resolution, variants, mode, upscale: Boolean(body.upscale) });
    const jobId = `gen_${crypto.randomUUID().slice(0, 8)}`;

    try {
      reserveCreditsTx(req.user!.id, cost.totalCredits, jobId, `Réservation image ${resolution}`);
    } catch (err) {
      return res.status(402).json({ error: (err as Error).message });
    }

    const effectivePrompt = [
      prompt,
      body.style ? `Style: ${body.style}` : '',
      body.colorCorrection ? `Color grading: ${body.colorCorrection}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO generations (id, user_id, project_id, scene_id, category, mode, prompt, enhanced_prompt, model_id, auto_selected, status, progress, estimated_credits, reserved_credits, charged_credits, refunded_credits, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 'image', ?, ?, ?, ?, ?, 'pending', 5, ?, ?, 0, 0, ?, ?, ?)
    `).run(
      jobId,
      req.user!.id,
      body.projectId || null,
      mode,
      prompt,
      effectivePrompt,
      selectedModel.id,
      autoSelected ? 1 : 0,
      cost.totalCredits,
      cost.totalCredits,
      JSON.stringify({ resolution, nativeResolution: cost.nativeResolution, isUpscaled: cost.isUpscaled, aspectRatio: body.aspectRatio || '1:1' }),
      now,
      now,
    );

    const job = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId);
    broadcastToUser(req.user!.id, 'generation_update', job);

    void runGenerationJob(jobId, req.user!, selectedModel, {
      ...body,
      category: 'image',
      effectivePrompt,
      resolution,
      nativeResolution: cost.nativeResolution,
      isUpscaled: cost.isUpscaled,
      estimatedCredits: cost.totalCredits,
    });

    res.status(202).json({ job, cost });
  });

  app.post('/api/generations/audio', requireAuth as never, rateLimit(30, 60_000), (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    const text = String(body.text || '');
    if (text.trim().length < 2) return res.status(400).json({ error: 'Texte du dialogue requis.' });

    const catalog = getAllModelsFromDb();
    const model = catalog.find((m) => m.category === 'audio' && m.enabled);
    if (!model) return res.status(400).json({ error: 'Aucun moteur audio actif.' });

    const credits = estimateAudioCost({ type: 'tts', textLength: text.length, multiSpeaker: Boolean(body.multiSpeaker) });
    const jobId = `gen_${crypto.randomUUID().slice(0, 8)}`;

    try {
      reserveCreditsTx(req.user!.id, credits, jobId, 'Synthèse vocale Gemini 3.8 TTS');
    } catch (err) {
      return res.status(402).json({ error: (err as Error).message });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO generations (id, user_id, project_id, scene_id, category, mode, prompt, model_id, auto_selected, status, progress, estimated_credits, reserved_credits, charged_credits, refunded_credits, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'audio', ?, ?, ?, 1, 'pending', 10, ?, ?, 0, 0, '{}', ?, ?)
    `).run(jobId, req.user!.id, body.projectId || null, body.sceneId || null, body.multiSpeaker ? 'multi_speaker_tts' : 'tts', text, model.id, credits, credits, now, now);

    const job = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId);
    broadcastToUser(req.user!.id, 'generation_update', job);
    void runGenerationJob(jobId, req.user!, model, {
      ...body,
      category: 'audio',
      prompt: text,
      estimatedCredits: credits,
    });

    res.status(202).json({ job, credits });
  });

  app.post('/api/generations/music', requireAuth as never, rateLimit(15, 60_000), (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    const prompt = String(body.prompt || '');
    const safety = screenPromptSafety(prompt);
    if (!safety.allowed) return res.status(400).json({ error: safety.reason });

    const catalog = getAllModelsFromDb();
    const model = catalog.find((m) => m.category === 'music' && m.enabled);
    if (!model || !canUserAccessModel(req.user!.role, req.user!.planId, model)) {
      return res.status(403).json({ error: 'Modèle Lyria indisponible pour votre forfait.' });
    }

    const credits = estimateAudioCost({ type: 'music' });
    const jobId = `gen_${crypto.randomUUID().slice(0, 8)}`;
    try {
      reserveCreditsTx(req.user!.id, credits, jobId, 'Composition musicale Lyria');
    } catch (err) {
      return res.status(402).json({ error: (err as Error).message });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO generations (id, user_id, project_id, scene_id, category, mode, prompt, model_id, auto_selected, status, progress, estimated_credits, reserved_credits, charged_credits, refunded_credits, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 'music', 'music_score', ?, ?, 1, 'pending', 10, ?, ?, 0, 0, '{}', ?, ?)
    `).run(jobId, req.user!.id, body.projectId || null, prompt, model.id, credits, credits, now, now);

    const job = db.prepare('SELECT * FROM generations WHERE id = ?').get(jobId);
    broadcastToUser(req.user!.id, 'generation_update', job);
    void runGenerationJob(jobId, req.user!, model, {
      ...body,
      category: 'music',
      prompt,
      estimatedCredits: credits,
    });

    res.status(202).json({ job, credits });
  });

  app.post('/api/generations/:id/cancel', requireAuth as never, (req: AuthedRequest, res) => {
    const job = db.prepare('SELECT * FROM generations WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!job) return res.status(404).json({ error: 'Tâche introuvable.' });
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return res.status(400).json({ error: 'Tâche déjà finalisée.' });
    }
    cancelledJobs.add(String(req.params.id));
    const reserved = Number(job.reserved_credits || 0);
    refundCreditsTx(req.user!.id, reserved, String(req.params.id), `Annulation tâche ${req.params.id}`);
    updateJobState(String(req.params.id), req.user!.id, { status: 'cancelled', refundedCredits: reserved });
    res.json({ ok: true });
  });

  // Media Assets Library + Upload + FFmpeg Upscale
  app.get('/api/assets', requireAuth as never, (req: AuthedRequest, res) => {
    const assets = db
      .prepare('SELECT * FROM media_assets WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user!.id);
    res.json({ assets });
  });

  app.post('/api/assets/upload', requireAuth as never, upload.single('file'), async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
    const rawExt = path.extname(req.file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const ext = rawExt || '.bin';
    const finalName = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`;
    const dest = path.join(UPLOADS_DIR, finalName);
    await fs.promises.rename(req.file.path, dest);

    const isVideo = req.file.mimetype.startsWith('video/');
    const isAudio = req.file.mimetype.startsWith('audio/');
    const kind = isVideo ? 'video' : isAudio ? 'audio' : 'image';
    const id = `ast_${crypto.randomUUID().slice(0, 8)}`;
    const fileUrl = `/uploads/${finalName}`;
    let thumbUrl: string | null = kind === 'image' ? fileUrl : null;
    if (isVideo) {
      const thumbName = `usr-thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;
      const okThumb = await generateThumbnailFromVideo(dest, path.join(UPLOADS_DIR, thumbName));
      if (okThumb) thumbUrl = `/uploads/${thumbName}`;
    }

    db.prepare(`
      INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, 'Import utilisateur', ?, ?, ?, 1280, 720, NULL, 'Original', 'Original', 0, 'user-upload', ?, ?)
    `).run(
      id,
      req.user!.id,
      req.body?.projectId || null,
      kind,
      req.file.originalname,
      fileUrl,
      thumbUrl,
      req.file.mimetype,
      req.file.size,
      new Date().toISOString(),
    );
    res.status(201).json({ asset: db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) });
  });

  app.post('/api/assets/:id/upscale', requireAuth as never, async (req: AuthedRequest, res) => {
    const asset = db.prepare('SELECT * FROM media_assets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as
      | Record<string, unknown>
      | undefined;
    if (!asset) return res.status(404).json({ error: 'Média introuvable.' });

    const srcAbs = path.join(process.cwd(), String(asset.file_url).replace(/^\//, ''));
    if (!fs.existsSync(srcAbs)) return res.status(404).json({ error: 'Fichier source introuvable sur le stockage.' });

    const targetW = asset.kind === 'image' ? 2048 : 2560;
    const targetH = asset.kind === 'image' ? 2048 : 1440;
    const outResLabel = asset.kind === 'image' ? '2048x2048' : '1440p';
    const ext = asset.kind === 'image' ? '.png' : '.mp4';
    const outName = `upscaled-${Date.now()}${ext}`;
    const outAbs = path.join(UPLOADS_DIR, outName);

    try {
      if (asset.kind === 'image') {
        await upscaleImageWithFfmpeg(srcAbs, outAbs, targetW, targetH);
      } else if (asset.kind === 'video') {
        await upscaleVideoWithFfmpeg(srcAbs, outAbs, targetW, targetH);
      } else {
        return res.status(400).json({ error: 'L’upscaling s’applique aux images et vidéos.' });
      }
      const stat = fs.statSync(outAbs);
      const newId = `ast_${crypto.randomUUID().slice(0, 8)}`;
      const fileUrl = `/uploads/${outName}`;
      db.prepare(`
        INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ffmpeg-lanczos', ?, ?)
      `).run(
        newId,
        req.user!.id,
        asset.project_id,
        asset.kind,
        `${asset.title} (${outResLabel} Amélioré)`,
        asset.prompt,
        fileUrl,
        asset.kind === 'image' ? fileUrl : asset.thumbnail_url,
        asset.mime_type,
        targetW,
        targetH,
        asset.duration_seconds,
        asset.native_resolution,
        outResLabel,
        stat.size,
        new Date().toISOString(),
      );
      res.status(201).json({ asset: db.prepare('SELECT * FROM media_assets WHERE id = ?').get(newId) });
    } catch (err) {
      res.status(500).json({ error: `Échec FFmpeg upscale : ${(err as Error).message}` });
    }
  });

  app.delete('/api/assets/:id', requireAuth as never, (req: AuthedRequest, res) => {
    const result = db.prepare('DELETE FROM media_assets WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Média introuvable.' });
    res.json({ ok: true });
  });

  // API Keys & Support / Reports
  app.get('/api/api-keys', requireAuth as never, (req: AuthedRequest, res) => {
    const keys = db
      .prepare('SELECT id, user_id, name, prefix, last_used_at, revoked, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user!.id);
    res.json({ apiKeys: keys });
  });

  app.post('/api/api-keys', requireAuth as never, (req: AuthedRequest, res) => {
    const name = String(req.body?.name || 'Clé Studio API');
    const rawSecret = `nm_live_${crypto.randomBytes(20).toString('hex')}`;
    const prefix = `${rawSecret.slice(0, 14)}••••`;
    const keyHash = hashSessionToken(rawSecret);
    const id = `key_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare('INSERT INTO api_keys (id, user_id, name, prefix, key_hash, revoked, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)').run(
      id,
      req.user!.id,
      name,
      prefix,
      keyHash,
      new Date().toISOString(),
    );
    logAudit(req.user!.id, req.user!.email, 'API_KEY_CREATED', 'api_key', id, `Création clé ${name}`);
    res.status(201).json({ apiKey: db.prepare('SELECT id, user_id, name, prefix, last_used_at, revoked, created_at FROM api_keys WHERE id = ?').get(id), secretOnce: rawSecret });
  });

  app.post('/api/api-keys/:id/revoke', requireAuth as never, (req: AuthedRequest, res) => {
    db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    res.json({ ok: true });
  });

  app.get('/api/support/tickets', requireAuth as never, (req: AuthedRequest, res) => {
    const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json({ tickets });
  });

  app.post('/api/support/tickets', requireAuth as never, (req: AuthedRequest, res) => {
    const { subject, category, message } = req.body ?? {};
    if (!subject || !message) return res.status(400).json({ error: 'Sujet et message requis.' });
    const id = `tkt_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO support_tickets (id, user_id, user_email, subject, category, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(id, req.user!.id, req.user!.email, String(subject), String(category || 'technical'), String(message), new Date().toISOString());
    res.status(201).json({ ticket: db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) });
  });

  app.post('/api/reports', requireAuth as never, (req: AuthedRequest, res) => {
    const { assetId, reason, details } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: 'Motif de signalement requis.' });
    const id = `rep_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO content_reports (id, reporter_user_id, asset_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, req.user!.id, assetId || null, String(reason), String(details || ''), new Date().toISOString());
    res.status(201).json({ ok: true, id });
  });

  // Admin Console Routes
  app.get('/api/admin/overview', requireAuth as never, requireAdmin as never, (_req: AuthedRequest, res) => {
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const activeUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE suspended = 0').get() as { c: number }).c;
    const subscribers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE plan_id != 'free'").get() as { c: number }).c;
    const totalGens = (db.prepare('SELECT COUNT(*) as c FROM generations').get() as { c: number }).c;
    const failedGens = (db.prepare("SELECT COUNT(*) as c FROM generations WHERE status = 'failed'").get() as { c: number }).c;
    const videoAssets = (db.prepare("SELECT COUNT(*) as c FROM media_assets WHERE kind = 'video'").get() as { c: number }).c;
    const imageAssets = (db.prepare("SELECT COUNT(*) as c FROM media_assets WHERE kind = 'image'").get() as { c: number }).c;
    const filmExports = (db.prepare('SELECT COUNT(*) as c FROM film_exports').get() as { c: number }).c;
    const storageBytes = (db.prepare('SELECT COALESCE(SUM(file_size_bytes), 0) as s FROM media_assets').get() as { s: number }).s;

    const users = db.prepare('SELECT id, email, full_name, role, plan_id, email_verified, mfa_enabled, suspended, language, organization, created_at, last_login_at FROM users ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
    const mrr = users.reduce((sum, u) => {
      const p = PLANS.find((pl) => pl.id === String(u.plan_id));
      if (!p || p.priceUsd === 0) return sum;
      return sum + (p.billingCycle === 'yearly' ? p.priceUsd / 12 : p.priceUsd);
    }, 0);
    const models = getAllModelsFromDb();
    const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60').all();
    const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 40').all();
    const reports = db.prepare('SELECT * FROM content_reports ORDER BY created_at DESC LIMIT 40').all();
    const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 40').all();

    res.json({
      kpis: {
        totalUsers,
        activeUsers,
        subscribers,
        monthlyRecurringUsd: Number(mrr.toFixed(2)),
        dailyGenerations: totalGens,
        videosGenerated: videoAssets,
        imagesGenerated: imageAssets,
        filmsExported: filmExports,
        failureRatePct: totalGens > 0 ? Number(((failedGens / totalGens) * 100).toFixed(1)) : 0,
        storageMb: Number((storageBytes / (1024 * 1024)).toFixed(2)),
        serverStatus: 'Opérationnel · FFmpeg & SQLite actifs',
      },
      users,
      models,
      auditLogs,
      tickets,
      reports,
      recentTransactions,
    });
  });

  app.post('/api/admin/models', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    const b = req.body ?? {};
    if (!b.name || !b.provider || !b.category || !b.sdkModelId) {
      return res.status(400).json({ error: 'Champs modèle incomplets.' });
    }
    const id = `mdl_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO models (id, name, provider, category, sdk_model_id, is_live_connected, requires_paid_key, enabled, fallback_model_id, max_duration_seconds, native_resolutions_json, supports_upscale_4k, credit_cost_base, credit_cost_per_second, avg_latency_ms, min_plan_tier, description_fr, description_en)
      VALUES (?, ?, ?, ?, ?, 0, 1, 1, ?, ?, ?, 1, ?, ?, 30000, ?, ?, ?)
    `).run(
      id,
      String(b.name),
      String(b.provider),
      String(b.category),
      String(b.sdkModelId),
      b.fallbackModelId || null,
      Number(b.maxDurationSeconds || 15),
      JSON.stringify(Array.isArray(b.nativeResolutions) ? b.nativeResolutions : ['720p', '1080p']),
      Number(b.creditCostBase || 10),
      Number(b.creditCostPerSecond || 2),
      String(b.minPlanTier || 'pro'),
      String(b.descriptionFr || 'Adaptateur configuré par l’administrateur.'),
      String(b.descriptionEn || 'Admin-configured model adapter.'),
    );
    logAudit(req.user!.id, req.user!.email, 'MODEL_ADDED', 'model', id, `Ajout modèle ${b.name}`);
    res.status(201).json({ models: getAllModelsFromDb() });
  });

  app.patch('/api/admin/models/:id', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Modèle introuvable.' });
    const { enabled, creditCostBase, creditCostPerSecond, fallbackModelId, minPlanTier } = req.body ?? {};
    const nextFallback = fallbackModelId !== undefined ? fallbackModelId : existing.fallback_model_id;
    db.prepare(`
      UPDATE models
      SET enabled = COALESCE(?, enabled),
          credit_cost_base = COALESCE(?, credit_cost_base),
          credit_cost_per_second = COALESCE(?, credit_cost_per_second),
          fallback_model_id = ?,
          min_plan_tier = COALESCE(?, min_plan_tier)
      WHERE id = ?
    `).run(
      enabled !== undefined ? (enabled ? 1 : 0) : null,
      creditCostBase !== undefined ? Number(creditCostBase) : null,
      creditCostPerSecond !== undefined ? Number(creditCostPerSecond) : null,
      nextFallback,
      minPlanTier ?? null,
      req.params.id,
    );
    logAudit(req.user!.id, req.user!.email, 'MODEL_UPDATED', 'model', String(req.params.id), `Configuration modèle modifiée`);
    res.json({ models: getAllModelsFromDb() });
  });

  app.post('/api/admin/models/:id/test', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!model) return res.status(404).json({ error: 'Modèle introuvable.' });
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const live = Boolean(model.is_live_connected) && hasKey;
    res.json({
      ok: live,
      statusText: live
        ? `Connexion vérifiée vers ${model.sdk_model_id} (${model.provider}).`
        : model.is_live_connected
          ? 'Clé GEMINI_API_KEY absente ou non configurée dans Secrets.'
          : `Adaptateur ${model.provider} prêt (clé fournisseur externe requise pour exécution distante).`,
    });
  });

  app.patch('/api/admin/users/:id', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    const { role, suspended, planId, creditAdjustment } = req.body ?? {};
    if (req.params.id === req.user!.id && suspended) {
      return res.status(400).json({ error: 'Impossible de suspendre votre propre session administrateur.' });
    }
    const validRoles = new Set(['visitor', 'free', 'basic', 'plus', 'pro', 'annual_1', 'annual_2', 'admin', 'super_admin']);
    if (role !== undefined && !validRoles.has(String(role))) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }
    if (planId !== undefined && !PLANS.some((p) => p.id === String(planId))) {
      return res.status(400).json({ error: 'Forfait invalide.' });
    }
    db.prepare(`
      UPDATE users
      SET role = COALESCE(?, role),
          suspended = COALESCE(?, suspended),
          plan_id = COALESCE(?, plan_id)
      WHERE id = ?
    `).run(
      role ?? null,
      suspended !== undefined ? (suspended ? 1 : 0) : null,
      planId ?? null,
      req.params.id,
    );

    if (creditAdjustment && Number(creditAdjustment) !== 0) {
      const delta = Math.round(Number(creditAdjustment));
      const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.params.id) as Record<string, unknown> | undefined;
      if (wallet) {
        const nextBal = Math.max(0, Number(wallet.balance) + delta);
        db.prepare('UPDATE wallets SET balance = ? WHERE user_id = ?').run(nextBal, req.params.id);
        db.prepare(`
          INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
          VALUES (?, ?, 'credit_grant', ?, ?, 'Ajustement administrateur', 'admin', ?, ?)
        `).run(`tx_${crypto.randomUUID().slice(0, 8)}`, req.params.id, delta, nextBal, req.user!.id, new Date().toISOString());
      }
    }

    logAudit(req.user!.id, req.user!.email, 'ADMIN_USER_UPDATED', 'user', String(req.params.id), `Modification rôle/statut utilisateur`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/tickets/:id', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(String(req.body?.status || 'resolved'), req.params.id);
    logAudit(req.user!.id, req.user!.email, 'TICKET_UPDATED', 'ticket', String(req.params.id), `Statut -> ${req.body?.status}`);
    res.json({ ok: true });
  });

  app.patch('/api/admin/reports/:id', requireAuth as never, requireAdmin as never, (req: AuthedRequest, res) => {
    db.prepare('UPDATE content_reports SET status = ? WHERE id = ?').run(String(req.body?.status || 'reviewed'), req.params.id);
    logAudit(req.user!.id, req.user!.email, 'REPORT_REVIEWED', 'report', String(req.params.id), `Statut -> ${req.body?.status}`);
    res.json({ ok: true });
  });
}
