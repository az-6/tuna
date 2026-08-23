import { createClient } from 'npm:@supabase/supabase-js@2';

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])$/;
const INTERNAL_AUTH_DOMAIN = 'users.ktg.invalid';

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return '';
  const configured = (Deno.env.get('APP_ORIGINS') || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return configured.includes(origin) || isLocal ? origin : null;
}

function jsonResponse(origin: string, status: number, body: Record<string, unknown>): Response {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin || 'null',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-application-name, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      'Vary': 'Origin'
    }
  });
}

Deno.serve(async (request: Request) => {
  const origin = allowedOrigin(request);
  if (origin === null) return Response.json({ ok: false, message: 'Origin tidak diizinkan.' }, { status: 403 });
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || 'null',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-application-name, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin'
      }
    });
  }
  if (request.method !== 'POST') return jsonResponse(origin, 405, { ok: false, message: 'Metode tidak diizinkan.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return jsonResponse(origin, 500, { ok: false, message: 'Konfigurasi server akun belum lengkap.' });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse(origin, 401, { ok: false, message: 'Sesi owner tidak valid.' });
  }

  const token = authorization.slice('Bearer '.length);
  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } }
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse(origin, 401, { ok: false, message: 'Sesi owner telah berakhir. Silakan masuk kembali.' });
  }

  const { data: ownerProfile, error: ownerError } = await callerClient
    .from('organization_members')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (ownerError || ownerProfile?.role !== 'owner') {
    return jsonResponse(origin, 403, { ok: false, message: 'Hanya owner yang dapat membuat akun pegawai.' });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(origin, 400, { ok: false, message: 'Payload akun tidak valid.' });
  }

  const username = normalizeUsername(body.username);
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!USERNAME_PATTERN.test(username)) {
    return jsonResponse(origin, 400, { ok: false, message: 'Format username tidak valid.' });
  }
  if (displayName.length < 2 || displayName.length > 120) {
    return jsonResponse(origin, 400, { ok: false, message: 'Nama pegawai harus 2–120 karakter.' });
  }
  if (password.length < 10 || password.length > 128) {
    return jsonResponse(origin, 400, { ok: false, message: 'Password harus 10–128 karakter.' });
  }

  const { data: existingUsername } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  if (existingUsername) {
    return jsonResponse(origin, 409, { ok: false, message: 'Username sudah digunakan. Pilih username lain.' });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: `${username}@${INTERNAL_AUTH_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: displayName,
      organization_name: 'Pending Employee'
    }
  });
  if (createError || !created.user) {
    const duplicate = createError?.message.toLowerCase().includes('already');
    return jsonResponse(origin, duplicate ? 409 : 400, {
      ok: false,
      message: duplicate ? 'Username sudah digunakan. Pilih username lain.' : 'Akun pegawai gagal dibuat.'
    });
  }

  const { error: provisionError } = await adminClient.rpc('provision_employee_account', {
    p_owner_id: userData.user.id,
    p_employee_id: created.user.id,
    p_username: username,
    p_display_name: displayName
  });
  if (provisionError) {
    await adminClient.rpc('cleanup_provisional_employee', { p_employee_id: created.user.id });
    await adminClient.auth.admin.deleteUser(created.user.id);
    return jsonResponse(origin, 500, { ok: false, message: 'Provisioning pegawai gagal dan akun sementara sudah dibatalkan.' });
  }

  return jsonResponse(origin, 201, { ok: true, username, role: 'staff' });
});
