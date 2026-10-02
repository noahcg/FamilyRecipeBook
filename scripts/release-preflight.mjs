import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Local read-only validation. Never prints values or contacts a service.
const target = process.argv[2];
if (!['staging', 'production'].includes(target)) {
  console.error('Usage: node scripts/release-preflight.mjs staging|production');
  process.exit(1);
}
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const problems = [];
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'SEND_EMAIL_HOOK_SECRET', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_WORKERS_AI_API_TOKEN', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PLUS_ANNUAL_PRICE_ID'];
for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value || /your-|placeholder|example\.com|smoke-/i.test(value)) problems.push(`${name}: missing or placeholder`);
}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SITE_URL', 'APP_URL']) {
  if (!process.env[name]) continue;
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(url.hostname)) problems.push(`${name}: requires a deployed HTTPS origin`);
    if (url.username || url.password || url.search || url.hash) problems.push(`${name}: must not contain credentials, query, or fragment`);
  } catch { problems.push(`${name}: invalid URL`); }
}
if (process.env.APP_URL && process.env.NEXT_PUBLIC_SITE_URL && process.env.APP_URL.replace(/\/$/, '') !== process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')) problems.push('APP_URL: differs from NEXT_PUBLIC_SITE_URL');
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith(target === 'production' ? 'sk_live_' : 'sk_test_')) problems.push(`STRIPE_SECRET_KEY: wrong mode for ${target}`);
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) problems.push('Supabase public and privileged keys must differ');
for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET|PRIVATE|TOKEN|RESEND|OPENAI|ANTHROPIC/i.test(name) && value) problems.push(`${name}: secret-like browser-exposed variable`);
}
if (!!process.env.VAPID_PUBLIC_KEY !== !!process.env.VAPID_PRIVATE_KEY) problems.push('VAPID keys: configure both or neither');
if (problems.length) {
  console.error(`Release preflight failed (${target}):\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Release preflight passed (${target}). Values were not printed. Verify deployed settings and project separation using the launch runbook.`);
}
