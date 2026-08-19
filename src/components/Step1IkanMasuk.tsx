import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FishGrade } from '../types';
import { formatKg, formatRupiah } from '../utils/calculations';
import { Plus, Trash2, ArrowRight, Ship, Edit3, Save, X, Check, Scale, AlertCircle } from 'lucide-react';

export const Step1IkanMasuk: React.FC = () => {
  const { 
    activeBatch, 
    activeBatchFish, 
    addFishRecord, 
    deleteFishRecord, 
    setActiveTab,
    updateBatch
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

  const nextNo = activeBatchFish.length + 1;
  const kodeOtomatis = customKode.trim() || `Tuna Sirip Kuning #${String(nextNo).padStart(3, '0')}`;
  const totalKgIkan = activeBatchFish.reduce((acc, f) => acc + (f.beratUtuh || 0), 0);

  const handleSaveBatchInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateBatch(activeBatch.id, {
      nelayan: editNelayan.trim() || 'Nelayan Tanpa Nama',
      tanggal: editTanggal,
      hargaBeliGradeA: editHargaA,
      hargaBeliGradeB: editHargaB,
      hargaBeliGradeC: editHargaC,
      biayaArmada: editArmada
    });
    setIsEditingBatch(false);
  };

  const handleOpenEdit = () => {
    setEditNelayan(activeBatch.nelayan);
    setEditTanggal(activeBatch.tanggal);
    setEditHargaA(activeBatch.hargaBeliGradeA || 50000);
    setEditHargaB(activeBatch.hargaBeliGradeB);
    setEditHargaC(activeBatch.hargaBeliGradeC);
    setEditArmada(activeBatch.biayaArmada);
    setIsEditingBatch(true);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const berat = parseFloat(beratUtuh);
    if (isNaN(berat) || berat <= 0) {
      setErrorMessage('Silakan masukkan berat timbangan ikan yang valid (contoh: 52.5)');
      return;
    }

    setErrorMessage(null);
    addFishRecord({
      batchId: activeBatch.id,
      noIkan: nextNo,
      kodeIkan: kodeOtomatis,
      beratUtuh: berat,
      gradeNota: gradeNota,
      status: 'pending',
      loins: [
        { id: 1, name: "Loin 1", weight: 0, grade: gradeNota },
        { id: 2, name: "Loin 2", weight: 0, grade: gradeNota },
        { id: 3, name: "Loin 3", weight: 0, grade: gradeNota },
        { id: 4, name: "Loin 4", weight: 0, grade: gradeNota }
      ]
    });

    setLastAddedFish(`Ikan #${nextNo} (${formatKg(berat)} - Grade ${gradeNota}) berhasil disimpan!`);
    setBeratUtuh('');
    setCustomKode('');

    setTimeout(() => {
      setLastAddedFish(null);
    }, 3500);
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-4xl mx-auto">
      
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
              <button
                onClick={handleOpenEdit}
                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors focus-ring min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                aria-label="Ubah Nama Nelayan dan Harga Beli"
                title="Ubah Nama Nelayan & Harga Beli"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5 font-mono">
              <span>{activeBatch.id}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 text-xs font-mono">
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
        </div>
      </section>

      {/* Modal Edit Nelayan & Batch Info */}
      {isEditingBatch && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-batch-title"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditingBatch(false); }}
        >
          <div className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 id="edit-batch-title" className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" aria-hidden="true" />
                Ubah Info Nelayan
              </h2>
              <button 
                onClick={() => setIsEditingBatch(false)} 
                className="p-2 text-slate-400 hover:text-white rounded-lg focus-ring min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                  id="edit-nelayan-input"
                  type="text"
                  placeholder="Contoh: Pak Rudi (KM Samudera Jaya)"
                  value={editNelayan}
                  onChange={(e) => setEditNelayan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white focus-ring font-medium"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-base text-white focus-ring font-mono tabular-nums"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label htmlFor="edit-harga-a" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga A (Rp/kg)</label>
                  <input
                    id="edit-harga-a"
                    type="number"
                    step="500"
                    inputMode="numeric"
                    value={editHargaA}
                    onChange={(e) => setEditHargaA(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="edit-harga-b" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga B (Rp/kg)</label>
                  <input
                    id="edit-harga-b"
                    type="number"
                    step="500"
                    inputMode="numeric"
                    value={editHargaB}
                    onChange={(e) => setEditHargaB(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="edit-harga-c" className="block text-xs text-slate-200 font-semibold mb-1.5">Harga C (Rp/kg)</label>
                  <input
                    id="edit-harga-c"
                    type="number"
                    step="500"
                    inputMode="numeric"
                    value={editHargaC}
                    onChange={(e) => setEditHargaC(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-armada-input" className="block text-xs text-slate-200 font-semibold mb-1.5">Biaya Armada (Rp)</label>
                <input
                  id="edit-armada-input"
                  type="number"
                  step="10000"
                  inputMode="numeric"
                  value={editArmada}
                  onChange={(e) => setEditArmada(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-base text-white font-mono focus-ring tabular-nums"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingBatch(false)}
                  className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold touch-manipulation min-h-[48px] text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5 touch-manipulation focus-ring min-h-[48px] text-sm"
                >
                  <Save className="w-4 h-4" /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Fast Input Box for Fish: Large, Simple, Mobile-Friendly */}
      <section 
        aria-labelledby="input-fish-heading"
        className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-3 sm:space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="input-fish-heading" className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            Timbang Ikan #{nextNo}
          </h2>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {lastAddedFish && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{lastAddedFish}</span>
          </div>
        )}

        <form onSubmit={handleAddSingle} className="space-y-3 sm:space-y-4">
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3.5">
            
            {/* Berat Utuh Input (Giant Numeric Field) */}
            <div className="sm:col-span-6">
              <label htmlFor="berat-utuh-input" className="block text-xs font-bold text-slate-200 mb-1.5">
                1. Berat Timbangan (kg) *
              </label>
              <div className="relative">
                <input
                  id="berat-utuh-input"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Contoh: 52.5"
                  value={beratUtuh}
                  onChange={(e) => {
                    setBeratUtuh(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-slate-950 border-2 border-cyan-500/50 rounded-2xl px-4 py-3.5 text-2xl font-black text-cyan-300 focus-ring font-mono tabular-nums placeholder:text-slate-600"
                  autoFocus
                  required
                />
                <span className="absolute right-4 top-4 text-sm text-slate-400 font-extrabold font-mono pointer-events-none">
                  KG
                </span>
              </div>
            </div>

            {/* Grade Beli di Nota Nelayan */}
            <div className="sm:col-span-6">
              <span className="block text-xs font-bold text-slate-200 mb-1.5">
                2. Grade di Nota *
              </span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Grade Nota Nelayan">
                {(['C', 'B', 'A'] as FishGrade[]).map((g) => {
                  const isSelected = gradeNota === g;
                  const price = g === 'A' ? activeBatch.hargaBeliGradeA : g === 'B' ? activeBatch.hargaBeliGradeB : activeBatch.hargaBeliGradeC;
                  
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setGradeNota(g)}
                      className={`py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center touch-manipulation focus-ring min-h-[56px] ${
                        isSelected
                          ? g === 'C' 
                            ? 'bg-amber-600/90 text-white border-amber-400 shadow-md shadow-amber-600/30'
                            : g === 'B' 
                              ? 'bg-blue-600/90 text-white border-blue-400 shadow-md shadow-blue-600/30'
                              : 'bg-emerald-600/90 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 active:bg-slate-900'
                      }`}
                    >
                      <span className="font-extrabold text-sm sm:text-base">Grade {g}</span>
                      <span className="text-[10px] opacity-90 font-mono tabular-nums mt-0.5">
                        {formatRupiah(price || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Big Tap Button to Save */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white font-extrabold rounded-2xl text-base shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[50px]"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>SIMPAN IKAN #{nextNo}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. List of Registered Fish */}
      <section 
        aria-labelledby="fish-list-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="min-w-0">
            <h2 id="fish-list-heading" className="font-extrabold text-white text-base">
              Daftar Ikan ({activeBatchFish.length})
            </h2>
            <p className="text-[11px] text-slate-400 truncate">{activeBatch.nelayan}</p>
          </div>
          <span className="text-xs text-slate-300 font-mono bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 tabular-nums shrink-0">
            <strong className="text-cyan-300 text-sm font-bold">{formatKg(totalKgIkan)}</strong>
          </span>
        </div>

        {activeBatchFish.length === 0 ? (
          <div className="text-center py-8 sm:py-10 px-4 text-slate-400 text-xs sm:text-sm bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
            Belum ada ikan yang dicatat. Silakan timbang dan masukkan berat ikan di formulir atas.
          </div>
        ) : (
          <>
            {/* Mobile Card List (Visible on < sm screens) */}
            <div className="grid grid-cols-1 gap-2 sm:hidden max-h-[50vh] overflow-y-auto -mx-0.5 px-0.5">
              {activeBatchFish.map((fish) => {
                const isDone = fish.status === 'done';

                return (
                  <div 
                    key={fish.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-200 font-mono shrink-0 text-[11px]">
                        #{fish.noIkan}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm font-mono tabular-nums">
                          {formatKg(fish.beratUtuh)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {fish.gradePotong && fish.gradePotong !== fish.gradeNota ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-bold">
                              <span className={fish.gradeNota === 'A' ? 'text-emerald-300' : fish.gradeNota === 'B' ? 'text-blue-300' : 'text-amber-300'}>
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
                      onClick={() => deleteFishRecord(fish.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 active:bg-slate-900 rounded-xl transition-colors focus-ring min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
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
                            onClick={() => deleteFishRecord(fish.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors focus-ring"
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
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all touch-manipulation focus-ring min-h-[48px]"
          >
            <span>Lanjut ke Meja Potong</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

    </div>
  );
};
