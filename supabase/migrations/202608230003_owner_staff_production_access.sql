begin;

-- Model akses production hanya mengenal owner dan staff. Manager lama diturunkan
-- menjadi staff agar tidak mempertahankan hak HPP setelah role dihapus.
update public.organization_members set role = 'staff' where role = 'manager';

drop policy if exists batches_delete_manager on public.batches;
drop policy if exists financials_manager on public.batch_financials;
drop policy if exists settings_manager on public.organization_settings;
drop policy if exists snapshots_manager on public.hpp_snapshots;
drop policy if exists audits_manager_read on public.audit_logs;

drop function if exists public.create_batch(uuid, text, text, date, jsonb, jsonb);
drop function if exists public.patch_batch_full(uuid, jsonb, jsonb);
drop function if exists public.patch_batch_financials(uuid, jsonb);
drop function if exists public.finalize_batch(uuid, jsonb);
drop function if exists public.reopen_batch(uuid, text);
drop function if exists public.is_finance_manager();
drop function if exists public.current_app_role();

alter table public.organization_members alter column role drop default;
alter table public.organization_members alter column role type text using role::text;
drop type public.app_role;
create type public.app_role as enum ('owner', 'staff');
alter table public.organization_members
  alter column role type public.app_role using role::public.app_role,
  alter column role set default 'staff'::public.app_role;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.organization_members where user_id = auth.uid() limit 1 $$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() = 'owner', false) $$;

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
  if public.current_org_id() is null then
    raise exception 'Akun belum terhubung ke organisasi.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_operational, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_financial, '{}'::jsonb)) <> 'object' then
    raise exception 'Data batch harus berupa JSON object.';
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
  if not public.is_owner() then raise exception 'Hanya owner dapat finalisasi.' using errcode = '42501'; end if;
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
  if not public.is_owner() then raise exception 'Hanya owner dapat membuka batch.' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Alasan reopen minimal 10 karakter.'; end if;
  select * into target from public.batches where id = p_batch_id and organization_id = public.current_org_id() for update;
  if not found or target.status <> 'FINAL' then raise exception 'Batch FINAL tidak ditemukan.'; end if;
  perform set_config('app.allow_reopen', 'on', true);
  update public.batches set status = 'WIP', finalized_at = null, finalized_by = null, version = version + 1 where id = target.id;
  insert into public.audit_logs(organization_id, table_name, row_id, operation, before_data, after_data, actor_id, reason)
  values (target.organization_id, 'batches', target.id::text, 'REOPEN', to_jsonb(target), jsonb_build_object('status','WIP'), auth.uid(), trim(p_reason));
end $$;

create policy batches_delete_owner on public.batches for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_owner());
create policy financials_operations on public.batch_financials for all to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy settings_operations on public.organization_settings for all to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy snapshots_owner on public.hpp_snapshots for all to authenticated
  using (organization_id = public.current_org_id() and public.is_owner())
  with check (organization_id = public.current_org_id() and public.is_owner());
create policy audits_owner_read on public.audit_logs for select to authenticated
  using (organization_id = public.current_org_id() and public.is_owner());

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_owner() from public, anon;
revoke all on function public.create_batch(uuid, text, text, date, jsonb, jsonb) from public, anon;
revoke all on function public.patch_batch_full(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.finalize_batch(uuid, jsonb) from public, anon;
revoke all on function public.reopen_batch(uuid, text) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.create_batch(uuid, text, text, date, jsonb, jsonb) to authenticated;
grant execute on function public.patch_batch_full(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.finalize_batch(uuid, jsonb) to authenticated;
grant execute on function public.reopen_batch(uuid, text) to authenticated;

commit;
