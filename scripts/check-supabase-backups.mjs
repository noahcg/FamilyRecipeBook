import { pathToFileURL } from 'node:url';

const MAX_BACKUP_AGE_HOURS = 36;

export function assessBackups(data, now = Date.now()) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.backups)) {
    throw new Error('Unexpected backup response; backup health is unknown.');
  }
  if (data.pitr_enabled !== false) {
    throw new Error('PITR is enabled or its status is unknown; this check needs a PITR-aware configuration.');
  }
  const completed = data.backups
    .filter((backup) => backup.status === 'COMPLETED')
    .map((backup) => Date.parse(backup.inserted_at))
    .filter(Number.isFinite)
    .filter((timestamp) => timestamp <= now + 5 * 60 * 1000)
    .sort((a, b) => b - a);
  if (!completed.length) throw new Error('No valid completed backup found.');
  const ageHours = (now - completed[0]) / 3600000;
  if (ageHours > MAX_BACKUP_AGE_HOURS) {
    throw new Error(`Latest completed backup is ${ageHours.toFixed(1)} hours old; limit is ${MAX_BACKUP_AGE_HOURS}.`);
  }
  return { latest: new Date(completed[0]).toISOString(), ageHours };
}

async function main() {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !/^[a-z0-9]{20}$/.test(ref) || !token) {
    throw new Error('Set a valid SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN.');
  }
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/backups`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Supabase backup request failed with HTTP ${response.status}.`);
  const result = assessBackups(await response.json());
  console.log(`Latest completed database backup: ${result.latest} (${result.ageHours.toFixed(1)} hours old).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Backup check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
