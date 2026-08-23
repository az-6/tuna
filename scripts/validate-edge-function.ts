const edgePath = 'supabase/functions/create-employee/index.ts';
const source = await Bun.file(edgePath).text();
const browserAdapter = await Bun.file('src/lib/username.ts').text();

const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' });
const transpiled = transpiler.transformSync(
  source.replace('npm:@supabase/supabase-js@2', '@supabase/supabase-js')
);

if (!transpiled.includes('Deno.serve')) throw new Error('Entrypoint Deno.serve tidak ditemukan setelah transpile.');
if (!source.includes("const INTERNAL_AUTH_DOMAIN = 'users.ktg.invalid'")) throw new Error('Domain identitas internal Edge Function berubah.');
if (!browserAdapter.includes("const INTERNAL_AUTH_DOMAIN = 'users.ktg.invalid'")) throw new Error('Domain identitas browser dan Edge Function tidak konsisten.');
if (!source.includes("ownerProfile?.role !== 'owner'")) throw new Error('Verifikasi role owner tidak ditemukan.');
if (!source.includes('auth.getUser(token)')) throw new Error('Verifikasi access token tidak ditemukan.');

console.log('Edge Function validation: PASS (syntax, identity domain, token check, owner authorization)');
