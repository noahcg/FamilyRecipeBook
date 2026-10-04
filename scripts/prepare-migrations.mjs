// Copies only: no database access or changes to committed migration history.
// NEW EMPTY PROJECTS ONLY. Existing projects need docs/migration-history.md.
import { readdir, readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const directory = process.argv[2]
  ? resolve(process.argv[2])
  : await mkdtemp(join(tmpdir(), 'homecooked-migrations-'));
await mkdir(directory, { recursive: true });
if ((await readdir(directory)).length) throw new Error('Output directory must be empty');
const source = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(source)).filter((file) => file.endsWith('.sql')).sort();
const manifest = [];
const epoch = Date.UTC(2026, 9, 2);
for (const [index, file] of files.entries()) {
  const version = new Date(epoch + index * 1000).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const canonical = `${version}_${file.replace(/^\d+_/, '')}`;
  const bytes = await readFile(new URL(file, source));
  await writeFile(resolve(directory, canonical), bytes, { flag: 'wx' });
  manifest.push({ source: file, canonical, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(resolve(directory, 'migration-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(`Prepared ${files.length} uniquely versioned migrations at ${directory}. NEW EMPTY PROJECTS ONLY. No service was contacted.`);
