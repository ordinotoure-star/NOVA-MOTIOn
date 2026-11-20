import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules enforces all Eight Pillars and blueprint synchronization', () => {
  assert.equal(fs.existsSync(rulesPath), true, 'firestore.rules must exist');
  assert.equal(fs.existsSync(blueprintPath), true, 'firebase-blueprint.json must exist');

  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
    entities: Record<string, unknown>;
    firestore: Record<string, unknown>;
  };

  // Pillar 4.1: Default deny catch-all first
  assert.match(rules, /match \/databases\/\{database\}\/documents\s*\{\s*\n\s*\/\/[^\n]*\n\s*match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);

  // Dirty Dozen Guard 1 & 2: No self-assigned admin role & role immutability
  assert.match(rules, /incoming\(\)\.role == 'free' && incoming\(\)\.planId == 'free'/);
  assert.match(rules, /incoming\(\)\.role == existing\(\)\.role/);

  // Dirty Dozen Guard 3: Email spoofing requires email_verified == true
  assert.match(rules, /request\.auth\.token\.email_verified == true/);

  // Dirty Dozen Guard 4: PII Isolation on /users
  assert.match(rules, /match \/users\/\{userId\}[\s\S]*allow get: if isValidId\(userId\) && \(isOwner\(userId\) \|\| isAdmin\(\)\)/);

  // Dirty Dozen Guard 5 & 12: Strict keys().hasAll / keys().hasOnly / affectedKeys().hasOnly & durationSeconds <= 15
  assert.match(rules, /data\.keys\(\)\.hasAll/);
  assert.match(rules, /data\.keys\(\)\.hasOnly/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);
  assert.match(rules, /data\.durationSeconds <= 15/);

  // Dirty Dozen Guard 6: Master Gate parent check on project subcollections
  assert.match(rules, /function isProjectOwner\(projectId\)/);
  assert.match(rules, /get\(\/databases\/\$\(database\)\/documents\/projects\/\$\(projectId\)\)\.data\.userId == request\.auth\.uid/);

  // Dirty Dozen Guard 7: Temporal integrity (request.time)
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);

  // Dirty Dozen Guard 8: ID Poisoning protection
  assert.match(rules, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);

  // Dirty Dozen Guard 9 & 10: Terminal state locks & append-only ledgers
  assert.match(rules, /!\(existing\(\)\.status in \['completed', 'failed', 'cancelled'\]\)/);
  assert.match(rules, /match \/transactions\/\{transactionId\}[\s\S]*allow update, delete: if false;/);
  assert.match(rules, /match \/auditLogs\/\{logId\}[\s\S]*allow update, delete: if false;/);

  // Dirty Dozen Guard 11: Query Enforcer on list rules (no blanket isSignedIn() list)
  assert.equal(/allow list:\s*if\s*isSignedIn\(\);/.test(rules), false);
  assert.equal(/allow read:\s*if\s*isSignedIn\(\);/.test(rules), false);

  // Verify every collection in firebase-blueprint.json has a corresponding match block in firestore.rules
  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const segments = collectionPath.split('/').filter(Boolean);
    const leafCollection = segments[segments.length - 2];
    assert.ok(
      rules.includes(`match /${leafCollection}/`),
      `firestore.rules missing match block for ${collectionPath}`,
    );
  }
});
