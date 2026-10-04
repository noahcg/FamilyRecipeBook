import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/prepare-migrations.mjs');

test('migration generator preserves every SQL byte with unique valid versions and checksums', async () => {
  const output = await mkdtemp(join(tmpdir(), 'migration-test-'));
  try {
    const result = spawnSync(process.execPath, [script, output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(join(output, 'migration-manifest.json'), 'utf8'));
    const originals = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
    assert.deepEqual(manifest.map((entry) => entry.source), originals);
    assert.equal(new Set(manifest.map((entry) => entry.canonical.split('_')[0])).size, originals.length);
    for (const entry of manifest) {
      const version = entry.canonical.split('_')[0];
      assert.match(version, /^\d{14}$/);
      const timestamp = `${version.slice(0, 4)}-${version.slice(4, 6)}-${version.slice(6, 8)}T${version.slice(8, 10)}:${version.slice(10, 12)}:${version.slice(12, 14)}Z`;
      assert.equal(new Date(timestamp).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14), version);
      const original = await readFile(join('supabase/migrations', entry.source));
      assert.deepEqual(await readFile(join(output, entry.canonical)), original);
      assert.equal(entry.sha256, createHash('sha256').update(original).digest('hex'));
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('migration generator refuses nonempty output without changing its files', async () => {
  const output = await mkdtemp(join(tmpdir(), 'migration-test-'));
  try {
    await writeFile(join(output, 'keep.txt'), 'preserve me');
    const result = spawnSync(process.execPath, [script, output], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Output directory must be empty/);
    assert.deepEqual(await readdir(output), ['keep.txt']);
    assert.equal(await readFile(join(output, 'keep.txt'), 'utf8'), 'preserve me');
  } finally { await rm(output, { recursive: true, force: true }); }
});
