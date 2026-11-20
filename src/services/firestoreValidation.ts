// Programmatic payload validation synchronized verbatim with firebase-blueprint.json & firestore.rules

export const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

export const BLUEPRINT_LIMITS = {
  idMax: 128,
  emailMax: 254,
  shortNameMax: 160,
  titleMax: 200,
  projectTitleMin: 2,
  projectTitleMax: 160,
  genreMax: 100,
  aspectRatioMax: 24,
  visualStyleMax: 240,
  coherenceMax: 300,
  descriptionMax: 2000,
  mediumTextMax: 1000,
  longPromptMax: 4000,
  dialogueMax: 2000,
  urlMax: 1024,
  paymentMethodMax: 64,
  txDescriptionMax: 300,
  nativeResolutionsMaxItems: 10,
} as const;

export function sanitizeId(raw: string, fallbackPrefix = 'id'): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_LIMITS.idMax);
  if (cleaned.length > 0 && ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function assertValidId(id: string, fieldName = 'id'): string {
  if (typeof id !== 'string' || id.length === 0 || id.length > BLUEPRINT_LIMITS.idMax || !ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${fieldName} format according to firebase-blueprint.json.`);
  }
  return id;
}

export function clampString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : fallback;
  return str.slice(0, maxLength);
}

export function clampNonEmptyString(value: unknown, maxLength: number, fallback: string): string {
  const str = typeof value === 'string' ? value.trim() : '';
  const safe = str.length > 0 ? str : fallback;
  return safe.slice(0, maxLength);
}

export function normalizeOptionalId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !ID_PATTERN.test(trimmed)) return null;
  return trimmed.slice(0, BLUEPRINT_LIMITS.idMax);
}

export function normalizeOptionalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, BLUEPRINT_LIMITS.urlMax);
}
