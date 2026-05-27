import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../public/dashboard-admin/index.html', import.meta.url), 'utf8');
const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const netlifyToml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');

test('single-file dashboard uses Supabase magic-link auth', () => {
  assert.match(html, /@supabase\/supabase-js@2/);
  assert.match(html, /createClient\(SUPABASE_URL, SUPABASE_ANON_KEY\)/);
  assert.match(html, /supabase\.auth\.getSession\(\)/);
  assert.match(html, /supabase\.auth\.signInWithOtp\(/);
  assert.match(html, /DASHBOARD_PATH\s*=\s*'\/dashboard-admin'/);
  assert.match(html, /emailRedirectTo:\s*`\$\{window\.location\.origin\}\$\{DASHBOARD_PATH\}`/);
  assert.doesNotMatch(html, /emailRedirectTo:\s*window\.location\.origin\s*[,}]/);
  assert.match(html, /supabase\.auth\.onAuthStateChange\(/);
  assert.match(html, /supabase\.auth\.signOut\(\)/);
});

test('dashboard enforces client allowlist and authenticated REST requests', () => {
  assert.match(html, /ALLOWED_EMAILS\s*=\s*\[\s*'nzcoffee\.tech@gmail\.com',\s*'nzcoffeeco@gmail\.com'\s*\]/);
  assert.match(html, /Authorization:\s*`Bearer \$\{state\.session\.access_token\}`/);
  assert.match(html, /apikey:\s*SUPABASE_ANON_KEY/);
  assert.doesNotMatch(html, /service_role/i);
});

test('dashboard is integrated into the single Astro Netlify build', () => {
  assert.equal(packageJson.scripts.build, 'astro build');
  assert.equal(packageJson.scripts.dev, 'astro dev');
  assert.equal(packageJson.scripts.preview, 'astro preview');
  assert.doesNotMatch(JSON.stringify(packageJson.scripts), /build-static|serve-static|node scripts/);
  assert.match(netlifyToml, /command = "npm run build"/);
  assert.match(netlifyToml, /publish = "dist"/);
  assert.match(redirects, /^\/dashboard-admin \/dashboard-admin\/index\.html 200$/m);
  assert.match(redirects, /^\/dashboard-admin\/\* \/dashboard-admin\/index\.html 200$/m);
});
