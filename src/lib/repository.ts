import type { User } from '@supabase/supabase-js';
import type {
  AppRole,
  BatchInfo,
  EmployeeAccountInput,
  FishRecord,
  HppCalculationResult,
  PackagingPrices,
  UserProfile
} from '../types';
import { requireSupabase } from './supabase';

const financialKeys: Array<keyof BatchInfo> = [
  'hargaBeliGradeA', 'hargaBeliGradeB', 'hargaBeliGradeC', 'biayaArmada',
  'hargaEsBalok', 'hargaStyrofoamBox', 'hargaJellyIceLusin',
  'hargaPlastikLayer', 'hargaPlastikStyrofoam', 'hargaLakbanRoll',
  'hargaPlastikLoinPerKg', 'customMaterials', 'tarifKargoPerKgLoin',
  'hargaTetelanPerKg', 'hargaTulangPerKg', 'hargaJualLoinA',
  'hargaJualLoinB', 'hargaJualLoinC'
];

const operationalKeys: Array<keyof BatchInfo> = [
  'jmlEsBalok', 'jmlStyrofoamBox', 'jmlJellyIceLusin', 'jmlPlastikLayer',
  'jmlPlastikStyrofoam', 'jmlLakbanRoll', 'tetelanKg', 'tulangKg'
];

function pickBatchFields(batch: Partial<BatchInfo>, keys: Array<keyof BatchInfo>) {
  return keys.reduce<Record<string, unknown>>((result, key) => {
    if (batch[key] !== undefined) result[key] = batch[key];
    return result;
  }, {});
}

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export interface WorkspaceData {
  batches: BatchInfo[];
  fishRecords: FishRecord[];
  packagingPrices: PackagingPrices;
}

export async function loadProfile(user: User): Promise<UserProfile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('organization_members')
    .select('organization_id, role, username, display_name, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  assertNoError(error, 'Gagal memuat profil pengguna.');
  if (!data) throw new Error('Akun belum terhubung ke organisasi. Hubungi owner organisasi.');
  const organization = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;
  return {
    id: user.id,
    organizationId: data.organization_id,
    organizationName: (organization as { name?: string } | null)?.name || 'KTG Tuna',
    displayName: data.display_name || data.username || 'Pengguna',
    role: data.role as AppRole,
    username: data.username
  };
}

export async function createEmployeeAccount(input: EmployeeAccountInput): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('create-employee', { body: input });
  if (error) {
    let serverMessage = data?.message as string | undefined;
    const response = (error as { context?: Response }).context;
    if (!serverMessage && response) {
      try {
        const payload = await response.clone().json() as { message?: string };
        serverMessage = payload.message;
      } catch {
        // Response non-JSON tetap dipetakan ke pesan aman di bawah.
      }
    }
    throw new Error(serverMessage || 'Layanan akun tidak dapat dihubungi. Coba lagi atau periksa deployment Edge Function.');
  }
  if (!data?.ok) throw new Error(data?.message || 'Akun pegawai gagal dibuat.');
}

