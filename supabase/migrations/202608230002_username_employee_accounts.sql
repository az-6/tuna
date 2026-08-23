begin;

alter table public.organization_members add column if not exists username text;

with candidates as (
  select
    member.user_id,
    lower(split_part(auth_user.email, '@', 1)) candidate,
    row_number() over (
      partition by lower(split_part(auth_user.email, '@', 1))
      order by member.user_id
    ) candidate_order
  from public.organization_members member
  join auth.users auth_user on auth_user.id = member.user_id
  where member.username is null
)
update public.organization_members member
set username = case
  when candidates.candidate ~ '^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$'
       and candidates.candidate_order = 1
    then candidates.candidate
  else 'user_' || left(replace(member.user_id::text, '-', ''), 12)
end
from candidates
where member.user_id = candidates.user_id;

alter table public.organization_members alter column username set not null;

do $$ begin
  alter table public.organization_members
    add constraint organization_members_username_format
    check (
      char_length(username) between 3 and 32
      and username = lower(username)
      and username ~ '^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$'
    );
exception when duplicate_object then null; end $$;

create unique index if not exists organization_members_username_unique_idx
  on public.organization_members (lower(username));

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if requested_username !~ '^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$' then
    requested_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  insert into public.organizations(name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), 'KTG Tuna'))
  returning id into new_org;

  insert into public.organization_members(user_id, organization_id, role, username, display_name)
  values (
    new.id,
    new_org,
    'owner',
    requested_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), requested_username)
  );

  insert into public.organization_settings(organization_id, packaging_prices, updated_by)
  values (new_org, '{"esBalok":25000,"styrofoamBox":102500,"jellyIceLusin":300,"plastikLayer":500,"plastikStyrofoam":800,"lakbanRoll":100000,"alokasiPlastikLoinPerKg":300,"tetelanPricePerKg":25000,"tulangPricePerKg":3000,"customMaterials":[]}'::jsonb, new.id);
  return new;
end $$;

create or replace function public.provision_employee_account(
  p_owner_id uuid,
  p_employee_id uuid,
  p_username text,
  p_display_name text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  normalized_username text := lower(trim(coalesce(p_username, '')));
  target_org uuid;
  previous_org uuid;
begin
  if normalized_username !~ '^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$' then
    raise exception 'Format username tidak valid.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 120 then
    raise exception 'Nama pegawai harus 2-120 karakter.' using errcode = '22023';
  end if;

  select organization_id into target_org
  from public.organization_members
  where user_id = p_owner_id and role = 'owner';
  if not found then raise exception 'Aktor bukan owner organisasi.' using errcode = '42501'; end if;

  select organization_id into previous_org
  from public.organization_members
  where user_id = p_employee_id
  for update;
  if not found then raise exception 'Profil akun pegawai belum terbentuk.'; end if;

  update public.organization_members
  set organization_id = target_org,
      role = 'staff',
      username = normalized_username,
      display_name = trim(p_display_name)
  where user_id = p_employee_id;

  insert into public.audit_logs(organization_id, table_name, row_id, operation, after_data, actor_id)
  values (
    target_org,
    'organization_members',
    p_employee_id::text,
    'UPDATE',
    jsonb_build_object('username', normalized_username, 'display_name', trim(p_display_name), 'role', 'staff'),
    p_owner_id
  );

  if previous_org is distinct from target_org
     and not exists (select 1 from public.organization_members where organization_id = previous_org) then
    delete from public.organization_settings where organization_id = previous_org;
    delete from public.audit_logs where organization_id = previous_org;
    delete from public.organizations where id = previous_org;
  end if;
end $$;

create or replace function public.cleanup_provisional_employee(p_employee_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare provisional_org uuid;
begin
  select organization_id into provisional_org
  from public.organization_members
  where user_id = p_employee_id and role = 'owner';
  if not found then return; end if;

  if (select count(*) from public.organization_members where organization_id = provisional_org) <> 1
     or exists (select 1 from public.batches where organization_id = provisional_org) then
    raise exception 'Akun bukan bootstrap pegawai yang aman dibersihkan.' using errcode = '55000';
  end if;

  delete from public.organization_members where user_id = p_employee_id;
  delete from public.organization_settings where organization_id = provisional_org;
  delete from public.audit_logs where organization_id = provisional_org;
  delete from public.organizations where id = provisional_org;
end $$;

revoke all on function public.provision_employee_account(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.cleanup_provisional_employee(uuid) from public, anon, authenticated;
grant execute on function public.provision_employee_account(uuid, uuid, text, text) to service_role;
grant execute on function public.cleanup_provisional_employee(uuid) to service_role;

commit;
