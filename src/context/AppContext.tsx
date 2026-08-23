import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { BatchInfo, EmployeeAccountInput, FishRecord, HppCalculationResult, LoinItem, PackagingPrices, UserProfile } from '../types';
import { getJakartaDateString } from '../utils/calculations';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  createBatch, createEmployeeAccount, createFish, finalizeBatchRecord, loadProfile, loadWorkspace,
  removeAllWipBatches, removeBatch, removeFish, reopenBatchRecord,
  savePackagingPrices, updateBatchRecord, updateFish
} from '../lib/repository';
import { normalizeUsername, usernameToInternalEmail, validateUsername } from '../lib/username';

type SyncState = 'idle' | 'loading' | 'saving' | 'error';

interface AppContextType {
  isConfigured: boolean;
  session: Session | null;
  profile: UserProfile | null;
  authLoading: boolean;
  dataLoading: boolean;
  syncState: SyncState;
  syncMessage: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, displayName: string, organizationName: string) => Promise<string>;
  createEmployee: (input: EmployeeAccountInput) => Promise<void>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
  canViewHpp: boolean;
  canManageFinancials: boolean;
  batches: BatchInfo[];
  activeBatchId: string;
  setActiveBatchId: (id: string) => void;
  activeBatch: BatchInfo;
  fishRecords: FishRecord[];
  activeBatchFish: FishRecord[];
  packagingPrices: PackagingPrices;
  updatePackagingPrices: (updated: Partial<PackagingPrices>) => Promise<void>;
  activeTab: 'masuk' | 'proses' | 'hpp';
  setActiveTab: (tab: 'masuk' | 'proses' | 'hpp') => void;
  showPackagingModal: boolean;
  openPackagingModal: () => void;
  closePackagingModal: () => void;
  addBatch: (batch: BatchInfo) => Promise<void>;
  updateBatch: (id: string, updated: Partial<BatchInfo>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  addFishRecord: (data: Omit<FishRecord, 'id'>) => Promise<void>;
  updateFishRecord: (id: string, updated: Partial<FishRecord>) => Promise<void>;
  updateFishLoins: (id: string, loins: LoinItem[], status?: 'pending' | 'done') => Promise<void>;
  deleteFishRecord: (id: string) => Promise<void>;
  finalizeBatch: (id: string, hpp: HppCalculationResult) => Promise<void>;
  reopenBatch: (id: string, reason: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const defaultPackagingPrices: PackagingPrices = {
  esBalok: 25000,
  styrofoamBox: 102500,
  jellyIceLusin: 300,
  plastikLayer: 500,
  plastikStyrofoam: 800,
  lakbanRoll: 100000,
  alokasiPlastikLoinPerKg: 300,
  tetelanPricePerKg: 25000,
  tulangPricePerKg: 3000,
  customMaterials: []
};

const emptyBatch: BatchInfo = {
  id: '',
  code: '',
  nelayan: 'Belum ada batch',
  tanggal: getJakartaDateString(),
  lifecycleStatus: 'WIP',
  hargaBeliGradeA: 50000,
  hargaBeliGradeB: 46000,
  hargaBeliGradeC: 43000,
  biayaArmada: 0,
  tarifKargoPerKgLoin: 31000,
  hargaJualLoinA: 150000,
  hargaJualLoinB: 135000,
  hargaJualLoinC: 120000
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function newUuid(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [fishRecords, setFishRecords] = useState<FishRecord[]>([]);
  const [packagingPrices, setPackagingPrices] = useState<PackagingPrices>(defaultPackagingPrices);
  const [activeBatchId, setActiveBatchId] = useState('');
  const [activeTab, setActiveTab] = useState<'masuk' | 'proses' | 'hpp'>('masuk');
  const [showPackagingModal, setShowPackagingModal] = useState(false);

  const hydrate = useCallback(async (activeSession: Session) => {
    setDataLoading(true);
    setSyncState('loading');
    setSyncMessage(null);
    try {
      const userProfile = await loadProfile(activeSession.user);
      const workspace = await loadWorkspace(userProfile, defaultPackagingPrices);
      setProfile(userProfile);
      setBatches(workspace.batches);
      setFishRecords(workspace.fishRecords);
      setPackagingPrices(workspace.packagingPrices);
      setActiveBatchId(current => workspace.batches.some(batch => batch.id === current)
        ? current
        : workspace.batches[0]?.id || '');
      setSyncState('idle');
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Gagal memuat data Supabase.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setSyncMessage(error.message);
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) void hydrate(data.session);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession) void hydrate(nextSession);
      else {
        setProfile(null);
        setBatches([]);
        setFishRecords([]);
        setActiveBatchId('');
      }
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [hydrate]);

  const activeBatch = useMemo(
    () => batches.find(batch => batch.id === activeBatchId) || batches[0] || emptyBatch,
    [batches, activeBatchId]
  );
  const activeBatchFish = useMemo(
    () => fishRecords.filter(fish => fish.batchId === activeBatch.id),
    [fishRecords, activeBatch.id]
  );
  const canManageFinancials = profile?.role === 'owner' || profile?.role === 'manager';
  const canViewHpp = canManageFinancials;

  const runMutation = useCallback(async (operation: () => Promise<void>, successMessage: string) => {
    if (!session) throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    setSyncState('saving');
    setSyncMessage(null);
    try {
      await operation();
      setSyncState('idle');
      setSyncMessage(successMessage);
      window.setTimeout(() => setSyncMessage(current => current === successMessage ? null : current), 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Perubahan gagal disimpan.';
      setSyncState('error');
      setSyncMessage(message);
      await hydrate(session);
      throw error;
    }
  }, [hydrate, session]);

  const signIn = async (username: string, password: string) => {
    if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
    const validationError = validateUsername(username);
    if (validationError) throw new Error(validationError);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToInternalEmail(username),
      password
    });
    if (error) throw new Error('Username atau password salah. Periksa kembali lalu coba lagi.');
  };

  const signUp = async (username: string, password: string, displayName: string, organizationName: string) => {
    if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
    const normalizedUsername = normalizeUsername(username);
    const validationError = validateUsername(normalizedUsername);
    if (validationError) throw new Error(validationError);
    if (password.length < 10 || password.length > 128) throw new Error('Password harus 10–128 karakter.');
    if (displayName.trim().length < 2 || displayName.trim().length > 120) throw new Error('Nama pengguna harus 2–120 karakter.');
    if (organizationName.trim().length < 2 || organizationName.trim().length > 120) throw new Error('Nama organisasi harus 2–120 karakter.');
    const { data, error } = await supabase.auth.signUp({
      email: usernameToInternalEmail(normalizedUsername),
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: displayName.trim(),
          organization_name: organizationName.trim()
        }
      }
    });
    if (error) throw new Error(error.message.toLowerCase().includes('already')
      ? 'Username sudah digunakan. Pilih username lain.'
      : 'Akun owner gagal dibuat. Periksa data lalu coba lagi.');
    if (!data.session) {
      throw new Error('Konfirmasi email Supabase masih aktif. Nonaktifkan Confirm Email karena sistem ini memakai username.');
    }
    return 'Akun owner berhasil dibuat dan Anda sudah masuk.';
  };

  const createEmployee = async (input: EmployeeAccountInput) => {
    if (profile?.role !== 'owner') throw new Error('Hanya owner dapat membuat akun pegawai.');
    await runMutation(() => createEmployeeAccount(input), `Akun @${normalizeUsername(input.username)} berhasil dibuat.`);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  };

  const retrySync = async () => {
    if (session) await hydrate(session);
  };

  const addBatch = async (input: BatchInfo) => {
    if (!profile) throw new Error('Profil organisasi belum tersedia.');
    if (!canManageFinancials) throw new Error('Hanya owner/manager dapat membuat batch baru.');
    const batch: BatchInfo = {
      ...input,
      id: newUuid(),
      code: input.code || input.id,
      organizationId: profile.organizationId,
      lifecycleStatus: 'WIP',
      version: 1
    };
    setBatches(previous => [batch, ...previous]);
    setActiveBatchId(batch.id);
    await runMutation(() => createBatch(profile, batch), 'Batch tersimpan di Supabase.');
  };

  const updateBatch = async (id: string, updated: Partial<BatchInfo>) => {
    if (!profile) throw new Error('Profil organisasi belum tersedia.');
    const current = batches.find(batch => batch.id === id);
    if (current?.lifecycleStatus === 'FINAL') throw new Error('Batch FINAL terkunci. Reopen batch sebelum mengubah data.');
    setBatches(previous => previous.map(batch => batch.id === id ? { ...batch, ...updated } : batch));
    await runMutation(() => updateBatchRecord(profile, id, updated), 'Perubahan batch tersimpan.');
  };

  const deleteBatch = async (id: string) => {
    const current = batches.find(batch => batch.id === id);
    if (current?.lifecycleStatus === 'FINAL') throw new Error('Batch FINAL tidak dapat dihapus.');
    setBatches(previous => previous.filter(batch => batch.id !== id));
    setFishRecords(previous => previous.filter(fish => fish.batchId !== id));
    setActiveBatchId(previous => previous === id ? batches.find(batch => batch.id !== id)?.id || '' : previous);
    await runMutation(() => removeBatch(id), 'Batch WIP dihapus.');
  };

  const addFishRecord = async (data: Omit<FishRecord, 'id'>) => {
    if (!profile) throw new Error('Profil organisasi belum tersedia.');
    if (activeBatch.lifecycleStatus === 'FINAL') throw new Error('Batch FINAL terkunci.');
    const fish: FishRecord = { ...data, id: newUuid() };
    setFishRecords(previous => [...previous, fish]);
    await runMutation(() => createFish(profile, fish), 'Data ikan tersimpan.');
  };

  const updateFishRecord = async (id: string, updated: Partial<FishRecord>) => {
    if (activeBatch.lifecycleStatus === 'FINAL') throw new Error('Batch FINAL terkunci.');
    setFishRecords(previous => previous.map(fish => fish.id === id ? { ...fish, ...updated } : fish));
    await runMutation(() => updateFish(id, updated), 'Data ikan diperbarui.');
  };

  const updateFishLoins = async (id: string, loins: LoinItem[], status: 'pending' | 'done' = 'done') => {
    await updateFishRecord(id, { loins, status });
  };

  const deleteFishRecord = async (id: string) => {
    if (activeBatch.lifecycleStatus === 'FINAL') throw new Error('Batch FINAL terkunci.');
    setFishRecords(previous => previous.filter(fish => fish.id !== id));
    await runMutation(() => removeFish(id), 'Data ikan dihapus.');
  };

  const updatePackagingPrices = async (updated: Partial<PackagingPrices>) => {
    if (!profile || !canManageFinancials) throw new Error('Hanya owner/manager dapat mengubah harga kemasan.');
    const next = { ...packagingPrices, ...updated };
    setPackagingPrices(next);
    await runMutation(() => savePackagingPrices(profile, next), 'Master harga kemasan tersimpan.');
  };

  const finalizeBatch = async (id: string, hpp: HppCalculationResult) => {
    if (!canManageFinancials) throw new Error('Hanya owner/manager dapat finalisasi.');
    if (!hpp.isFinalizable) throw new Error(hpp.finalizationIssues.join('. '));
    await runMutation(() => finalizeBatchRecord(id, hpp), 'Batch berhasil difinalisasi dan dikunci.');
    if (session) await hydrate(session);
  };

  const reopenBatch = async (id: string, reason: string) => {
    if (!canManageFinancials) throw new Error('Hanya owner/manager dapat reopen batch.');
    await runMutation(() => reopenBatchRecord(id, reason), 'Batch dibuka kembali dengan audit reason.');
    if (session) await hydrate(session);
  };

  const clearAllData = async () => {
    if (!profile || !canManageFinancials) throw new Error('Hanya owner/manager dapat menghapus batch WIP.');
    await runMutation(() => removeAllWipBatches(profile.organizationId), 'Semua batch WIP dihapus. Batch FINAL tetap aman.');
    if (session) await hydrate(session);
  };

  return (
    <AppContext.Provider value={{
      isConfigured: isSupabaseConfigured, session, profile, authLoading, dataLoading, syncState, syncMessage,
      signIn, signUp, createEmployee, signOut, retrySync, canViewHpp, canManageFinancials,
      batches, activeBatchId, setActiveBatchId, activeBatch, fishRecords, activeBatchFish,
      packagingPrices, updatePackagingPrices, activeTab, setActiveTab,
      showPackagingModal, openPackagingModal: () => setShowPackagingModal(true),
      closePackagingModal: () => setShowPackagingModal(false),
      addBatch, updateBatch, deleteBatch, addFishRecord, updateFishRecord, updateFishLoins,
      deleteFishRecord, finalizeBatch, reopenBatch, clearAllData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
