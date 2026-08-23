import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getJakartaDateString } from '../utils/calculations';
import { Fish, Inbox, Scissors, Calculator, Plus, RotateCcw, Ship, Lock, Package, LogOut } from 'lucide-react';

export const SimpleNavbar: React.FC = () => {
  const {
    batches,
    activeBatchId,
    setActiveBatchId,
    activeTab,
    setActiveTab,
    addBatch,
    activeBatchFish,
    canViewHpp,
    canManageFinancials,
    profile,
    signOut,
    clearAllData,
    openPackagingModal
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nelayanName, setNelayanName] = useState('');
  const [batchCode, setBatchCode] = useState(`BATCH-${getJakartaDateString().replace(/-/g, '')}-01`);

  const addModalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addModalRef = useRef<HTMLDivElement | null>(null);
  const resetModalRef = useRef<HTMLDivElement | null>(null);
  const nelayanInputRef = useRef<HTMLInputElement | null>(null);

  // Focus trap and Escape key listener for Modals
  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => nelayanInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowAddModal(false);
          addModalTriggerRef.current?.focus();
        } else if (e.key === 'Tab' && addModalRef.current) {
          const focusable = addModalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (showResetConfirm) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowResetConfirm(false);
          resetTriggerRef.current?.focus();
        } else if (e.key === 'Tab' && resetModalRef.current) {
          const focusable = resetModalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showResetConfirm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nelayanName.trim()) return;

    // Unique batch ID generated
    const existingIds = new Set(batches.map(b => b.id));
    let finalId = batchCode.trim() || `BATCH-${getJakartaDateString().replace(/-/g, '')}`;
    if (existingIds.has(finalId)) {
      finalId = `${finalId}-${Date.now().toString().slice(-4)}`;
    }

    setIsSubmitting(true);
    try {
      await addBatch({
      id: finalId,
      nelayan: nelayanName.trim(),
      tanggal: getJakartaDateString(),
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      hargaBeliGradeA: 50000,
      biayaArmada: 300000,
      biayaKemasanPerKgLoin: 5000,
      tarifKargoPerKgLoin: 31000,
      kreditByProductPerKgLoin: 11240,
      tetelanKg: 0,
      tulangKg: 0,
      hargaTetelanPerKg: 25000,
      hargaTulangPerKg: 3000,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000,
      hargaJualLoinA: 150000
      });
      setShowAddModal(false);
      setNelayanName('');
      addModalTriggerRef.current?.focus();
    } catch {
      // Error ditampilkan oleh banner sinkronisasi global.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsSubmitting(true);
    try {
      await clearAllData();
      setShowResetConfirm(false);
      resetTriggerRef.current?.focus();
    } catch {
      // Error ditampilkan oleh banner sinkronisasi global.
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishedCount = (activeBatchFish || []).filter(f => f.status === 'done').length;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg no-print">
      <div className="max-w-5xl mx-auto px-2.5 sm:px-6">

        {/* Top Row: App Brand & Quick Actions */}
        <div className="flex items-center justify-between py-2.5 gap-2">

          {/* Logo & Title — compact on mobile */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 shrink-0"
              aria-hidden="true"
            >
              <Fish className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-white">KTG TUNA</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shrink-0">
                  OPS
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">Timbang Masuk &bull; Meja Potong &bull; Hitung Laba</p>
            </div>
          </div>

          {/* Top Actions: Nelayan Selector, Packaging Entry, & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Nelayan Switcher */}
            <div className="relative flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs min-h-[44px]">
              <Ship className="w-4 h-4 text-cyan-400 shrink-0 mr-1.5" aria-hidden="true" />
              <label htmlFor="batch-select" className="sr-only">Pilih Nelayan atau Batch</label>
              <select
                id="batch-select"
                value={activeBatchId}
                onChange={(e) => setActiveBatchId(e.target.value)}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs max-w-[95px] sm:max-w-[180px] truncate touch-manipulation"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.nelayan} · {b.code || b.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            {/* Packaging / Kemasan Button (Accessible by Employees without HPP password) */}
            <button
              onClick={openPackagingModal}
              disabled={batches.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-40 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all shadow-sm touch-manipulation focus-ring min-h-[44px]"
              aria-label="Catat Pemakaian & Biaya Kemasan Batch"
              title="Catat Pemakaian & Biaya Kemasan Batch"
            >
              <Package className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Kemasan</span>
            </button>

            {/* Add New Batch Button */}
            <button
              ref={addModalTriggerRef}
              disabled={!canManageFinancials}
              onClick={() => {
                setNelayanName('');
                setBatchCode(`BATCH-${getJakartaDateString().replace(/-/g, '')}-${String(batches.length + 1).padStart(2, '0')}`);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/30 touch-manipulation focus-ring min-h-[44px]"
              aria-label="Tambah Nelayan atau Kapal Baru"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nelayan Baru</span>
            </button>

            {/* Reset Data Button */}
            <button
              ref={resetTriggerRef}
              onClick={() => setShowResetConfirm(true)}
              disabled={!canManageFinancials || batches.every(batch => batch.lifecycleStatus === 'FINAL')}
              className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 rounded-xl text-xs transition-colors touch-manipulation focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Reset atau Kosongkan Data"
              title="Kosongkan Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden sm:flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white focus-ring"
              aria-label={`Keluar dari akun ${profile?.displayName || ''}`}
              title="Keluar"
            >
              <span className="max-w-[110px] truncate">
                <span className="block font-bold">{profile?.displayName || 'Pengguna'}</span>
                <span className="block text-[10px] uppercase text-cyan-400">{profile?.role}</span>
              </span>
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

        </div>

        {/* Desktop Step Navigation Tabs */}
        <nav aria-label="Langkah Alur Kerja" className="hidden sm:grid grid-cols-3 gap-2 pb-3 pt-1">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border touch-manipulation focus-ring min-h-[44px] ${
              activeTab === 'masuk'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            aria-current={activeTab === 'masuk' ? 'step' : undefined}
          >
            <Inbox className="w-4 h-4" />
            <span>1. Timbang Ikan Masuk</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-cyan-300 ml-1 font-mono font-bold">
              {activeBatchFish.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('proses')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border touch-manipulation focus-ring min-h-[44px] ${
              activeTab === 'proses'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            aria-current={activeTab === 'proses' ? 'step' : undefined}
          >
            <Scissors className="w-4 h-4" />
            <span>2. Meja Potong (Loin)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-300 ml-1 font-mono font-bold">
              {finishedCount}/{activeBatchFish.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hpp')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border touch-manipulation focus-ring min-h-[44px] ${
              activeTab === 'hpp'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            aria-current={activeTab === 'hpp' ? 'step' : undefined}
          >
            {canViewHpp ? <Calculator className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-400" />}
            <span>3. Hitung HPP & Laba</span>
            {!canViewHpp && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 ml-1">
                Kunci
              </span>
            )}
          </button>
        </nav>

      </div>

      {/* Modal: Tambah Nelayan / Batch Baru */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nelayan-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              addModalTriggerRef.current?.focus();
            }
          }}
        >
          <div ref={addModalRef} className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in">
            <h2 id="modal-nelayan-title" className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Ship className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Tambah Kapal / Nelayan Baru
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              Buat kelompok timbangan baru untuk kapal atau supplier ikan hari ini.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="nelayan-name" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nama Nelayan / Nama Kapal:
                </label>
                <input
                  ref={nelayanInputRef}
                  id="nelayan-name"
                  type="text"
                  required
                  placeholder="Contoh: KM Bahari 08 / Bang Hasan"
                  value={nelayanName}
                  onChange={(e) => setNelayanName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white focus-ring min-h-[48px]"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="batch-code" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Kode Batch Tampilan:
                </label>
                <input
                  id="batch-code"
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-cyan-300 font-mono focus-ring tabular-nums min-h-[48px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    addModalTriggerRef.current?.focus();
                  }}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors focus-ring min-h-[48px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-600/30 focus-ring min-h-[48px]"
                >
                  {isSubmitting ? 'Menyimpan…' : 'Buat Batch Ini'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Kosongkan / Reset Data */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reset-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowResetConfirm(false);
              resetTriggerRef.current?.focus();
            }
          }}
        >
          <div ref={resetModalRef} className="bg-slate-900 border-t sm:border border-rose-600/50 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in">
            <h2 id="modal-reset-title" className="text-base sm:text-lg font-bold text-rose-400 mb-1">
              ⚠️ Kosongkan Semua Data?
            </h2>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Tindakan ini akan menghapus semua daftar timbangan ikan dan mengembalikan data ke kondisi awal. Pastikan Anda sudah mencatat atau mengunduh laporan Excel sebelumnya.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  resetTriggerRef.current?.focus();
                }}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors focus-ring min-h-[48px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isSubmitting}
                className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-rose-600/30 focus-ring min-h-[48px]"
              >
                {isSubmitting ? 'Menghapus…' : 'Ya, Hapus Batch WIP'}
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
