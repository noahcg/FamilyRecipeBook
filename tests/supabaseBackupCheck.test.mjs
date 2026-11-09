import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBackups } from '../scripts/check-supabase-backups.mjs';

const now = Date.parse('2026-11-09T12:00:00Z');
const record = (time, status = 'COMPLETED') => ({ inserted_at: time, status });

test('accepts a recent completed backup and ignores failures', () => {
  const result = assessBackups({ pitr_enabled: false, backups: [record('2026-11-09T11:00:00Z', 'FAILED'), record('2026-11-09T09:00:00Z')] }, now);
  assert.equal(result.ageHours, 3);
});

test('fails closed on stale, missing, future, or malformed backup data', () => {
  for (const data of [
    { pitr_enabled: false, backups: [record('2026-11-07T09:00:00Z')] },
    { pitr_enabled: false, backups: [] },
    { pitr_enabled: false, backups: [record('2026-12-01T00:00:00Z')] },
    { pitr_enabled: false, backups: [record('invalid')] },
    {},
    { backups: [record('2026-11-09T09:00:00Z')] },
    { pitr_enabled: true, backups: [record('2026-11-09T09:00:00Z')] },
  ]) assert.throws(() => assessBackups(data, now));
});
