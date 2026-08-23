begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.batch_lifecycle as enum ('WIP', 'FINAL');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null default 'staff',
  display_name text not null default 'Pengguna',
  created_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  nelayan text not null check (char_length(nelayan) between 1 and 160),
  batch_date date not null,
  status public.batch_lifecycle not null default 'WIP',
  operational_data jsonb not null default '{}'::jsonb check (jsonb_typeof(operational_data) = 'object'),
  version bigint not null default 1 check (version > 0),
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.batch_financials (
  batch_id uuid primary key references public.batches(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  financial_data jsonb not null default '{}'::jsonb check (jsonb_typeof(financial_data) = 'object'),
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.fish_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  no_ikan integer not null check (no_ikan > 0),
  fish_code text not null check (char_length(fish_code) between 1 and 120),
  whole_weight_kg numeric(14,3) not null check (whole_weight_kg > 0),
  purchase_grade text not null check (purchase_grade in ('A', 'B', 'C')),
  cut_grade text check (cut_grade in ('A', 'B', 'C', 'Reject')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  loins jsonb not null default '[]'::jsonb check (jsonb_typeof(loins) = 'array'),
  tetelan_kg numeric(14,3) not null default 0 check (tetelan_kg >= 0),
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, no_ikan)
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  packaging_prices jsonb not null default '{}'::jsonb check (jsonb_typeof(packaging_prices) = 'object'),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.hpp_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  batch_version bigint not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (batch_id, batch_version)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  table_name text not null,
  row_id text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE', 'FINALIZE', 'REOPEN')),
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists batches_org_date_idx on public.batches (organization_id, batch_date desc);
create index if not exists fish_records_batch_idx on public.fish_records (batch_id, no_ikan);
create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public
as $$ select organization_id from public.organization_members where user_id = auth.uid() limit 1 $$;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.organization_members where user_id = auth.uid() limit 1 $$;

create or replace function public.is_finance_manager()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() in ('owner', 'manager'), false) $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  payload jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org_id uuid := (payload ->> 'organization_id')::uuid;
  entity_id text := coalesce(payload ->> 'id', payload ->> 'batch_id', payload ->> 'organization_id');
begin
  insert into public.audit_logs(organization_id, table_name, row_id, operation, before_data, after_data, actor_id)
  values (org_id, tg_table_name, entity_id, tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid());
  return coalesce(new, old);
end $$;

create or replace function public.guard_final_batch()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'FINAL' and coalesce(current_setting('app.allow_reopen', true), '') <> 'on' then
    raise exception 'Batch FINAL bersifat immutable. Gunakan prosedur reopen dengan alasan.' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if old.organization_id is distinct from new.organization_id or old.created_by is distinct from new.created_by then
    raise exception 'Identitas organisasi dan pembuat batch bersifat immutable.' using errcode = '55000';
  end if;
  if old.status is distinct from new.status
     and coalesce(current_setting('app.allow_finalize', true), '') <> 'on'
     and coalesce(current_setting('app.allow_reopen', true), '') <> 'on' then
    raise exception 'Status batch hanya dapat diubah melalui prosedur finalize/reopen.' using errcode = '55000';
  end if;
  if (old.finalized_at is distinct from new.finalized_at or old.finalized_by is distinct from new.finalized_by)
     and coalesce(current_setting('app.allow_finalize', true), '') <> 'on'
     and coalesce(current_setting('app.allow_reopen', true), '') <> 'on' then
    raise exception 'Metadata finalisasi hanya dapat diubah melalui prosedur resmi.' using errcode = '55000';
  end if;
  return coalesce(new, old);
end $$;

create or replace function public.guard_final_batch_child()
returns trigger language plpgsql set search_path = public as $$
declare
  target_batch uuid;
  child_org uuid;
  target_org uuid;
  target_status public.batch_lifecycle;
begin
  target_batch := case when tg_op = 'DELETE' then old.batch_id else new.batch_id end;
  child_org := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  select organization_id, status into target_org, target_status from public.batches where id = target_batch;
  if not found or target_org is distinct from child_org then
    raise exception 'Batch induk tidak ditemukan atau berbeda organisasi.' using errcode = '23503';
  end if;
  if target_status = 'FINAL' then
    raise exception 'Data batch FINAL tidak dapat diubah.' using errcode = '55000';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists batches_updated_at on public.batches;
create trigger batches_updated_at before update on public.batches for each row execute function public.set_updated_at();
drop trigger if exists fish_updated_at on public.fish_records;
create trigger fish_updated_at before update on public.fish_records for each row execute function public.set_updated_at();
drop trigger if exists financials_updated_at on public.batch_financials;
create trigger financials_updated_at before update on public.batch_financials for each row execute function public.set_updated_at();
drop trigger if exists settings_updated_at on public.organization_settings;
create trigger settings_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();

drop trigger if exists guard_final_batch_trigger on public.batches;
create trigger guard_final_batch_trigger before update or delete on public.batches for each row execute function public.guard_final_batch();
drop trigger if exists guard_final_fish_trigger on public.fish_records;
create trigger guard_final_fish_trigger before insert or update or delete on public.fish_records for each row execute function public.guard_final_batch_child();
drop trigger if exists guard_final_financial_trigger on public.batch_financials;
create trigger guard_final_financial_trigger before insert or update or delete on public.batch_financials for each row execute function public.guard_final_batch_child();

do $$
declare table_name text;
begin
  foreach table_name in array array['batches','fish_records','batch_financials','organization_settings','hpp_snapshots'] loop
    execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into public.organizations(name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), 'KTG Tuna'))
  returning id into new_org;

  insert into public.organization_members(user_id, organization_id, role, display_name)
  values (new.id, new_org, 'owner', coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));

  insert into public.organization_settings(organization_id, packaging_prices, updated_by)
  values (new_org, '{"esBalok":25000,"styrofoamBox":102500,"jellyIceLusin":300,"plastikLayer":500,"plastikStyrofoam":800,"lakbanRoll":100000,"alokasiPlastikLoinPerKg":300,"tetelanPricePerKg":25000,"tulangPricePerKg":3000,"customMaterials":[]}'::jsonb, new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.create_batch(
  p_batch_id uuid,
  p_code text,
  p_nelayan text,
  p_batch_date date,
  p_operational jsonb,
  p_financial jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_finance_manager() then
    raise exception 'Hanya owner/manager dapat membuat batch dan menetapkan biaya awal.' using errcode = '42501';
  end if;
  insert into public.batches(id, organization_id, code, nelayan, batch_date, operational_data)
  values (
    p_batch_id,
    public.current_org_id(),
    nullif(trim(p_code), ''),
    nullif(trim(p_nelayan), ''),
    p_batch_date,
    coalesce(p_operational, '{}'::jsonb)
  );
  insert into public.batch_financials(batch_id, organization_id, financial_data, updated_by)
  values (p_batch_id, public.current_org_id(), coalesce(p_financial, '{}'::jsonb), auth.uid());
end $$;

create or replace function public.patch_batch_full(
  p_batch_id uuid,
  p_batch_patch jsonb,
  p_financial_patch jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare financial_patch jsonb := coalesce(p_financial_patch, '{}'::jsonb);
begin
  if jsonb_typeof(coalesce(p_batch_patch, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(financial_patch) <> 'object' then
    raise exception 'Patch batch harus berupa JSON object.';
  end if;
  if financial_patch <> '{}'::jsonb and not public.is_finance_manager() then
    raise exception 'Akses finansial ditolak.' using errcode = '42501';
  end if;
  update public.batches
  set code = coalesce(nullif(p_batch_patch ->> 'code', ''), code),
      nelayan = coalesce(nullif(p_batch_patch ->> 'nelayan', ''), nelayan),
      batch_date = coalesce((p_batch_patch ->> 'batch_date')::date, batch_date),
      operational_data = operational_data || coalesce(p_batch_patch -> 'operational_data', '{}'::jsonb),
      version = version + 1
  where id = p_batch_id and organization_id = public.current_org_id();
  if not found then raise exception 'Batch tidak ditemukan atau tidak dapat diubah.'; end if;

  if financial_patch <> '{}'::jsonb then
    insert into public.batch_financials(batch_id, organization_id, financial_data, updated_by)
    values (p_batch_id, public.current_org_id(), financial_patch, auth.uid())
    on conflict (batch_id) do update
    set financial_data = public.batch_financials.financial_data || excluded.financial_data,
        updated_by = auth.uid();
  end if;
end $$;

create or replace function public.patch_batch(p_batch_id uuid, p_patch jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.batches
  set code = coalesce(nullif(p_patch ->> 'code', ''), code),
      nelayan = coalesce(nullif(p_patch ->> 'nelayan', ''), nelayan),
      batch_date = coalesce((p_patch ->> 'batch_date')::date, batch_date),
      operational_data = operational_data || coalesce(p_patch -> 'operational_data', '{}'::jsonb),
      version = version + 1
  where id = p_batch_id and organization_id = public.current_org_id();
  if not found then raise exception 'Batch tidak ditemukan atau tidak dapat diubah.'; end if;
end $$;

create or replace function public.patch_batch_financials(p_batch_id uuid, p_patch jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_finance_manager() then raise exception 'Akses finansial ditolak.' using errcode = '42501'; end if;
  insert into public.batch_financials(batch_id, organization_id, financial_data, updated_by)
  values (p_batch_id, public.current_org_id(), coalesce(p_patch, '{}'::jsonb), auth.uid())
  on conflict (batch_id) do update
  set financial_data = public.batch_financials.financial_data || excluded.financial_data,
      updated_by = auth.uid();
end $$;

create or replace function public.finalize_batch(p_batch_id uuid, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.batches%rowtype;
  pending_count integer;
  fish_count integer;
  saleable numeric;
  snapshot_saleable numeric;
  snapshot_gross_cost numeric;
  snapshot_net_cost numeric;
  issues jsonb;
  stored_snapshot jsonb;
begin
  if not public.is_finance_manager() then raise exception 'Hanya owner/manager dapat finalisasi.' using errcode = '42501'; end if;
  select * into target from public.batches where id = p_batch_id and organization_id = public.current_org_id() for update;
  if not found then raise exception 'Batch tidak ditemukan.'; end if;
  if target.status = 'FINAL' then raise exception 'Batch sudah FINAL.'; end if;
  select count(*), count(*) filter (where status <> 'done')
  into fish_count, pending_count
  from public.fish_records
  where batch_id = p_batch_id;

  select coalesce(sum(
    case
      when loin ->> 'grade' in ('A','B','C')
        and jsonb_typeof(loin -> 'weight') = 'number'
      then greatest((loin ->> 'weight')::numeric, 0)
      else 0
    end
  ), 0)
  into saleable
  from public.fish_records f
  cross join lateral jsonb_array_elements(f.loins) loin
  where f.batch_id = p_batch_id;

  issues := coalesce(p_snapshot -> 'finalization_issues', '[]'::jsonb);
  snapshot_saleable := coalesce((p_snapshot ->> 'saleable_loin_kg')::numeric, -1);
  snapshot_gross_cost := coalesce((p_snapshot ->> 'gross_cost_pool')::numeric, -1);
  snapshot_net_cost := coalesce((p_snapshot ->> 'net_cost_pool')::numeric, -1);
  if fish_count = 0 then raise exception 'Batch belum mempunyai data ikan.'; end if;
  if pending_count > 0 then raise exception '% ikan belum selesai.', pending_count; end if;
  if saleable <= 0 then raise exception 'Batch tidak mempunyai loin layak jual.'; end if;
  if abs(snapshot_saleable - saleable) > 0.001 then raise exception 'Snapshot HPP tidak sesuai dengan output loin di database.'; end if;
  if coalesce(p_snapshot ->> 'batch_status', '') <> 'FINAL' then raise exception 'Snapshot belum berstatus FINAL.'; end if;
  if coalesce((p_snapshot #>> '{reconciliation,isReconciled}')::boolean, false) is not true then raise exception 'HPP belum rekonsiliasi.'; end if;
  if jsonb_array_length(issues) > 0 then raise exception 'Finalisasi memiliki isu: %', issues::text; end if;
  if snapshot_gross_cost < 0 or snapshot_net_cost < 0 or snapshot_net_cost > snapshot_gross_cost + 0.01 then
    raise exception 'Gross/net cost pool tidak valid.';
  end if;

  stored_snapshot := p_snapshot || jsonb_build_object(
    'source_state', jsonb_build_object(
      'batch', to_jsonb(target),
      'financial_data', coalesce((select financial_data from public.batch_financials where batch_id = target.id), '{}'::jsonb),
      'fish_records', coalesce((
        select jsonb_agg(to_jsonb(f) order by f.no_ikan)
        from public.fish_records f where f.batch_id = target.id
      ), '[]'::jsonb),
      'packaging_prices', coalesce((
        select packaging_prices from public.organization_settings where organization_id = target.organization_id
      ), '{}'::jsonb)
    )
  );

  insert into public.hpp_snapshots(organization_id, batch_id, batch_version, snapshot, created_by)
  values (target.organization_id, target.id, target.version, stored_snapshot, auth.uid());
  perform set_config('app.allow_finalize', 'on', true);
  update public.batches set status = 'FINAL', finalized_at = now(), finalized_by = auth.uid() where id = target.id;
  insert into public.audit_logs(organization_id, table_name, row_id, operation, after_data, actor_id)
  values (target.organization_id, 'batches', target.id::text, 'FINALIZE', stored_snapshot, auth.uid());
end $$;

create or replace function public.reopen_batch(p_batch_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare target public.batches%rowtype;
begin
  if not public.is_finance_manager() then raise exception 'Hanya owner/manager dapat membuka batch.' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Alasan reopen minimal 10 karakter.'; end if;
  select * into target from public.batches where id = p_batch_id and organization_id = public.current_org_id() for update;
  if not found or target.status <> 'FINAL' then raise exception 'Batch FINAL tidak ditemukan.'; end if;
  perform set_config('app.allow_reopen', 'on', true);
  update public.batches set status = 'WIP', finalized_at = null, finalized_by = null, version = version + 1 where id = target.id;
  insert into public.audit_logs(organization_id, table_name, row_id, operation, before_data, after_data, actor_id, reason)
  values (target.organization_id, 'batches', target.id::text, 'REOPEN', to_jsonb(target), jsonb_build_object('status','WIP'), auth.uid(), trim(p_reason));
end $$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.batches enable row level security;
alter table public.batch_financials enable row level security;
alter table public.fish_records enable row level security;
alter table public.organization_settings enable row level security;
alter table public.hpp_snapshots enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon;
revoke all on public.batches, public.batch_financials, public.hpp_snapshots from authenticated;
grant select on public.organizations, public.organization_members, public.batches, public.fish_records to authenticated;
grant delete on public.batches to authenticated;
grant insert, update, delete on public.fish_records to authenticated;
grant select on public.batch_financials, public.hpp_snapshots to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists members_read_self on public.organization_members;
create policy members_read_self on public.organization_members for select to authenticated using (user_id = auth.uid());
drop policy if exists organizations_read_own on public.organizations;
create policy organizations_read_own on public.organizations for select to authenticated using (id = public.current_org_id());
drop policy if exists batches_read_own on public.batches;
create policy batches_read_own on public.batches for select to authenticated using (organization_id = public.current_org_id());
drop policy if exists batches_insert_own on public.batches;
create policy batches_insert_own on public.batches for insert to authenticated with check (organization_id = public.current_org_id());
drop policy if exists batches_update_own on public.batches;
create policy batches_update_own on public.batches for update to authenticated using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
drop policy if exists batches_delete_manager on public.batches;
create policy batches_delete_manager on public.batches for delete to authenticated using (organization_id = public.current_org_id() and public.is_finance_manager());
drop policy if exists fish_all_own on public.fish_records;
create policy fish_all_own on public.fish_records for all to authenticated using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
drop policy if exists financials_manager on public.batch_financials;
create policy financials_manager on public.batch_financials for all to authenticated using (organization_id = public.current_org_id() and public.is_finance_manager()) with check (organization_id = public.current_org_id() and public.is_finance_manager());
drop policy if exists settings_manager on public.organization_settings;
create policy settings_manager on public.organization_settings for all to authenticated using (organization_id = public.current_org_id() and public.is_finance_manager()) with check (organization_id = public.current_org_id() and public.is_finance_manager());
drop policy if exists snapshots_manager on public.hpp_snapshots;
create policy snapshots_manager on public.hpp_snapshots for all to authenticated using (organization_id = public.current_org_id() and public.is_finance_manager()) with check (organization_id = public.current_org_id() and public.is_finance_manager());
drop policy if exists audits_manager_read on public.audit_logs;
create policy audits_manager_read on public.audit_logs for select to authenticated using (organization_id = public.current_org_id() and public.is_finance_manager());

revoke all on function public.current_org_id() from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_finance_manager() from public, anon;
revoke all on function public.create_batch(uuid, text, text, date, jsonb, jsonb) from public, anon;
revoke all on function public.patch_batch_full(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.patch_batch(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.patch_batch_financials(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.finalize_batch(uuid, jsonb) from public, anon;
revoke all on function public.reopen_batch(uuid, text) from public, anon;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.audit_row_change() from public, anon, authenticated;
revoke all on function public.guard_final_batch() from public, anon, authenticated;
revoke all on function public.guard_final_batch_child() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_finance_manager() to authenticated;
grant execute on function public.create_batch(uuid, text, text, date, jsonb, jsonb) to authenticated;
grant execute on function public.patch_batch_full(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.finalize_batch(uuid, jsonb) to authenticated;
grant execute on function public.reopen_batch(uuid, text) to authenticated;

commit;
