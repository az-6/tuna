import React, { createContext, useContext, useState, useEffect } from 'react';
import { BatchInfo, FishRecord, LoinItem, PackagingPrices } from '../types';

interface AppContextType {
  batches: BatchInfo[];
  activeBatchId: string;
  setActiveBatchId: (id: string) => void;
  activeBatch: BatchInfo;
  
  fishRecords: FishRecord[];
  activeBatchFish: FishRecord[];
  
  packagingPrices: PackagingPrices;
  updatePackagingPrices: (updated: Partial<PackagingPrices>) => void;

  activeTab: 'masuk' | 'proses' | 'hpp';
  setActiveTab: (tab: 'masuk' | 'proses' | 'hpp') => void;

  // HPP Password & Security
  isHppUnlocked: boolean;
  unlockHpp: (password: string) => boolean;
  lockHpp: () => void;
  hppPassword: string;
  setHppPassword: (newPass: string) => void;

  // Global Packaging Modal State
  showPackagingModal: boolean;
  openPackagingModal: () => void;
  closePackagingModal: () => void;

  // Actions
  addBatch: (batch: BatchInfo) => void;
  updateBatch: (id: string, updated: Partial<BatchInfo>) => void;
  deleteBatch: (id: string) => void;

  addFishRecord: (data: Omit<FishRecord, 'id'>) => void;
  updateFishRecord: (id: string, updated: Partial<FishRecord>) => void;
  updateFishLoins: (id: string, loins: LoinItem[], status?: 'pending' | 'done') => void;
  deleteFishRecord: (id: string) => void;

  clearAllData: () => void;
}

export const defaultPackagingPrices: PackagingPrices = {
  esBalok: 25000, // Rp 25.000 / balok
  styrofoamBox: 102500, // Rp 102.500 / box
  jellyIceLusin: 300, // Rp 300 / lusin
  plastikLayer: 500, // Rp 500 / pcs
  plastikStyrofoam: 800, // Rp 800 / pcs
  lakbanRoll: 100000, // Rp 100.000 / roll
  alokasiPlastikLoinPerKg: 300, // Rp 300 / kg loin
  tetelanPricePerKg: 25000, // Rp 25.000 / kg
  tulangPricePerKg: 3000, // Rp 3.000 / kg
  customMaterials: []
};

