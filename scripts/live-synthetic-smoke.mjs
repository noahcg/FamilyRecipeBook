// Explicitly opt in before running. Uses generated accounts and deletes only IDs created here.
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

if (process.env.ALLOW_LIVE_SYNTHETIC_SMOKE !== '1') throw new Error('Set ALLOW_LIVE_SYNTHETIC_SMOKE=1 to run.');

const localEnv = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const expectedRef = process.env.EXPECTED_SUPABASE_PROJECT_REF;
if (!url || !expectedRef || new URL(url).hostname !== `${expectedRef}.supabase.co`) {
  throw new Error('The configured Supabase project does not match EXPECTED_SUPABASE_PROJECT_REF.');
}
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!anonKey || !serviceKey) throw new Error('Missing Supabase keys.');

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const created = { users: [], bookId: null, imagePath: null, householdId: null, groceryId: null, mealId: null, outsiderId: null };
const results = [];
const observedFailures = [];
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');

function ok(condition, label) {
  if (!condition) throw new Error(label);
  results.push(label);
}
function observe(condition, label, detail = '') {
  if (condition) results.push(label);
  else observedFailures.push(`${label}${detail ? `: ${detail}` : ''}`);
}
function requireData(response, label) {
  if (response.error || !response.data) throw new Error(`${label}: ${response.error?.code ?? 'missing data'} ${response.error?.message ?? ''}`.trim());
  return response.data;
}

