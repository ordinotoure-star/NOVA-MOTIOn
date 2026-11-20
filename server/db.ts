import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AIModelConfig, PlanTierId, UserRole } from '../src/shared/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nova_motion.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'free',
      plan_id TEXT NOT NULL DEFAULT 'free',
      email_verified INTEGER NOT NULL DEFAULT 1,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_code TEXT,
      suspended INTEGER NOT NULL DEFAULT 0,
      first_month_discount_used INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'fr',
      organization TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT NOT NULL DEFAULT '',
      preferred_aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      default_model_mode TEXT NOT NULL DEFAULT 'auto',
      notify_on_complete INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      device_label TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      monthly_price_usd REAL,
      monthly_credits INTEGER NOT NULL,
      daily_credit_cap INTEGER NOT NULL,
      max_video_resolution TEXT NOT NULL,
      max_film_minutes INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      payment_method TEXT NOT NULL DEFAULT 'card',
      status TEXT NOT NULL DEFAULT 'active',
      renews_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 200,
      reserved INTEGER NOT NULL DEFAULT 0,
      monthly_spent INTEGER NOT NULL DEFAULT 0,
      daily_limit INTEGER NOT NULL DEFAULT 300,
      low_balance_threshold INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      description TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'credits',
      reference_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      category TEXT NOT NULL,
      sdk_model_id TEXT NOT NULL,
      is_live_connected INTEGER NOT NULL DEFAULT 0,
      requires_paid_key INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      fallback_model_id TEXT,
      max_duration_seconds INTEGER NOT NULL DEFAULT 15,
      native_resolutions_json TEXT NOT NULL,
      supports_upscale_4k INTEGER NOT NULL DEFAULT 1,
      credit_cost_base INTEGER NOT NULL DEFAULT 10,
      credit_cost_per_second INTEGER NOT NULL DEFAULT 2,
      avg_latency_ms INTEGER NOT NULL DEFAULT 15000,
      min_plan_tier TEXT NOT NULL DEFAULT 'free',
      description_fr TEXT NOT NULL,
      description_en TEXT NOT NULL,
      total_calls INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT 'Science-Fiction',
      target_duration_minutes INTEGER NOT NULL DEFAULT 5,
      aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      visual_style TEXT NOT NULL DEFAULT 'Cinématographique 35mm',
      status TEXT NOT NULL DEFAULT 'draft',
      coherence_score_text TEXT NOT NULL DEFAULT 'Conforme · Continuité vérifiée',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL,
      thumbnail_url TEXT,
      mime_type TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 1280,
      height INTEGER NOT NULL DEFAULT 720,
      duration_seconds REAL,
      native_resolution TEXT NOT NULL,
      output_resolution TEXT NOT NULL,
      is_upscaled INTEGER NOT NULL DEFAULT 0,
      model_id TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      physical_traits TEXT NOT NULL,
      costume TEXT NOT NULL,
      voice_style TEXT NOT NULL,
      image_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      atmosphere TEXT NOT NULL,
      lighting TEXT NOT NULL,
      continuity_notes TEXT NOT NULL,
      image_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      chapter_title TEXT NOT NULL DEFAULT 'Acte I',
      title TEXT NOT NULL,
      visual_prompt TEXT NOT NULL,
      dialogue TEXT NOT NULL DEFAULT '',
      speaker_name TEXT NOT NULL DEFAULT '',
      camera_movement TEXT NOT NULL DEFAULT 'Travelling lent',
      framing TEXT NOT NULL DEFAULT 'Plan large',
      lighting_mood TEXT NOT NULL DEFAULT 'Clair-obscur bleu nuit',
      duration_seconds INTEGER NOT NULL DEFAULT 5,
      transition_type TEXT NOT NULL DEFAULT 'crossfade',
      subtitle_text TEXT NOT NULL DEFAULT '',
      video_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
      video_url TEXT,
      audio_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
      audio_url TEXT,
      keyframe_url TEXT,
      status TEXT NOT NULL DEFAULT 'planned'
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      mode TEXT NOT NULL,
      prompt TEXT NOT NULL,
      enhanced_prompt TEXT,
      model_id TEXT NOT NULL,
      auto_selected INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      estimated_credits INTEGER NOT NULL DEFAULT 0,
      reserved_credits INTEGER NOT NULL DEFAULT 0,
      charged_credits INTEGER NOT NULL DEFAULT 0,
      refunded_credits INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      output_asset_id TEXT,
      output_url TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS film_exports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      duration_seconds REAL NOT NULL,
      resolution TEXT NOT NULL,
      subtitles_included INTEGER NOT NULL DEFAULT 0,
      scene_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'info',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      last_used_at TEXT,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_reports (
      id TEXT PRIMARY KEY,
      reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      asset_id TEXT,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData();
  recoverStaleInFlightJobs();
}