const defaultBatch: BatchInfo = {
  id: "BATCH-01",
  nelayan: "Kapal Nelayan 01",
  tanggal: new Date().toISOString().slice(0, 10),
  hargaBeliGradeB: 46000,
  hargaBeliGradeC: 43000,
  hargaBeliGradeA: 50000,
  biayaArmada: 300000,
  jmlEsBalok: 10,
  jmlStyrofoamBox: 21,
  jmlJellyIceLusin: 15.75,
  jmlPlastikLayer: 21,
  jmlPlastikStyrofoam: 21,
  jmlLakbanRoll: 0.5,
  biayaKemasanPerKgLoin: 5000,
  tarifKargoPerKgLoin: 31000,
  kreditByProductPerKgLoin: 11240,
  hargaJualLoinB: 135000,
  hargaJualLoinC: 120000,
  hargaJualLoinA: 150000
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batches, setBatches] = useState<BatchInfo[]>(() => {
    const saved = localStorage.getItem('ktg_clean_batches_v2');
    return saved ? JSON.parse(saved) : [defaultBatch];
  });

  const [activeBatchId, setActiveBatchId] = useState<string>(() => {
    return localStorage.getItem('ktg_clean_active_batch_v2') || defaultBatch.id;
  });

  const [fishRecords, setFishRecords] = useState<FishRecord[]>(() => {
    const saved = localStorage.getItem('ktg_clean_fish_v2');
    if (!saved) return [];
    try {
      const parsed: FishRecord[] = JSON.parse(saved);
      // Auto-clean any old legacy parenthesized names like "Loin 1 (Punggung Kiri)"
      return parsed.map(f => ({
        ...f,
        loins: (f.loins || []).map((l, idx) => ({
          ...l,
          name: `Loin ${l.id || idx + 1}`
        }))
      }));
    } catch {
      return [];
    }
  });

  const [packagingPrices, setPackagingPrices] = useState<PackagingPrices>(() => {
    const saved = localStorage.getItem('ktg_packaging_prices_v1');
    return saved ? JSON.parse(saved) : defaultPackagingPrices;
  });

  const [activeTab, setActiveTab] = useState<'masuk' | 'proses' | 'hpp'>('masuk');

  // Password & Security State
  const [isHppUnlocked, setIsHppUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('ktg_hpp_unlocked_v1') === 'true';
  });

  const [hppPassword, setHppPasswordState] = useState<string>(() => {
    return localStorage.getItem('ktg_hpp_password_v1') || 'ktg123';
  });

  const unlockHpp = (entered: string): boolean => {
    if (entered.trim() === hppPassword.trim()) {
      setIsHppUnlocked(true);
      sessionStorage.setItem('ktg_hpp_unlocked_v1', 'true');
      return true;
    }
    return false;
  };

  const lockHpp = () => {
    setIsHppUnlocked(false);
    sessionStorage.removeItem('ktg_hpp_unlocked_v1');
  };

  const setHppPassword = (newPass: string) => {
    setHppPasswordState(newPass.trim());
    localStorage.setItem('ktg_hpp_password_v1', newPass.trim());
  };

  // Global Packaging Modal State
  const [showPackagingModal, setShowPackagingModal] = useState<boolean>(false);
  const openPackagingModal = () => setShowPackagingModal(true);
  const closePackagingModal = () => setShowPackagingModal(false);

  useEffect(() => {
    localStorage.setItem('ktg_clean_batches_v2', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('ktg_clean_active_batch_v2', activeBatchId);
  }, [activeBatchId]);

  useEffect(() => {
    localStorage.setItem('ktg_clean_fish_v2', JSON.stringify(fishRecords));
  }, [fishRecords]);

  useEffect(() => {
    localStorage.setItem('ktg_packaging_prices_v1', JSON.stringify(packagingPrices));
  }, [packagingPrices]);

  const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0] || defaultBatch;
  const activeBatchFish = fishRecords.filter(f => f.batchId === activeBatchId);

  const updatePackagingPrices = (updated: Partial<PackagingPrices>) => {
    setPackagingPrices(prev => ({ ...prev, ...updated }));
  };

  // Batch actions
  const addBatch = (newBatch: BatchInfo) => {
    setBatches(prev => [newBatch, ...prev]);
    setActiveBatchId(newBatch.id);
  };

  const updateBatch = (id: string, updated: Partial<BatchInfo>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
  };

  const deleteBatch = (id: string) => {
    if (batches.length <= 1) {
      alert('Minimal harus ada 1 batch nelayan.');
      return;
    }
    setBatches(prev => prev.filter(b => b.id !== id));
    setFishRecords(prev => prev.filter(f => f.batchId !== id));
    setActiveBatchId(batches.find(b => b.id !== id)?.id || '');
  };

  // Fish actions
  const addFishRecord = (data: Omit<FishRecord, 'id'>) => {
    const newId = `FISH-${Date.now().toString().slice(-4)}-${data.noIkan}`;
    setFishRecords(prev => [...prev, { ...data, id: newId }]);
  };

  const updateFishRecord = (id: string, updated: Partial<FishRecord>) => {
    setFishRecords(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
  };

  const updateFishLoins = (id: string, loins: LoinItem[], status: 'pending' | 'done' = 'done') => {
    setFishRecords(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          loins,
          status
        };
      }
      return f;
    }));
  };

  const deleteFishRecord = (id: string) => {
    setFishRecords(prev => prev.filter(f => f.id !== id));
  };

  const clearAllData = () => {
    if (window.confirm('Kosongkan semua data ikan dan mulai baru?')) {
      setBatches([defaultBatch]);
      setActiveBatchId(defaultBatch.id);
      setFishRecords([]);
      setPackagingPrices(defaultPackagingPrices);
      localStorage.removeItem('ktg_clean_batches_v2');
      localStorage.removeItem('ktg_clean_active_batch_v2');
      localStorage.removeItem('ktg_clean_fish_v2');
      localStorage.removeItem('ktg_packaging_prices_v1');
    }
  };

  return (
    <AppContext.Provider
      value={{
        batches,
        activeBatchId,
        setActiveBatchId,
        activeBatch,
        fishRecords,
        activeBatchFish,
        packagingPrices,
        updatePackagingPrices,
        activeTab,
        setActiveTab,
        isHppUnlocked,
        unlockHpp,
        lockHpp,
        hppPassword,
        setHppPassword,
        showPackagingModal,
        openPackagingModal,
        closePackagingModal,
        addBatch,
        updateBatch,
        deleteBatch,
        addFishRecord,
        updateFishRecord,
        updateFishLoins,
        deleteFishRecord,
        clearAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