async function createActor(role) {
  const email = `homecooked-smoke-${runId}-${role}@example.invalid`;
  const password = randomBytes(32).toString('base64url');
  const user = requireData(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Smoke ${role}` } }), `create ${role}`).user;
  created.users.push(user.id);
  const client = createClient(url, anonKey, options);
  const session = requireData(await client.auth.signInWithPassword({ email, password }), `sign in ${role}`);
  const cookieJar = new Map();
  const browserClient = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => cookieJar.set(name, value)),
    },
  });
  requireData(await browserClient.auth.signInWithPassword({ email, password }), `browser sign in ${role}`);
  ok(cookieJar.size > 0, `${role} receives auth cookies`);
  ok(session.user?.id === user.id, `${role} signs in`);
  return { id: user.id, email, client, cookieHeader: () => [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; ') };
}

async function cleanup() {
  const errors = [];
  if (created.bookId) {
    const result = await admin.from('recipe_books').delete().eq('id', created.bookId);
    if (result.error) errors.push(`book: ${result.error.message}`);
  }
  if (created.groceryId) {
    const result = await admin.from('grocery_items').delete().eq('id', created.groceryId);
    if (result.error) errors.push(`grocery: ${result.error.message}`);
  }
  if (created.mealId) {
    const result = await admin.from('meal_plans').delete().eq('id', created.mealId);
    if (result.error) errors.push(`meal plan: ${result.error.message}`);
  }
  if (created.householdId && created.outsiderId) {
    const result = await admin.from('household_members').delete().eq('household_id', created.householdId).eq('user_id', created.outsiderId);
    if (result.error) errors.push(`household membership: ${result.error.message}`);
  }
  if (created.imagePath) {
    const result = await admin.storage.from('recipe-images').remove([created.imagePath]);
    if (result.error) errors.push(`image: ${result.error.message}`);
  }
  for (const id of [...created.users].reverse()) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) errors.push(`user ${id}: ${result.error.message}`);
  }
  if (created.bookId) {
    const result = await admin.from('recipe_books').select('id').eq('id', created.bookId);
    if (result.error || result.data?.length) errors.push('book cleanup verification failed');
  }
  if (created.householdId) {
    const result = await admin.from('households').select('id').eq('id', created.householdId);
    if (result.error || result.data?.length) errors.push('household cleanup verification failed');
  }
  if (created.imagePath) {
    const result = await admin.storage.from('recipe-images').download(created.imagePath);
    if (!result.error) errors.push('image cleanup verification failed');
  }
  for (const id of created.users) {
    const result = await admin.auth.admin.getUserById(id);
    if (result.data?.user) errors.push(`user ${id} still exists`);
  }
  return errors;
}

let testError;
try {
  const keeper = await createActor('keeper');
  const contributor = await createActor('contributor');
  const family = await createActor('family');
  const outsider = await createActor('outsider');
  created.outsiderId = outsider.id;
  const invitee = await createActor('invitee');

  created.bookId = randomUUID();
  // The app's createBook action checks entitlements, then inserts with its server-only service client.
  const book = requireData(await admin.from('recipe_books').insert({ id: created.bookId, title: `Smoke ${runId}`, owner_id: keeper.id, sharing_enabled: true }).select('id').single(), 'create cookbook');
  const household = requireData(await keeper.client.from('households').select('id').eq('owner_id', keeper.id).single(), 'synthetic household');
  created.householdId = household.id;
  const grocery = requireData(await keeper.client.from('grocery_items').insert({ household_id: household.id, name: `Smoke apple ${runId}`, created_by: keeper.id }).select('id').single(), 'add grocery item');
  created.groceryId = grocery.id;
  const meal = requireData(await keeper.client.from('meal_plans').insert({ household_id: household.id, planned_date: new Date().toISOString().slice(0, 10), meal_slot: 'dinner', created_by: keeper.id }).select('id').single(), 'add meal plan');
  created.mealId = meal.id;
  ok((requireData(await keeper.client.from('grocery_items').select('id').eq('id', grocery.id), 'keeper reads grocery')).length === 1, 'keeper reads grocery');
  ok((requireData(await keeper.client.from('meal_plans').select('id').eq('id', meal.id), 'keeper reads meal plan')).length === 1, 'keeper reads meal plan');
  ok((requireData(await outsider.client.from('grocery_items').select('id').eq('id', grocery.id), 'outsider grocery read')).length === 0, 'outsider cannot read grocery before membership');
  const selfEnrollment = await outsider.client.from('household_members').insert({ household_id: household.id, user_id: outsider.id });
  observe(Boolean(selfEnrollment.error), 'outsider cannot self-enroll in household');
  if (!selfEnrollment.error) {
    const leakedGrocery = requireData(await outsider.client.from('grocery_items').select('id').eq('id', grocery.id), 'self-enrolled grocery read');
    observe(leakedGrocery.length === 0, 'self-enrolled outsider cannot read grocery');
    requireData(await admin.from('household_members').delete().eq('household_id', household.id).eq('user_id', outsider.id).select('id').single(), 'remove unauthorized synthetic membership');
  }
  const keeperMembership = requireData(await keeper.client.from('book_members').select('role').eq('book_id', book.id).eq('user_id', keeper.id).single(), 'keeper membership');
  ok(keeperMembership.role === 'keeper', 'cookbook creates keeper membership');
  const freeContributor = await admin.from('book_members').insert({ book_id: book.id, user_id: contributor.id, role: 'contributor' });
  ok(Boolean(freeContributor.error), 'free cookbook rejects contributor access');
  // Synthetic entitlement only. No Stripe customer, subscription, or payment is created.
  requireData(await admin.from('billing_accounts').update({ grandfathered_plus: true, grandfathered_at: new Date().toISOString() }).eq('user_id', keeper.id).select('user_id').single(), 'enable synthetic Plus entitlement');
  for (const [actor, role] of [[contributor, 'contributor'], [family, 'family']]) {
    requireData(await admin.from('book_members').insert({ book_id: book.id, user_id: actor.id, role }).select('id').single(), `add ${role}`);
  }
  for (const actor of [keeper, contributor, family]) {
    const rows = requireData(await actor.client.from('recipe_books').select('id').eq('id', book.id), 'member reads cookbook');
    ok(rows.length === 1, `${actor.id === keeper.id ? 'keeper' : actor.id === contributor.id ? 'contributor' : 'family'} reads cookbook`);
  }
  for (const [label, client] of [['outsider', outsider.client], ['anonymous', anonymous]]) {
    const rows = requireData(await client.from('recipe_books').select('id').eq('id', book.id), `${label} cookbook read`);
    ok(rows.length === 0, `${label} cannot read cookbook`);
  }
  const deniedMember = await contributor.client.from('book_members').insert({ book_id: book.id, user_id: outsider.id, role: 'family' });
  ok(Boolean(deniedMember.error), 'contributor cannot add members');

  const recipe = requireData(await contributor.client.from('recipes').insert({ book_id: book.id, title: `Smoke recipe ${runId}`, created_by: contributor.id }).select('id').single(), 'contributor creates recipe');
  const atomicRecipe = await keeper.client.rpc('save_recipe_atomic', {
    p_book_id: book.id, p_recipe_id: null,
    p_fields: { title: `Smoke atomic recipe ${runId}` },
    p_ingredients: [], p_instructions: [],
  });
  observe(!atomicRecipe.error && Boolean(atomicRecipe.data?.id), 'app recipe-save RPC creates recipe', atomicRecipe.error?.message);
  const familyRecipe = await family.client.from('recipes').insert({ book_id: book.id, title: `Blocked ${runId}`, created_by: family.id });
  ok(Boolean(familyRecipe.error), 'family cannot create recipe');
  const outsiderRecipe = await outsider.client.from('recipes').insert({ book_id: book.id, title: `Blocked ${runId}`, created_by: outsider.id });
  ok(Boolean(outsiderRecipe.error), 'outsider cannot create recipe');
  const familyRead = requireData(await family.client.from('recipes').select('id').eq('id', recipe.id), 'family recipe read');
  ok(familyRead.length === 1, 'family reads recipe');
  const outsiderRead = requireData(await outsider.client.from('recipes').select('id').eq('id', recipe.id), 'outsider recipe read');
  ok(outsiderRead.length === 0, 'outsider cannot read recipe');
  const familyEdit = await family.client.from('recipes').update({ title: `Blocked edit ${runId}` }).eq('id', recipe.id).select('id');
  ok(!familyEdit.error && familyEdit.data?.length === 0, 'family cannot edit recipe');
  const keeperEdit = await keeper.client.from('recipes').update({ title: `Smoke edited ${runId}` }).eq('id', recipe.id).select('id');
  observe(!keeperEdit.error && keeperEdit.data?.length === 1, 'keeper edits contributor recipe', keeperEdit.error?.message);

  const token = randomBytes(32).toString('hex');
  requireData(await keeper.client.from('book_invitations').insert({ book_id: book.id, email: invitee.email, role: 'family', token, invited_by: keeper.id, expires_at: new Date(Date.now() + 86_400_000).toISOString() }).select('id').single(), 'create synthetic invitation');
  const accepted = requireData(await invitee.client.rpc('accept_book_invitation', { invitation_token: token }), 'accept synthetic invitation');
  ok(accepted === book.id, 'invitation adds matching recipient');
  const reused = await invitee.client.rpc('accept_book_invitation', { invitation_token: token });
  ok(Boolean(reused.error), 'accepted invitation cannot be reused');
  const wrongRecipient = await outsider.client.rpc('accept_book_invitation', { invitation_token: token });
  ok(Boolean(wrongRecipient.error), 'invitation rejects wrong recipient');
  const invitedRead = requireData(await invitee.client.from('recipes').select('id').eq('id', recipe.id), 'invited member reads recipe');
  ok(invitedRead.length === 1, 'invited member reads recipe');

  for (const path of [`/app/books/${book.id}`, `/app/books/${book.id}/recipes`, `/app/books/${book.id}/groceries`, `/app/books/${book.id}/meal-plan`]) {
    const response = await fetch(new URL(path, process.env.APP_URL), { headers: { Cookie: keeper.cookieHeader() }, redirect: 'manual' });
    observe(response.status === 200, `deployed ${path.replace(book.id, ':bookId')} renders`, `HTTP ${response.status}`);
  }

  const imagePath = `${contributor.id}/smoke-${runId}.png`;
  created.imagePath = imagePath;
  requireData(await contributor.client.storage.from('recipe-images').upload(imagePath, tinyPng, { contentType: 'image/png', upsert: false }), 'upload image');
  const imageUrl = admin.storage.from('recipe-images').getPublicUrl(imagePath).data.publicUrl;
  const photoRecipe = await contributor.client.from('recipes').insert({ book_id: book.id, title: `Smoke photo recipe ${runId}`, created_by: contributor.id, photo_url: imageUrl }).select('id').single();
  observe(!photoRecipe.error && Boolean(photoRecipe.data), 'contributor creates recipe with image', photoRecipe.error?.message);
  const familyImage = await family.client.storage.from('recipe-images').download(imagePath);
  observe(!familyImage.error && familyImage.data?.size > 0, 'family reads assigned image', familyImage.error?.message);
  observe(familyImage.data?.type === 'image/png', 'storage preserves image content type', familyImage.data?.type);
  const outsiderImage = await outsider.client.storage.from('recipe-images').download(imagePath);
  observe(Boolean(outsiderImage.error), 'outsider cannot read assigned image');
  const anonymousImage = await anonymous.storage.from('recipe-images').download(imagePath);
  observe(Boolean(anonymousImage.error), 'anonymous cannot read assigned image');
  const deployedMediaUrl = new URL(`/api/media/recipe-images/${imagePath}`, process.env.APP_URL);
  const deployedApp = await fetch(new URL('/app', process.env.APP_URL), { headers: { Cookie: family.cookieHeader() }, redirect: 'manual' });
  observe(deployedApp.status === 200, 'deployed app accepts family session', `HTTP ${deployedApp.status}`);
  const deployedMemberImage = await fetch(deployedMediaUrl, { headers: { Cookie: family.cookieHeader() } });
  observe(deployedMemberImage.status === 200, 'deployed media route serves family image', `HTTP ${deployedMemberImage.status}, type ${deployedMemberImage.headers.get('content-type')}, cache ${deployedMemberImage.headers.get('cache-control')}`);
  const deployedOutsiderImage = await fetch(deployedMediaUrl, { headers: { Cookie: outsider.cookieHeader() } });
  observe(deployedOutsiderImage.status === 404, 'deployed media route denies outsider', `HTTP ${deployedOutsiderImage.status}`);

  requireData(await admin.from('book_members').delete().eq('book_id', book.id).eq('user_id', contributor.id).select('id').single(), 'remove contributor');
  const removedRead = requireData(await contributor.client.from('recipes').select('id').eq('id', recipe.id), 'removed member recipe read');
  ok(removedRead.length === 0, 'removed member loses recipe access');
  const removedImage = await contributor.client.storage.from('recipe-images').download(imagePath);
  observe(Boolean(removedImage.error), 'removed member loses image access');
  requireData(await admin.from('book_members').delete().eq('book_id', book.id).eq('user_id', invitee.id).select('id').single(), 'remove invited member');
  const removedInviteeRead = requireData(await invitee.client.from('recipes').select('id').eq('id', recipe.id), 'removed invitee recipe read');
  ok(removedInviteeRead.length === 0, 'removed invited member loses recipe access');
} catch (error) {
  testError = error;
} finally {
  const cleanupErrors = await cleanup();
  console.log(JSON.stringify({ project: expectedRef, runId, passed: results, failed: observedFailures, failure: testError?.message ?? null, cleanup: cleanupErrors.length ? cleanupErrors : 'verified' }, null, 2));
  if (testError || observedFailures.length || cleanupErrors.length) process.exitCode = 1;
}
