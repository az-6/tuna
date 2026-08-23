import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { FishGrade } from '../types';
import { formatKg, formatRupiah, safeNonNegative } from '../utils/calculations';
import { Plus, Trash2, ArrowRight, Ship, Edit3, Save, X, Check, Scale, AlertCircle } from 'lucide-react';

export const Step1IkanMasuk: React.FC = () => {
  const {
    activeBatch,
    activeBatchFish,
    addFishRecord,
    deleteFishRecord,
    setActiveTab,
    updateBatch,
    canManageProduction
  } = useApp();

  // Form State for Fish Entry
  const [beratUtuh, setBeratUtuh] = useState<string>('');
  const [gradeNota, setGradeNota] = useState<FishGrade>('C'); // Default Grade di Nota (Paling umum C)
  const [customKode, setCustomKode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAddedFish, setLastAddedFish] = useState<string | null>(null);

  // Modal / Inline Edit Nelayan & Batch Info
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editNelayan, setEditNelayan] = useState(activeBatch.nelayan);
  const [editTanggal, setEditTanggal] = useState(activeBatch.tanggal);
  const [editHargaA, setEditHargaA] = useState(activeBatch.hargaBeliGradeA || 50000);
  const [editHargaB, setEditHargaB] = useState(activeBatch.hargaBeliGradeB);
  const [editHargaC, setEditHargaC] = useState(activeBatch.hargaBeliGradeC);
  const [editArmada, setEditArmada] = useState(activeBatch.biayaArmada);

  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editModalRef = useRef<HTMLDivElement | null>(null);
  const editFirstInputRef = useRef<HTMLInputElement | null>(null);

  const nextNo = activeBatchFish.length > 0 ? Math.max(...activeBatchFish.map(f => f.noIkan || 0)) + 1 : 1;
  const kodeOtomatis = customKode.trim() || `Tuna Sirip Kuning #${String(nextNo).padStart(3, '0')}`;
  const totalKgIkan = activeBatchFish.reduce((acc, f) => acc + (f.beratUtuh || 0), 0);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (isEditingBatch) {
      setTimeout(() => editFirstInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsEditingBatch(false);
          editTriggerRef.current?.focus();
        } else if (e.key === 'Tab' && editModalRef.current) {
          const focusable = editModalRef.current.querySelectorAll<HTMLElement>(
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
  }, [isEditingBatch]);

  const handleSaveBatchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBatch(activeBatch.id, {
        nelayan: editNelayan.trim() || 'Nelayan Tanpa Nama',
        tanggal: editTanggal,
        hargaBeliGradeA: safeNonNegative(editHargaA, 50000),
        hargaBeliGradeB: safeNonNegative(editHargaB, 46000),
        hargaBeliGradeC: safeNonNegative(editHargaC, 43000),
        biayaArmada: safeNonNegative(editArmada, 0)
      });
      setIsEditingBatch(false);
      editTriggerRef.current?.focus();
    } catch {
      // Error ditampilkan oleh banner sinkronisasi global.
    }
  };

  const handleOpenEdit = () => {
    setEditNelayan(activeBatch.nelayan);
    setEditTanggal(activeBatch.tanggal);
    setEditHargaA(activeBatch.hargaBeliGradeA ?? 50000);
    setEditHargaB(activeBatch.hargaBeliGradeB ?? 46000);
    setEditHargaC(activeBatch.hargaBeliGradeC ?? 43000);
    setEditArmada(activeBatch.biayaArmada ?? 300000);
    setIsEditingBatch(true);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const berat = parseFloat(beratUtuh);
    if (isNaN(berat) || berat <= 0) {
      setErrorMessage('Silakan masukkan berat timbangan ikan yang valid (contoh: 52.5)');
      return;
    }

    setErrorMessage(null);
    try {
      await addFishRecord({
      batchId: activeBatch.id,
      noIkan: nextNo,
      kodeIkan: kodeOtomatis,
      beratUtuh: Math.max(0, berat),
      gradeNota: gradeNota,
      status: 'pending',
      loins: [
        { id: 1, name: "Loin 1", weight: 0, grade: gradeNota },
        { id: 2, name: "Loin 2", weight: 0, grade: gradeNota },
        { id: 3, name: "Loin 3", weight: 0, grade: gradeNota },
        { id: 4, name: "Loin 4", weight: 0, grade: gradeNota }
      ]
      });
    } catch {
      return;
    }

    setLastAddedFish(`Ikan #${nextNo} (${formatKg(berat)} - Grade ${gradeNota}) berhasil disimpan!`);
    setBeratUtuh('');
    setCustomKode('');

    setTimeout(() => {
      setLastAddedFish(null);
    }, 3500);
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-4xl mx-auto">

      {activeBatch.lifecycleStatus === 'FINAL' && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-xs font-semibold text-emerald-200" role="status">
          Batch FINAL terkunci. Reopen dari halaman HPP jika diperlukan koreksi.
        </div>
      )}

      {/* 1. Header Profile: Info Nelayan & Harga Beli */}
      <section
        aria-labelledby="batch-info-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Langkah 1</span>
              <span className="text-[10px] sm:text-xs text-slate-400">&bull; Data Penerimaan</span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <Ship className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" aria-hidden="true" />
              <h1 id="batch-info-heading" className="text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                {activeBatch.nelayan}
              </h1>
              {canManageProduction && activeBatch.lifecycleStatus !== 'FINAL' && <button
                ref={editTriggerRef}
                onClick={handleOpenEdit}
                className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-colors focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="Ubah Nama Nelayan dan Harga Beli"
                title="Ubah Nama Nelayan & Harga Beli"
              >
                <Edit3 className="w-4 h-4" />
              </button>}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5 font-mono">
              <span>{activeBatch.code || activeBatch.id}</span>
              <span>&bull;</span>
              <span>{activeBatch.tanggal}</span>
            </div>
          </div>

          {/* Quick Total KPI Badge */}
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-medium block">Total Masuk</span>
            <span className="text-sm sm:text-base font-black text-cyan-300 font-mono tabular-nums">
              {activeBatchFish.length} <span className="text-[10px] font-normal text-slate-400">ekor</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono block tabular-nums">{formatKg(totalKgIkan)}</span>
          </div>
        </div>

        {/* Harga Beli Info Cards */}
        {canManageProduction ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 text-xs font-mono">
          <div className="bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] sm:text-[11px] block font-sans">Grade A</span>
            <span className="font-bold text-emerald-400 text-xs sm:text-sm tabular-nums">{formatRupiah(activeBatch.hargaBeliGradeA || 50000)}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] sm:text-[11px] block font-sans">Grade B</span>
            <span className="font-bold text-blue-400 text-xs sm:text-sm tabular-nums">{formatRupiah(activeBatch.hargaBeliGradeB)}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] sm:text-[11px] block font-sans">Grade C</span>
            <span className="font-bold text-amber-400 text-xs sm:text-sm tabular-nums">{formatRupiah(activeBatch.hargaBeliGradeC)}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] sm:text-[11px] block font-sans">Armada</span>
            <span className="font-bold text-slate-100 text-xs sm:text-sm tabular-nums">{formatRupiah(activeBatch.biayaArmada)}</span>
          </div>
        </div> : (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            Data harga produksi tidak tersedia.
          </div>
        )}
      </section>

      {/* Modal Edit Nelayan & Batch Info */}
      {isEditingBatch && canManageProduction && activeBatch.lifecycleStatus !== 'FINAL' && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-batch-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditingBatch(false);
              editTriggerRef.current?.focus();
            }
          }}
        >
          <div ref={editModalRef} className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 id="edit-batch-title" className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" aria-hidden="true" />
                Ubah Info Nelayan
              </h2>
              <button
                onClick={() => {
                  setIsEditingBatch(false);
                  editTriggerRef.current?.focus();
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Tutup form edit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchInfo} className="space-y-3.5">
              <div>
                <label htmlFor="edit-nelayan-input" className="block text-xs text-slate-200 font-semibold mb-1.5">
                  Nama Nelayan / Kapal *
                </label>
                <input
                  ref={editFirstInputRef}
                  id="edit-nelayan-input"
                  type="text"
                  placeholder="Contoh: Pak Rudi (KM Samudera Jaya)"
                  value={editNelayan}
                  onChange={(e) => setEditNelayan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white focus-ring font-medium min-h-[48px]"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-tanggal-input" className="block text-xs text-slate-200 font-semibold mb-1.5">Tanggal Kedatangan</label>
                <input
                  id="edit-tanggal-input"
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white focus-ring font-mono tabular-nums min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label htmlFor="edit-harga-a" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga A (Rp/kg)</label>
                  <input
                    id="edit-harga-a"
                    type="number"
                    step="500"
                    min="0"
                    inputMode="numeric"
                    value={editHargaA}
                    onChange={(e) => setEditHargaA(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums min-h-[48px]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-harga-b" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga B (Rp/kg)</label>
                  <input
                    id="edit-harga-b"
                    type="number"
                    step="500"
                    min="0"
                    inputMode="numeric"
                    value={editHargaB}
                    onChange={(e) => setEditHargaB(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums min-h-[48px]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-harga-c" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga C (Rp/kg)</label>
                  <input
                    id="edit-harga-c"
                    type="number"
                    step="500"
                    min="0"
                    inputMode="numeric"
                    value={editHargaC}
                    onChange={(e) => setEditHargaC(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-armada-input" className="block text-xs text-slate-200 font-semibold mb-1.5">Biaya Armada (Rp)</label>
                <input
                  id="edit-armada-input"
                  type="number"
                  step="10000"
                  min="0"
                  inputMode="numeric"
                  value={editArmada}
                  onChange={(e) => setEditArmada(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white font-mono focus-ring tabular-nums min-h-[48px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingBatch(false);
                    editTriggerRef.current?.focus();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors focus-ring min-h-[48px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center justify-center gap-2 focus-ring min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Form Input Cepat Timbang Masuk */}
      <section
        aria-labelledby="input-fish-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            <h2 id="input-fish-heading" className="text-base sm:text-lg font-bold text-white">
              Input Timbangan Ikan Baru
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
            Ikan Ke-#{nextNo}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {lastAddedFish && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{lastAddedFish}</span>
          </div>
        )}

        <form onSubmit={handleAddSingle} className="space-y-4">

          {/* Main Input: Berat Timbangan */}
          <div>
            <label htmlFor="input-berat-utuh" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
              Berat Timbang Utuh (KG) *
            </label>
            <div className="relative">
              <input
                id="input-berat-utuh"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="Contoh: 53.5"
                value={beratUtuh}
                onChange={(e) => {
                  setBeratUtuh(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl pl-4 pr-16 py-3.5 sm:py-4 text-2xl sm:text-3xl font-black text-cyan-300 font-mono focus-ring tabular-nums placeholder:text-slate-400 min-h-[56px]"
                autoFocus
                required
              />
              <span className="absolute right-10 top-4 text-sm font-extrabold text-slate-400 font-mono pointer-events-none">
                KG
              </span>
            </div>
          </div>

          {/* Grade Selector on Nota Purchase */}
          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Grade Beli di Nota Nelayan:
            </span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Grade beli di nota nelayan">
              {(['C', 'B', 'A'] as FishGrade[]).map((g) => {
                const isSelected = gradeNota === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setGradeNota(g)}
                    className={`py-3 px-3 rounded-xl font-bold text-sm transition-all border flex flex-col items-center justify-center gap-0.5 touch-manipulation focus-ring min-h-[54px] ${
                      isSelected
                        ? g === 'A'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 scale-[1.02]'
                          : g === 'B'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 scale-[1.02]'
                            : 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30 scale-[1.02]'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>Grade {g}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {canManageProduction
                        ? (g === 'A' ? formatRupiah(activeBatch.hargaBeliGradeA || 50000) : g === 'B' ? formatRupiah(activeBatch.hargaBeliGradeB) : formatRupiah(activeBatch.hargaBeliGradeC))
                        : 'Pilih mutu nota'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={activeBatch.lifecycleStatus === 'FINAL'}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 text-white font-extrabold rounded-2xl text-base shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[52px]"
          >
            <Plus className="w-5 h-5" />
            <span>Simpan Timbangan (Ikan #{nextNo})</span>
          </button>

        </form>
      </section>

      {/* 3. Daftar Ikan yang Sudah Masuk */}
      <section
        aria-labelledby="fish-list-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 id="fish-list-heading" className="text-base font-bold text-white flex items-center gap-2">
              Daftar Ikan Diterima
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total {activeBatchFish.length} ekor ikan terdaftar pada batch {activeBatch.nelayan}
            </p>
          </div>
          <span className="text-sm font-black text-cyan-300 font-mono tabular-nums">
            {formatKg(totalKgIkan)}
          </span>
        </div>

        {activeBatchFish.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <Scale className="w-10 h-10 text-slate-600 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-slate-300 font-medium">Belum ada timbangan ikan pada batch ini.</p>
            <p className="text-[11px] text-slate-400 mt-1">Masukkan kilogram timbangan di atas untuk mulai mendata.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Visible on < sm screens) */}
            <div className="space-y-2 block sm:hidden">
              {activeBatchFish.map((fish) => {
                const isDone = fish.status === 'done';
                return (
                  <div
                    key={fish.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                        #{fish.noIkan}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-white font-mono block tabular-nums">
                          {formatKg(fish.beratUtuh)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {fish.gradePotong && fish.gradePotong !== fish.gradeNota ? (
                            <span className="text-[10px] font-bold font-mono inline-flex items-center gap-1">
                              <span className="text-slate-400 line-through">
                                {fish.gradeNota}
                              </span>
                              <span className="text-slate-500">&rarr;</span>
                              <span className={fish.gradePotong === 'A' ? 'text-emerald-300' : fish.gradePotong === 'B' ? 'text-blue-300' : 'text-amber-300'}>
                                {fish.gradePotong}
                              </span>
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              fish.gradeNota === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : fish.gradeNota === 'B'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {fish.gradeNota}
                            </span>
                          )}
                          {isDone ? (
                            <span className="text-[10px] font-bold text-emerald-400">✓ Selesai</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Antre</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => void deleteFishRecord(fish.id).catch(() => undefined)}
                      disabled={activeBatch.lifecycleStatus === 'FINAL'}
                      className="p-2 text-slate-500 hover:text-rose-400 active:bg-slate-900 rounded-xl transition-colors focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                      aria-label={`Hapus ikan nomor ${fish.noIkan}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Visible on >= sm screens) */}
            <div className="hidden sm:block overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-slate-950 text-slate-300 uppercase font-semibold sticky top-0 z-10">
                  <tr className="border-b border-slate-800">
                    <th scope="col" className="py-2.5 px-3">No</th>
                    <th scope="col" className="py-2.5 px-3">Kode Ikan</th>
                    <th scope="col" className="py-2.5 px-3">Berat Utuh</th>
                    <th scope="col" className="py-2.5 px-3">Grade Beli & Potong</th>
                    <th scope="col" className="py-2.5 px-3">Status Potong</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeBatchFish.map((fish) => {
                    const isDone = fish.status === 'done';

                    return (
                      <tr key={fish.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-200">#{fish.noIkan}</td>
                        <td className="py-2.5 px-3 text-white font-sans font-semibold">{fish.kodeIkan}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-300 tabular-nums">{formatKg(fish.beratUtuh)}</td>

                        <td className="py-2.5 px-3">
                          {fish.gradePotong && fish.gradePotong !== fish.gradeNota ? (
                            <div className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] font-bold">
                              <span className={`px-1.5 py-0.2 rounded ${
                                fish.gradeNota === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : fish.gradeNota === 'B'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                Grade {fish.gradeNota}
                              </span>
                              <span className="text-slate-400 font-bold">&rarr;</span>
                              <span className={`px-1.5 py-0.2 rounded ${
                                fish.gradePotong === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : fish.gradePotong === 'B'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                Grade {fish.gradePotong}
                              </span>
                            </div>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              fish.gradeNota === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : fish.gradeNota === 'B'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              Grade {fish.gradeNota}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-sans">
                          {isDone ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Selesai Potong
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              Antre Potong
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => void deleteFishRecord(fish.id).catch(() => undefined)}
                            disabled={activeBatch.lifecycleStatus === 'FINAL'}
                            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-colors focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center ml-auto"
                            aria-label={`Hapus ikan nomor ${fish.noIkan}`}
                            title="Hapus Ikan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bottom Flow Button to Step 2 */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('proses')}
            className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all touch-manipulation focus-ring min-h-[48px]"
          >
            <span>Lanjut ke Meja Potong</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

    </div>
  );
};
