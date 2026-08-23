import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const batchId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid()
    returns uuid language sql stable
    as $$ select nullif(current_setting('app.test_user_id', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);

  const migrationFiles: string[] = [];
  const migrationGlob = new Bun.Glob('supabase/migrations/*.sql');
  for await (const path of migrationGlob.scan({ cwd: process.cwd() })) {
    migrationFiles.push(path);
  }
  migrationFiles.sort();
  for (const path of migrationFiles) {
    const sql = (await Bun.file(path).text()).replace(
      'create extension if not exists pgcrypto;',
      '-- pgcrypto is available on Supabase; PGlite provides gen_random_uuid natively.'
    );
    await db.exec(sql);
  }
  await db.exec(`select set_config('app.test_user_id', '${userId}', false)`);
  await db.exec(`
    insert into auth.users(id, email, raw_user_meta_data)
    values ('${userId}', 'owner@users.ktg.invalid', '{"username":"owner_test","display_name":"Owner Test","organization_name":"KTG Test"}');
  `);

  const employeeId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  await db.exec(`
    insert into auth.users(id, email, raw_user_meta_data)
    values ('${employeeId}', 'pegawai_test@users.ktg.invalid', '{"username":"pegawai_test","display_name":"Pegawai Test","organization_name":"Pending Employee"}');
  `);
  await db.query(
    `select public.provision_employee_account($1::uuid, $2::uuid, $3, $4)`,
    [userId, employeeId, 'pegawai_test', 'Pegawai Test']
  );
  const employee = await db.query<{ role: string; username: string; same_org: boolean }>(`
    select employee.role::text, employee.username,
      employee.organization_id = owner.organization_id same_org
    from public.organization_members employee
    join public.organization_members owner on owner.user_id = $1::uuid
    where employee.user_id = $2::uuid
  `, [userId, employeeId]);
  if (!employee.rows[0] || employee.rows[0].role !== 'staff' || !employee.rows[0].same_org) {
    throw new Error('Provisioning pegawai tidak menghasilkan role staff pada organisasi owner.');
  }

  const cleanupUserId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  await db.exec(`
    insert into auth.users(id, email, raw_user_meta_data)
    values ('${cleanupUserId}', 'cleanup_test@users.ktg.invalid', '{"username":"cleanup_test","display_name":"Cleanup Test","organization_name":"Pending Employee"}');
  `);
  await db.query(`select public.cleanup_provisional_employee($1::uuid)`, [cleanupUserId]);
  const cleanupMembership = await db.query<{ count: number }>(
    'select count(*)::int count from public.organization_members where user_id = $1::uuid',
    [cleanupUserId]
  );
  if (Number(cleanupMembership.rows[0]?.count) !== 0) throw new Error('Cleanup akun provisional tidak membersihkan membership.');

  await db.query(
    `select public.create_batch($1::uuid, $2, $3, $4::date, $5::jsonb, $6::jsonb)`,
    [batchId, 'TEST-001', 'Kapal Integrasi', '2026-08-23', '{}', '{"hargaBeliGradeC":43000}']
  );
  await db.query(
    `insert into public.fish_records(
      id, organization_id, batch_id, no_ikan, fish_code, whole_weight_kg,
      purchase_grade, cut_grade, status, loins
    )
    select $1::uuid, organization_id, id, 1, 'TUNA-001', 100, 'C', 'C', 'done', $2::jsonb
    from public.batches where id = $3::uuid`,
    [
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '[{"id":1,"name":"Loin 1","weight":60,"grade":"C"}]',
      batchId
    ]
  );

  const snapshot = JSON.stringify({
    batch_status: 'FINAL',
    gross_cost_pool: 100,
    net_cost_pool: 80,
    saleable_loin_kg: 60,
    reconciliation: { isReconciled: true },
    finalization_issues: []
  });
  await db.query(`select public.finalize_batch($1::uuid, $2::jsonb)`, [batchId, snapshot]);

  const finalized = await db.query<{ status: string; snapshot_count: number; audit_count: number }>(`
    select b.status::text,
      (select count(*)::int from public.hpp_snapshots where batch_id = b.id) snapshot_count,
      (select count(*)::int from public.audit_logs where row_id = b.id::text and operation = 'FINALIZE') audit_count
    from public.batches b where b.id = $1::uuid
  `, [batchId]);
  const finalRow = finalized.rows[0];
  if (!finalRow || finalRow.status !== 'FINAL' || Number(finalRow.snapshot_count) !== 1 || Number(finalRow.audit_count) !== 1) {
    throw new Error('Finalisasi tidak menghasilkan status, snapshot, dan audit yang diharapkan.');
  }

  let immutableGuardWorked = false;
  try {
    await db.query(`update public.fish_records set whole_weight_kg = 101 where batch_id = $1::uuid`, [batchId]);
  } catch {
    immutableGuardWorked = true;
  }
  if (!immutableGuardWorked) throw new Error('Trigger immutable batch FINAL tidak bekerja.');

  await db.query(`select public.reopen_batch($1::uuid, $2)`, [batchId, 'Koreksi hasil timbang integrasi']);
  const reopened = await db.query<{ status: string; reopen_count: number }>(`
    select b.status::text,
      (select count(*)::int from public.audit_logs where row_id = b.id::text and operation = 'REOPEN') reopen_count
    from public.batches b where b.id = $1::uuid
  `, [batchId]);
  const reopenRow = reopened.rows[0];
  if (!reopenRow || reopenRow.status !== 'WIP' || Number(reopenRow.reopen_count) !== 1) {
    throw new Error('Reopen tidak menghasilkan status dan audit yang diharapkan.');
  }

  await db.exec('set role authenticated');
  const visibleOwnBatch = await db.query<{ count: number }>('select count(*)::int count from public.batches');
  if (Number(visibleOwnBatch.rows[0]?.count) !== 1) throw new Error('RLS tidak menampilkan batch organisasi sendiri.');
  let directBatchUpdateDenied = false;
  try {
    await db.query(`update public.batches set nelayan = 'Bypass' where id = $1::uuid`, [batchId]);
  } catch {
    directBatchUpdateDenied = true;
  }
  if (!directBatchUpdateDenied) throw new Error('Update tabel batch langsung seharusnya ditolak.');
  await db.exec('reset role');

  await db.query(`update public.organization_members set role = 'staff' where user_id = $1::uuid`, [userId]);
  await db.exec('set role authenticated');
  const staffFinancialRows = await db.query<{ count: number }>('select count(*)::int count from public.batch_financials');
  if (Number(staffFinancialRows.rows[0]?.count) !== 0) throw new Error('RLS membuka finansial kepada staff.');
  let staffCreateDenied = false;
  try {
    await db.query(
      `select public.create_batch($1::uuid, 'STAFF-FAIL', 'Tidak Sah', current_date, '{}'::jsonb, '{}'::jsonb)`,
      ['dddddddd-dddd-4ddd-8ddd-dddddddddddd']
    );
  } catch {
    staffCreateDenied = true;
  }
  if (!staffCreateDenied) throw new Error('Staff seharusnya tidak dapat membuat batch finansial baru.');
  await db.exec('reset role');

  console.log('Migration integration: PASS (username, employee provisioning, RPC, RLS roles, FINAL lock, snapshot, audit, reopen)');
} finally {
  await db.close();
}
