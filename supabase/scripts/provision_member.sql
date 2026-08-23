-- Jalankan hanya melalui Supabase SQL Editor oleh administrator proyek.
-- 1) Buat/invite user dari Authentication Dashboard terlebih dahulu.
-- 2) Ganti dua UUID dan role di bawah, lalu jalankan satu kali.
-- Script memindahkan akun dari organisasi personal hasil bootstrap ke organisasi target.

do $$
declare
  target_user uuid := '00000000-0000-0000-0000-000000000000';
  target_organization uuid := '11111111-1111-1111-1111-111111111111';
  target_username text := 'pegawai_username';
  previous_organization uuid;
begin
  if target_user = '00000000-0000-0000-0000-000000000000'::uuid
     or target_organization = '11111111-1111-1111-1111-111111111111'::uuid then
    raise exception 'Ganti target_user dan target_organization sebelum menjalankan script.';
  end if;

  if not exists (select 1 from auth.users where id = target_user) then
    raise exception 'User tidak ditemukan di auth.users.';
  end if;
  if not exists (select 1 from public.organizations where id = target_organization) then
    raise exception 'Organisasi target tidak ditemukan.';
  end if;
  if target_username !~ '^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$' then
    raise exception 'Format target_username tidak valid.';
  end if;

  select organization_id into previous_organization
  from public.organization_members
  where user_id = target_user
  for update;

  update public.organization_members
  set organization_id = target_organization,
      role = 'staff', -- ubah menjadi 'manager' bila memang disetujui owner
      username = target_username
  where user_id = target_user;

  if previous_organization is distinct from target_organization
     and not exists (select 1 from public.organization_members where organization_id = previous_organization) then
    delete from public.organization_settings where organization_id = previous_organization;
    delete from public.audit_logs where organization_id = previous_organization;
    delete from public.organizations where id = previous_organization;
  end if;
end $$;