function recoverStaleInFlightJobs(): void {
  const stale = db
    .prepare(
      `SELECT id, user_id, reserved_credits FROM generations WHERE status IN ('pending', 'preparing', 'generating', 'assembling', 'verifying')`,
    )
    .all() as Array<{ id: string; user_id: string; reserved_credits: number }>;

  if (stale.length === 0) return;

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const job of stale) {
      const reserved = Number(job.reserved_credits || 0);
      if (reserved > 0) {
        const wallet = db.prepare('SELECT balance, reserved FROM wallets WHERE user_id = ?').get(job.user_id) as
          | { balance: number; reserved: number }
          | undefined;
        if (wallet) {
          const nextReserved = Math.max(0, Number(wallet.reserved) - reserved);
          db.prepare('UPDATE wallets SET reserved = ? WHERE user_id = ?').run(nextReserved, job.user_id);
          db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
            VALUES (?, ?, 'refund', ?, ?, ?, 'credits', ?, ?)
          `).run(
            `tx_${crypto.randomUUID().slice(0, 8)}`,
            job.user_id,
            reserved,
            Number(wallet.balance),
            `Remboursement automatique · Tâche interrompue au redémarrage (${job.id})`,
            job.id,
            now,
          );
        }
      }
      db.prepare(`
        UPDATE generations
        SET status = 'failed',
            error_message = 'Tâche interrompue lors du redémarrage du serveur — crédits remboursés automatiquement.',
            refunded_credits = ?,
            updated_at = ?
        WHERE id = ?
      `).run(reserved, now, job.id);
    }
  });
  tx();
}

function seedInitialData(): void {
  const existingModels = db.prepare('SELECT COUNT(*) as c FROM models').get() as { c: number };
  if (existingModels.c === 0) {
    const modelsToSeed: Array<Omit<AIModelConfig, 'totalCalls' | 'failureRate'> & { totalCalls: number; failureCount: number }> = [
      {
        id: 'gemini-omni-video',
        name: 'Google Veo / Gemini Omni 1.2',
        provider: 'Google DeepMind',
        category: 'video',
        sdkModelId: 'gemini-omni-1.2-flash',
        isLiveConnected: true,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'veo-studio-adapter',
        maxDurationSeconds: 15,
        nativeResolutions: ['720p', '1080p', '4k'],
        supportsUpscaleTo4K: true,
        creditCostBase: 10,
        creditCostPerSecond: 2,
        avgLatencyMs: 38000,
        minPlanTier: 'free',
        descriptionFr: 'Moteur vidéo multimodal natif jusqu’à 15s (Text/Image/Video/Storyboard).',
        descriptionEn: 'Native multimodal video engine up to 15s (Text/Image/Video/Storyboard).',
        totalCalls: 412,
        failureCount: 9,
      },
      {
        id: 'runway-gen4-adapter',
        name: 'Runway Gen-4 Turbo',
        provider: 'Runway',
        category: 'video',
        sdkModelId: 'runway-gen4-adapter',
        isLiveConnected: false,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'gemini-omni-video',
        maxDurationSeconds: 10,
        nativeResolutions: ['720p', '1080p'],
        supportsUpscaleTo4K: true,
        creditCostBase: 14,
        creditCostPerSecond: 3,
        avgLatencyMs: 42000,
        minPlanTier: 'basic',
        descriptionFr: 'Adaptateur Runway pour mouvements caméra dynamiques.',
        descriptionEn: 'Runway adapter specialized in dynamic camera motion.',
        totalCalls: 128,
        failureCount: 4,
      },
      {
        id: 'sora-cinema-adapter',
        name: 'OpenAI Sora Cinema',
        provider: 'OpenAI',
        category: 'video',
        sdkModelId: 'sora-2',
        isLiveConnected: false,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'gemini-omni-video',
        maxDurationSeconds: 15,
        nativeResolutions: ['720p', '1080p'],
        supportsUpscaleTo4K: false,
        creditCostBase: 18,
        creditCostPerSecond: 3,
        avgLatencyMs: 55000,
        minPlanTier: 'pro',
        descriptionFr: 'Adaptateur physique cinématographique pour séquences narratives.',
        descriptionEn: 'Cinematic physics adapter for narrative sequences.',
        totalCalls: 94,
        failureCount: 2,
      },
      {
        id: 'kling-luma-adapter',
        name: 'Kling AI 2.0 / Luma Ray',
        provider: 'Kling · Luma',
        category: 'video',
        sdkModelId: 'kling-2-adapter',
        isLiveConnected: false,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'gemini-omni-video',
        maxDurationSeconds: 15,
        nativeResolutions: ['720p', '1080p'],
        supportsUpscaleTo4K: true,
        creditCostBase: 12,
        creditCostPerSecond: 2,
        avgLatencyMs: 46000,
        minPlanTier: 'basic',
        descriptionFr: 'Adaptateur de cohérence personnage et morphing fluide.',
        descriptionEn: 'Character consistency and smooth keyframe morphing adapter.',
        totalCalls: 76,
        failureCount: 3,
      },
      {
        id: 'gemini-flash-image',
        name: 'Gemini Flash Image',
        provider: 'Google',
        category: 'image',
        sdkModelId: 'gemini-3.1-flash-lite-image',
        isLiveConnected: true,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'nano-banana-pro',
        maxDurationSeconds: 0,
        nativeResolutions: ['1024x1024', '1536x1024'],
        supportsUpscaleTo4K: true,
        creditCostBase: 4,
        creditCostPerSecond: 0,
        avgLatencyMs: 4200,
        minPlanTier: 'free',
        descriptionFr: 'Génération et édition d’images ultra-rapide (Text/Image-to-Image).',
        descriptionEn: 'Ultra-fast image generation and editing (Text/Image-to-Image).',
        totalCalls: 1240,
        failureCount: 14,
      },
      {
        id: 'nano-banana-pro',
        name: 'Imagen / Nano Banana 2.1',
        provider: 'Google',
        category: 'image',
        sdkModelId: 'gemini-nano-banana-2.1',
        isLiveConnected: true,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'gemini-flash-image',
        maxDurationSeconds: 0,
        nativeResolutions: ['1024x1024', '1536x1024', '2048x2048', '4096x4096'],
        supportsUpscaleTo4K: true,
        creditCostBase: 8,
        creditCostPerSecond: 0,
        avgLatencyMs: 6800,
        minPlanTier: 'basic',
        descriptionFr: 'Photoréalisme natif jusqu’à 4K (4096 × 4096) et inpainting avancé.',
        descriptionEn: 'Native photorealism up to 4K (4096 × 4096) and advanced inpainting.',
        totalCalls: 635,
        failureCount: 6,
      },
      {
        id: 'flux-pro-adapter',
        name: 'FLUX.1 Pro Ultra',
        provider: 'Black Forest Labs',
        category: 'image',
        sdkModelId: 'flux-pro-1.1',
        isLiveConnected: false,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: 'nano-banana-pro',
        maxDurationSeconds: 0,
        nativeResolutions: ['1024x1024', '1536x1024', '2048x2048'],
        supportsUpscaleTo4K: true,
        creditCostBase: 7,
        creditCostPerSecond: 0,
        avgLatencyMs: 7500,
        minPlanTier: 'pro',
        descriptionFr: 'Adaptateur FLUX pour direction artistique et typographie intégrée.',
        descriptionEn: 'FLUX adapter for art direction and embedded typography.',
        totalCalls: 210,
        failureCount: 5,
      },
      {
        id: 'gemini-tts-studio',
        name: 'Gemini 3.8 Studio TTS',
        provider: 'Google',
        category: 'audio',
        sdkModelId: 'gemini-3.8-flash-tts',
        isLiveConnected: true,
        requiresPaidKey: false,
        enabled: true,
        fallbackModelId: null,
        maxDurationSeconds: 120,
        nativeResolutions: ['24kHz WAV'],
        supportsUpscaleTo4K: false,
        creditCostBase: 2,
        creditCostPerSecond: 0,
        avgLatencyMs: 2400,
        minPlanTier: 'free',
        descriptionFr: 'Synthèse vocale multi-locuteurs et direction dramatique de dialogues.',
        descriptionEn: 'Multi-speaker dramatic dialogue and voiceover synthesis.',
        totalCalls: 518,
        failureCount: 2,
      },
      {
        id: 'lyria-music-clip',
        name: 'Lyria 3 Film Score',
        provider: 'Google DeepMind',
        category: 'music',
        sdkModelId: 'lyria-3-clip-preview',
        isLiveConnected: true,
        requiresPaidKey: true,
        enabled: true,
        fallbackModelId: null,
        maxDurationSeconds: 30,
        nativeResolutions: ['MP3 Stereo'],
        supportsUpscaleTo4K: false,
        creditCostBase: 12,
        creditCostPerSecond: 0,
        avgLatencyMs: 11000,
        minPlanTier: 'basic',
        descriptionFr: 'Composition musicale originale et bandes originales cinématographiques.',
        descriptionEn: 'Original film score and soundtrack composition.',
        totalCalls: 189,
        failureCount: 3,
      },
      {
        id: 'nova-orchestrator-core',
        name: 'Nova Orchestrator (Gemini 4 Hydrogen)',
        provider: 'Google',
        category: 'orchestrator',
        sdkModelId: 'gemini-4-hydrogen',
        isLiveConnected: true,
        requiresPaidKey: false,
        enabled: true,
        fallbackModelId: null,
        maxDurationSeconds: 0,
        nativeResolutions: ['JSON / Scénario'],
        supportsUpscaleTo4K: false,
        creditCostBase: 0,
        creditCostPerSecond: 0,
        avgLatencyMs: 1400,
        minPlanTier: 'free',
        descriptionFr: 'Cerveau autonome : analyse des prompts, scénarios, Bible et cohérence.',
        descriptionEn: 'Autonomous orchestrator: prompt enrichment, screenplays, Bible & continuity.',
        totalCalls: 2890,
        failureCount: 4,
      },
    ];

    const insertModel = db.prepare(`
      INSERT INTO models (
        id, name, provider, category, sdk_model_id, is_live_connected, requires_paid_key,
        enabled, fallback_model_id, max_duration_seconds, native_resolutions_json,
        supports_upscale_4k, credit_cost_base, credit_cost_per_second, avg_latency_ms,
        min_plan_tier, description_fr, description_en, total_calls, failure_count
      ) VALUES (
        @id, @name, @provider, @category, @sdkModelId, @isLiveConnected, @requiresPaidKey,
        @enabled, @fallbackModelId, @maxDurationSeconds, @nativeResolutionsJson,
        @supportsUpscaleTo4K, @creditCostBase, @creditCostPerSecond, @avgLatencyMs,
        @minPlanTier, @descriptionFr, @descriptionEn, @totalCalls, @failureCount
      )
    `);

    for (const m of modelsToSeed) {
      insertModel.run({
        id: m.id,
        name: m.name,
        provider: m.provider,
        category: m.category,
        sdkModelId: m.sdkModelId,
        isLiveConnected: m.isLiveConnected ? 1 : 0,
        requiresPaidKey: m.requiresPaidKey ? 1 : 0,
        enabled: m.enabled ? 1 : 0,
        fallbackModelId: m.fallbackModelId,
        maxDurationSeconds: m.maxDurationSeconds,
        nativeResolutionsJson: JSON.stringify(m.nativeResolutions),
        supportsUpscaleTo4K: m.supportsUpscaleTo4K ? 1 : 0,
        creditCostBase: m.creditCostBase,
        creditCostPerSecond: m.creditCostPerSecond,
        avgLatencyMs: m.avgLatencyMs,
        minPlanTier: m.minPlanTier,
        descriptionFr: m.descriptionFr,
        descriptionEn: m.descriptionEn,
        totalCalls: m.totalCalls,
        failureCount: m.failureCount,
      });
    }
  }

  // Idempotent migration for first_month_discount_used column on existing DBs
  try {
    db.exec('ALTER TABLE users ADD COLUMN first_month_discount_used INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists
  }

  // Upsert updated 6-tier plans catalog and migrate legacy tier IDs cleanly
  const upsertPlan = db.prepare(`
    INSERT INTO plans (id, name, monthly_price_usd, monthly_credits, daily_credit_cap, max_video_resolution, max_film_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      monthly_price_usd = excluded.monthly_price_usd,
      monthly_credits = excluded.monthly_credits,
      daily_credit_cap = excluded.daily_credit_cap,
      max_video_resolution = excluded.max_video_resolution,
      max_film_minutes = excluded.max_film_minutes
  `);
  upsertPlan.run('free', 'FREE', 0, 200, 100, '720p', 2);
  upsertPlan.run('basic', 'MENSUEL BASIQUE', 10, 1000, 500, '1080p', 10);
  upsertPlan.run('plus', 'MENSUEL PLUS', 20, 10000, 4000, '1440p', 30);
  upsertPlan.run('pro', 'MENSUEL PRO', 45, 100000, 25000, '4k', 60);
  upsertPlan.run('annual_1', 'ANNUEL PLAN 1', 100, 1000000, 100000, '4k', 60);
  upsertPlan.run('annual_2', 'ANNUEL PLAN 2', 200, 100000000, 1000000, '4k', 60);

  // Migrate any legacy starter/studio rows before removing old plan rows
  db.prepare("UPDATE users SET plan_id = 'basic', role = CASE WHEN role = 'starter' THEN 'basic' ELSE role END WHERE plan_id = 'starter'").run();
  db.prepare("UPDATE users SET plan_id = 'annual_2', role = CASE WHEN role = 'studio' THEN 'annual_2' ELSE role END WHERE plan_id = 'studio'").run();
  db.prepare("UPDATE subscriptions SET plan_id = 'basic' WHERE plan_id = 'starter'").run();
  db.prepare("UPDATE subscriptions SET plan_id = 'annual_2' WHERE plan_id = 'studio'").run();
  db.prepare("UPDATE models SET min_plan_tier = 'basic' WHERE min_plan_tier = 'starter'").run();
  db.prepare("UPDATE models SET min_plan_tier = 'annual_2' WHERE min_plan_tier = 'studio'").run();
  db.prepare("DELETE FROM plans WHERE id IN ('starter', 'studio')").run();

  const existingUsers = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (existingUsers.c === 0) {
    const now = new Date().toISOString();
    const creatorId = 'usr_demo_creator';
    const adminId = 'usr_demo_admin';
    const creatorHash = bcrypt.hashSync('NovaDemo2026!', 10);
    const adminHash = bcrypt.hashSync('NovaAdmin2026!', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, plan_id, email_verified, mfa_enabled, suspended, first_month_discount_used, language, organization, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 'fr', ?, ?, ?)
    `);
    insertUser.run(creatorId, 'demo@novamotion.ai', creatorHash, 'Camille Laurent', 'pro', 'pro', 'Studio Lumière Paris', now, now);
    insertUser.run(adminId, 'admin@novamotion.ai', adminHash, 'Alexandre Moreau', 'super_admin', 'annual_2', 'NOVAHUB TECHNOLOGIES', now, now);

    db.prepare(`INSERT INTO profiles (user_id, bio) VALUES (?, ?)`).run(
      creatorId,
      'Réalisatrice & directrice artistique IA — longs métrages et campagnes visuelles.',
    );
    db.prepare(`INSERT INTO profiles (user_id, bio) VALUES (?, ?)`).run(
      adminId,
      'Super Administrateur plateforme NOVAHUB TECHNOLOGIES.',
    );

    const renewsAt = new Date(Date.now() + 26 * 86400_000).toISOString();
    db.prepare(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, payment_method, status, renews_at, created_at) VALUES (?, ?, ?, 'monthly', 'card', 'active', ?, ?)`)
      .run('sub_demo_pro', creatorId, 'pro', renewsAt, now);
    db.prepare(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, payment_method, status, renews_at, created_at) VALUES (?, ?, ?, 'yearly', 'invoice', 'active', ?, ?)`)
      .run('sub_demo_annual2', adminId, 'annual_2', renewsAt, now);

    db.prepare(`INSERT INTO wallets (user_id, balance, reserved, monthly_spent, daily_limit, low_balance_threshold) VALUES (?, 99970, 0, 30, 25000, 100)`).run(creatorId);
    db.prepare(`INSERT INTO wallets (user_id, balance, reserved, monthly_spent, daily_limit, low_balance_threshold) VALUES (?, 100000000, 0, 0, 1000000, 500)`).run(adminId);

    const insertTx = db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, balance_after, description, payment_method, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTx.run('tx_01', creatorId, 'credit_grant', 100000, 100000, 'Dotation mensuelle abonnement MENSUEL PRO', 'card', 'sub_demo_pro', new Date(Date.now() - 86400_000 * 5).toISOString());
    insertTx.run('tx_02', creatorId, 'debit_confirm', -30, 99970, 'Génération vidéo 1080p · Plan 01 (Horizons)', 'credits', 'gen_seed_1', new Date(Date.now() - 86400_000 * 2).toISOString());
    insertTx.run('tx_03', creatorId, 'reservation', -24, 99970, 'Réservation vidéo · Paris Nocturne', 'credits', 'gen_seed_fail', new Date(Date.now() - 86400_000 - 60_000).toISOString());
    insertTx.run('tx_04', creatorId, 'refund', 24, 99970, 'Remboursement automatique · Interruption file GPU', 'credits', 'gen_seed_fail', new Date(Date.now() - 86400_000).toISOString());

    // Seed Projects for Creator
    const proj1 = 'proj_horizons';
    const proj2 = 'proj_paris_nocturne';
    const proj3 = 'proj_atelier_lumiere';
    const insertProj = db.prepare(`
      INSERT INTO projects (id, user_id, title, description, genre, target_duration_minutes, aspect_ratio, visual_style, status, coherence_score_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProj.run(
      proj1,
      creatorId,
      "Horizons d'Obsidienne",
      'Court-métrage de science-fiction explorant une anomalie orbitale au-dessus d’une planète basaltique.',
      'Science-Fiction',
      15,
      '16:9',
      'Anamorphique 35mm · Bleu nuit & Tungstène',
      'in_production',
      'Continuité validée · 2 personnages · 2 décors',
      new Date(Date.now() - 86400_000 * 4).toISOString(),
      now,
    );
    insertProj.run(
      proj2,
      creatorId,
      'Paris Nocturne — Campagne Automne',
      'Film publicitaire néo-noir tourné sous la pluie parisienne pour une maison horlogère.',
      'Publicité / Néo-Noir',
      2,
      '16:9',
      'Néo-Noir Clair-Obscur · Leica 50mm',
      'completed',
      'Prêt pour exportation 1080p',
      new Date(Date.now() - 86400_000 * 8).toISOString(),
      now,
    );
    insertProj.run(
      proj3,
      creatorId,
      'Atelier Lumière — Architecture',
      'Documentaire architectural immersif de 60 minutes (240+ séquences modulaires).',
      'Documentaire',
      60,
      '16:9',
      'Documentaire Naturel 4K',
      'draft',
      'Plan de production 60 min initialisé (240 séquences)',
      new Date(Date.now() - 86400_000 * 1).toISOString(),
      now,
    );

    // Seed Media Assets pointing to real FFmpeg-generated seed files
    const insertAsset = db.prepare(`
      INSERT INTO media_assets (id, user_id, project_id, kind, title, prompt, file_url, thumbnail_url, mime_type, width, height, duration_seconds, native_resolution, output_resolution, is_upscaled, model_id, file_size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAsset.run(
      'ast_vid_1',
      creatorId,
      proj1,
      'video',
      'Plan 01 — Approche du Monolithe',
      'Travelling lent sur une astronaute marchant vers une arche d’obsidienne dans la brume cobalt.',
      '/uploads/seed/seed-horizons-01.mp4',
      '/uploads/seed/seed-horizons-01.png',
      'video/mp4',
      1280,
      720,
      5,
      '720p',
      '720p',
      0,
      'gemini-omni-video',
      280000,
      now,
    );
    insertAsset.run(
      'ast_vid_2',
      creatorId,
      proj1,
      'video',
      'Plan 02 — Passerelle Orbitale',
      'Plan large intérieur d’une station d’observation panoramique surplombant la courbure terrestre.',
      '/uploads/seed/seed-horizons-02.mp4',
      '/uploads/seed/seed-horizons-02.png',
      'video/mp4',
      1280,
      720,
      6,
      '720p',
      '720p',
      0,
      'gemini-omni-video',
      310000,
      now,
    );
    insertAsset.run(
      'ast_vid_3',
      creatorId,
      proj2,
      'video',
      'Paris Nocturne — Pavés sous la pluie',
      'Travelling bas sur des pavés parisiens mouillés reflétant les réverbères ambrés la nuit.',
      '/uploads/seed/seed-paris-01.mp4',
      '/uploads/seed/seed-paris-01.png',
      'video/mp4',
      1280,
      720,
      5,
      '720p',
      '720p',
      0,
      'runway-gen4-adapter',
      265000,
      now,
    );
    insertAsset.run(
      'ast_img_1',
      creatorId,
      proj1,
      'image',
      'Référence — Commandante Elena Vance',
      'Portrait cinématographique de la commandante Elena Vance, veste technique bleu nuit.',
      '/uploads/seed/seed-horizons-01.png',
      '/uploads/seed/seed-horizons-01.png',
      'image/png',
      1280,
      720,
      null,
      '1536x1024',
      '1536x1024',
      0,
      'nano-banana-pro',
      142000,
      now,
    );
    insertAsset.run(
      'ast_img_2',
      creatorId,
      proj1,
      'image',
      'Référence — Passerelle Orbitale Aurore',
      'Concept architectural pont d’observation orbital titane sombre.',
      '/uploads/seed/seed-horizons-02.png',
      '/uploads/seed/seed-horizons-02.png',
      'image/png',
      1280,
      720,
      null,
      '1536x1024',
      '1536x1024',
      0,
      'gemini-flash-image',
      138000,
      now,
    );

    // Cinema Bible: Characters & Locations
    db.prepare(`INSERT INTO characters (id, project_id, name, role, physical_traits, costume, voice_style, image_asset_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        'char_elena',
        proj1,
        'Commandante Elena Vance',
        'Protagoniste · Astrophysicienne',
        '36 ans, regard concentré, cicatrice discrète à la tempe gauche, cheveux châtains attachés.',
        'Veste de vol technique bleu nuit mate avec écusson orbital argenté.',
        'Calme, posée, autorité chaleureuse',
        'ast_img_1',
        '/uploads/seed/seed-horizons-01.png',
      );
    db.prepare(`INSERT INTO characters (id, project_id, name, role, physical_traits, costume, voice_style, image_asset_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        'char_marcus',
        proj1,
        'Dr. Marcus Chen',
        'Officier Systèmes & IA',
        '42 ans, lunettes fines en titane, barbe taillée court.',
        'Combinaison d’ingénierie gris ardoise, col montant.',
        'Analytique, précis, débit mesuré',
        null,
        '/uploads/seed/seed-atelier-01.png',
      );

    db.prepare(`INSERT INTO locations (id, project_id, name, atmosphere, lighting, continuity_notes, image_asset_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        'loc_monolith',
        proj1,
        'Rivage de Basalte — Arche d’Obsidienne',
        'Brume dense, vent côtier lent, silence minéral.',
        'Contre-jour bleu cobalt froid avec lueur ambrée à l’horizon.',
        'Conserver l’orientation est-ouest de l’arche et l’humidité sur la visière.',
        'ast_img_1',
        '/uploads/seed/seed-horizons-01.png',
      );
    db.prepare(`INSERT INTO locations (id, project_id, name, atmosphere, lighting, continuity_notes, image_asset_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        'loc_orbital',
        proj1,
        'Pont d’Observation Orbital',
        'Silencieux, verre courbé panoramique, reflets instrumentaux subtils.',
        'Éclairage zénithal doux bleu nuit + reflet atmosphérique terrestre.',
        'Pas de néon saturé; conserver le titane brossé mat.',
        'ast_img_2',
        '/uploads/seed/seed-horizons-02.png',
      );

    // Seed Scenes for Horizons d'Obsidienne
    const insertScene = db.prepare(`
      INSERT INTO scenes (
        id, project_id, order_index, chapter_title, title, visual_prompt, dialogue, speaker_name,
        camera_movement, framing, lighting_mood, duration_seconds, transition_type, subtitle_text,
        video_asset_id, video_url, keyframe_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertScene.run(
      'scn_1',
      proj1,
      0,
      'Acte I · Arrivée',
      'Ouverture sur le rivage de basalte',
      'Travelling lent sur la Commandante Elena Vance face à une arche monolithique d’obsidienne dans la brume.',
      'Ici Elena Vance. Le signal provient directement du cœur de la structure.',
      'Elena Vance',
      'Travelling avant lent',
      'Plan large anamorphique',
      'Crépuscule bleu cobalt',
      5,
      'crossfade',
      'Ici Elena Vance. Le signal provient directement du cœur de la structure.',
      'ast_vid_1',
      '/uploads/seed/seed-horizons-01.mp4',
      '/uploads/seed/seed-horizons-01.png',
      'ready',
    );
    insertScene.run(
      'scn_2',
      proj1,
      1,
      'Acte I · Connexion',
      'Analyse sur le pont orbital',
      'Plan moyen de Marcus Chen devant les baies vitrées panoramiques du pont orbital à l’aube.',
      'Commandante, les relevés spectroscopiques confirment une résonance harmonique stable.',
      'Marcus Chen',
      'Panoramique latéral doux',
      'Plan moyen',
      'Aube orbitale froide',
      6,
      'crossfade',
      'Les relevés confirment une résonance harmonique stable.',
      'ast_vid_2',
      '/uploads/seed/seed-horizons-02.mp4',
      '/uploads/seed/seed-horizons-02.png',
      'ready',
    );
    insertScene.run(
      'scn_3',
      proj1,
      2,
      'Acte II · Seuil',
      'Franchissement de l’arche',
      'Plan rapproché sur la visière d’Elena reflétant la géométrie lumineuse de l’arche.',
      'Enregistrement de la séquence de transition. Je traverse maintenant.',
      'Elena Vance',
      'Dolly zoom subtil',
      'Gros plan',
      'Contraste bleu nuit / or',
      5,
      'fade_black',
      'Je traverse le seuil maintenant.',
      'ast_vid_1',
      '/uploads/seed/seed-horizons-01.mp4',
      '/uploads/seed/seed-horizons-01.png',
      'ready',
    );

    // Seed Generation History
    const insertGen = db.prepare(`
      INSERT INTO generations (
        id, user_id, project_id, scene_id, category, mode, prompt, enhanced_prompt, model_id,
        auto_selected, status, progress, estimated_credits, reserved_credits, charged_credits,
        refunded_credits, error_message, output_asset_id, output_url, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertGen.run(
      'gen_seed_1',
      creatorId,
      proj1,
      'scn_1',
      'video',
      'text_to_video',
      'Astronaute marchant vers une arche d’obsidienne dans la brume',
      'Anamorphic 35mm slow dolly shot of Commander Elena Vance approaching a monolithic obsidian arch on misty basalt terrain, cobalt rim light.',
      'gemini-omni-video',
      1,
      'completed',
      100,
      30,
      30,
      30,
      0,
      null,
      'ast_vid_1',
      '/uploads/seed/seed-horizons-01.mp4',
      JSON.stringify({ durationSeconds: 5, resolution: '1080p', aspectRatio: '16:9', isUpscaled: false }),
      new Date(Date.now() - 86400_000 * 2).toISOString(),
      now,
    );
    insertGen.run(
      'gen_seed_fail',
      creatorId,
      proj2,
      null,
      'video',
      'video_to_video',
      'Transformation style peinture à l’huile nocturne',
      null,
      'runway-gen4-adapter',
      0,
      'failed',
      45,
      24,
      24,
      0,
      24,
      'Délai dépassé sur le nœud GPU distant — 24 crédits remboursés automatiquement.',
      null,
      null,
      JSON.stringify({ durationSeconds: 4, resolution: '1080p', aspectRatio: '16:9' }),
      new Date(Date.now() - 86400_000).toISOString(),
      now,
    );

    // Notifications & Audit Logs
    db.prepare(`INSERT INTO notifications (id, user_id, title, message, kind, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`)
      .run('notif_1', creatorId, 'Remboursement automatique effectué', '24 crédits ont été recrédités suite à l’échec GPU sur Paris Nocturne.', 'info', now);
    db.prepare(`INSERT INTO notifications (id, user_id, title, message, kind, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`)
      .run('notif_2', creatorId, 'Nouveau moteur Gemini 3.8 TTS actif', 'La synthèse vocale multi-locuteurs est disponible dans le Nova Film Engine.', 'success', now);

    db.prepare(`INSERT INTO audit_logs (id, actor_user_id, actor_email, action, target_type, target_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1', ?)`)
      .run('aud_1', adminId, 'admin@novamotion.ai', 'MODEL_CATALOG_INIT', 'system', 'models', 'Initialisation de 10 adaptateurs IA multi-fournisseurs.', now);
    db.prepare(`INSERT INTO audit_logs (id, actor_user_id, actor_email, action, target_type, target_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1', ?)`)
      .run('aud_2', creatorId, 'demo@novamotion.ai', 'PROJECT_CREATED', 'project', proj1, "Création du projet cinématographique Horizons d'Obsidienne.", now);
  }
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function getUserRoleAndPlan(userId: string): { role: UserRole; planId: PlanTierId } {
  const row = db.prepare('SELECT role, plan_id FROM users WHERE id = ?').get(userId) as
    | { role: UserRole; plan_id: PlanTierId }
    | undefined;
  return row ? { role: row.role, planId: row.plan_id } : { role: 'free', planId: 'free' };
}