export async function loadWorkspace(profile: UserProfile, defaults: PackagingPrices): Promise<WorkspaceData> {
  const client = requireSupabase();
  const canReadFinancials = profile.role === 'owner' || profile.role === 'manager';
  const [batchResult, fishResult, settingsResult, financialResult] = await Promise.all([
    client.from('batches').select('*').eq('organization_id', profile.organizationId).order('batch_date', { ascending: false }),
    client.from('fish_records').select('*').eq('organization_id', profile.organizationId).order('no_ikan'),
    canReadFinancials
      ? client.from('organization_settings').select('packaging_prices').eq('organization_id', profile.organizationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canReadFinancials
      ? client.from('batch_financials').select('batch_id, financial_data').eq('organization_id', profile.organizationId)
      : Promise.resolve({ data: [], error: null })
  ]);

  assertNoError(batchResult.error, 'Gagal memuat batch.');
  assertNoError(fishResult.error, 'Gagal memuat ikan.');
  assertNoError(settingsResult.error, 'Gagal memuat pengaturan biaya.');
  assertNoError(financialResult.error, 'Gagal memuat data finansial.');

  const financeByBatch = new Map<string, Record<string, unknown>>(
    (financialResult.data || []).map((row: any) => [row.batch_id, row.financial_data || {}])
  );

  const batches: BatchInfo[] = (batchResult.data || []).map((row: any) => ({
    id: row.id,
    code: row.code,
    organizationId: row.organization_id,
    nelayan: row.nelayan,
    tanggal: row.batch_date,
    lifecycleStatus: row.status,
    finalizedAt: row.finalized_at || undefined,
    finalizedBy: row.finalized_by || undefined,
    version: Number(row.version || 1),
    hargaBeliGradeA: 0,
    hargaBeliGradeB: 0,
    hargaBeliGradeC: 0,
    biayaArmada: 0,
    hargaJualLoinA: 0,
    hargaJualLoinB: 0,
    hargaJualLoinC: 0,
    ...(row.operational_data || {}),
    ...(financeByBatch.get(row.id) || {})
  }));

  const fishRecords: FishRecord[] = (fishResult.data || []).map((row: any) => ({
    id: row.id,
    batchId: row.batch_id,
    noIkan: Number(row.no_ikan),
    kodeIkan: row.fish_code,
    beratUtuh: Number(row.whole_weight_kg),
    gradeNota: row.purchase_grade,
    gradePotong: row.cut_grade || undefined,
    status: row.status,
    loins: Array.isArray(row.loins) ? row.loins : [],
    tetelanKg: Number(row.tetelan_kg || 0),
    notes: row.notes || ''
  }));

  return {
    batches,
    fishRecords,
    packagingPrices: canReadFinancials
      ? { ...defaults, ...((settingsResult.data as any)?.packaging_prices || {}) }
      : { ...defaults }
  };
}

export async function createBatch(profile: UserProfile, batch: BatchInfo): Promise<void> {
  const client = requireSupabase();
  if (profile.role === 'staff') throw new Error('Hanya owner/manager dapat membuat batch baru.');
  const { error } = await client.rpc('create_batch', {
    p_batch_id: batch.id,
    p_code: batch.code || batch.id,
    p_nelayan: batch.nelayan,
    p_batch_date: batch.tanggal,
    p_operational: pickBatchFields(batch, operationalKeys),
    p_financial: pickBatchFields(batch, financialKeys)
  });
  assertNoError(error, 'Gagal membuat batch.');
}

export async function updateBatchRecord(profile: UserProfile, id: string, updated: Partial<BatchInfo>): Promise<void> {
  const client = requireSupabase();
  const operational = pickBatchFields(updated, operationalKeys);
  const batchPatch: Record<string, unknown> = {};
  if (updated.code !== undefined) batchPatch.code = updated.code;
  if (updated.nelayan !== undefined) batchPatch.nelayan = updated.nelayan;
  if (updated.tanggal !== undefined) batchPatch.batch_date = updated.tanggal;
  if (Object.keys(operational).length) batchPatch.operational_data = operational;
  const financial = pickBatchFields(updated, financialKeys);
  if (Object.keys(financial).length && profile.role === 'staff') throw new Error('Anda tidak memiliki izin mengubah data finansial.');
  if (!Object.keys(batchPatch).length && !Object.keys(financial).length) return;
  const { error } = await client.rpc('patch_batch_full', {
    p_batch_id: id,
    p_batch_patch: batchPatch,
    p_financial_patch: financial
  });
  assertNoError(error, 'Gagal memperbarui batch secara atomik.');
}

export async function removeBatch(id: string): Promise<void> {
  const { error } = await requireSupabase().from('batches').delete().eq('id', id);
  assertNoError(error, 'Gagal menghapus batch.');
}

export async function removeAllWipBatches(organizationId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('batches')
    .delete()
    .eq('organization_id', organizationId)
    .eq('status', 'WIP');
  assertNoError(error, 'Gagal menghapus batch WIP. Batch FINAL tetap dipertahankan.');
}

export async function createFish(profile: UserProfile, fish: FishRecord): Promise<void> {
  const { error } = await requireSupabase().from('fish_records').insert({
    id: fish.id,
    organization_id: profile.organizationId,
    batch_id: fish.batchId,
    no_ikan: fish.noIkan,
    fish_code: fish.kodeIkan,
    whole_weight_kg: fish.beratUtuh,
    purchase_grade: fish.gradeNota,
    cut_grade: fish.gradePotong || null,
    status: fish.status,
    loins: fish.loins,
    tetelan_kg: fish.tetelanKg || 0,
    notes: fish.notes || ''
  });
  assertNoError(error, 'Gagal menyimpan ikan.');
}

export async function updateFish(id: string, updated: Partial<FishRecord>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updated.noIkan !== undefined) patch.no_ikan = updated.noIkan;
  if (updated.kodeIkan !== undefined) patch.fish_code = updated.kodeIkan;
  if (updated.beratUtuh !== undefined) patch.whole_weight_kg = updated.beratUtuh;
  if (updated.gradeNota !== undefined) patch.purchase_grade = updated.gradeNota;
  if (updated.gradePotong !== undefined) patch.cut_grade = updated.gradePotong;
  if (updated.status !== undefined) patch.status = updated.status;
  if (updated.loins !== undefined) patch.loins = updated.loins;
  if (updated.tetelanKg !== undefined) patch.tetelan_kg = updated.tetelanKg;
  if (updated.notes !== undefined) patch.notes = updated.notes;
  const { error } = await requireSupabase().from('fish_records').update(patch).eq('id', id);
  assertNoError(error, 'Gagal memperbarui ikan.');
}

export async function removeFish(id: string): Promise<void> {
  const { error } = await requireSupabase().from('fish_records').delete().eq('id', id);
  assertNoError(error, 'Gagal menghapus ikan.');
}

export async function savePackagingPrices(profile: UserProfile, prices: PackagingPrices): Promise<void> {
  if (profile.role === 'staff') throw new Error('Anda tidak memiliki izin mengubah harga kemasan.');
  const { error } = await requireSupabase().from('organization_settings').upsert({
    organization_id: profile.organizationId,
    packaging_prices: prices,
    updated_by: profile.id
  });
  assertNoError(error, 'Gagal menyimpan master harga kemasan.');
}

export async function finalizeBatchRecord(id: string, hpp: HppCalculationResult): Promise<void> {
  const snapshot = {
    calculated_at: new Date().toISOString(),
    batch_status: hpp.batchStatus,
    gross_cost_pool: hpp.grossCostPool,
    net_cost_pool: hpp.netCostPool,
    saleable_loin_kg: hpp.saleableLoinKg,
    blended_landed_hpp_per_kg: hpp.blendedLandedHppPerKg,
    total_revenue: hpp.totalRevenueBatch,
    gross_profit: hpp.totalLabaKotorBatch,
    reconciliation: hpp.reconciliation,
    finalization_issues: hpp.finalizationIssues
  };
  const { error } = await requireSupabase().rpc('finalize_batch', { p_batch_id: id, p_snapshot: snapshot });
  assertNoError(error, 'Finalisasi batch gagal.');
}

export async function reopenBatchRecord(id: string, reason: string): Promise<void> {
  const { error } = await requireSupabase().rpc('reopen_batch', { p_batch_id: id, p_reason: reason.trim() });
  assertNoError(error, 'Gagal membuka kembali batch.');
}
