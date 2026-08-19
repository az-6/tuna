import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FishGrade, LoinItem, FishRecord } from '../types';
import { formatKg, formatPercent } from '../utils/calculations';
import { 
  Scissors, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ArrowRight, 
  ArrowUpDown, 
  AlertCircle,
  Plus,
  Trash2,
  Package
} from 'lucide-react';

type SortOption = 
  | 'NO_ASC' 
  | 'NO_DESC' 
  | 'WEIGHT_DESC' 
  | 'WEIGHT_ASC' 
  | 'STATUS_PENDING_FIRST';

export const Step2MejaPotong: React.FC = () => {
  const { 
    activeBatch, 
    activeBatchFish, 
    updateFishLoins, 
    updateFishRecord,
    setActiveTab,
    openPackagingModal
  } = useApp();

  // Sorting & Filtering
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('STATUS_PENDING_FIRST');

  // Expanded accordion state
  const [expandedFishId, setExpandedFishId] = useState<string | null>(
    activeBatchFish.find(f => f.status === 'pending')?.id || activeBatchFish[0]?.id || null
  );

  // Temporary local state for active editing fish
  const [localLoins, setLocalLoins] = useState<LoinItem[]>([]);
  const [errorValidation, setErrorValidation] = useState<string | null>(null);

  // Initialize or toggle accordion
  const handleToggleExpand = (fish: FishRecord) => {
    if (expandedFishId === fish.id) {
      setExpandedFishId(null);
      setErrorValidation(null);
    } else {
      setExpandedFishId(fish.id);
      setErrorValidation(null);
      const defaultG = fish.gradePotong || fish.gradeNota;
      setLocalLoins(
        fish.loins && fish.loins.length > 0 
          ? fish.loins.map((l, i) => ({
              id: l.id || i + 1,
              name: `Loin ${l.id || i + 1}`,
              weight: l.weight || 0,
              grade: l.grade || defaultG
            }))
          : [
              { id: 1, name: "Loin 1", weight: 0, grade: defaultG },
              { id: 2, name: "Loin 2", weight: 0, grade: defaultG },
              { id: 3, name: "Loin 3", weight: 0, grade: defaultG },
              { id: 4, name: "Loin 4", weight: 0, grade: defaultG },
            ]
      );
    }
  };

  // Change weight or grade of a single loin
  const handleLoinChange = (id: number, field: 'weight' | 'grade', value: any) => {
    setLocalLoins(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    if (errorValidation) setErrorValidation(null);
  };

  // Add a new loin to this fish (e.g. Loin 5, Loin 6...)
  const handleAddLoin = (defaultGrade: FishGrade) => {
    setLocalLoins(prev => {
      const nextId = prev.length + 1;
      return [
        ...prev,
        { id: nextId, name: `Loin ${nextId}`, weight: 0, grade: defaultGrade }
      ];
    });
    if (errorValidation) setErrorValidation(null);
  };

  // Remove a loin from this fish
  const handleRemoveLoin = (id: number) => {
    if (localLoins.length <= 1) return;
    setLocalLoins(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return filtered.map((l, idx) => ({
        ...l,
        id: idx + 1,
        name: `Loin ${idx + 1}`
      }));
    });
    if (errorValidation) setErrorValidation(null);
  };

  // Change overall fish grade (Meja potong re-inspection: e.g. Grade C -> Grade B)
  const handleChangeFishGrade = (fishId: string, newGrade: FishGrade) => {
    // 1. Update gradePotong in global context (preserves original purchase gradeNota)
    updateFishRecord(fishId, { gradePotong: newGrade });

    // 2. Automatically update local loins default grade to match new evaluation
    setLocalLoins(prev => prev.map(l => ({ ...l, grade: newGrade })));
    if (errorValidation) setErrorValidation(null);
  };

  // Save loins and mark done
  const handleSaveFishLoins = (fishId: string) => {
    const totalWeight = localLoins.reduce((sum, l) => sum + (l.weight || 0), 0);
    if (totalWeight <= 0) {
      setErrorValidation('Silakan isi timbangan setidaknya pada salah satu Loin!');
      return;
    }
    setErrorValidation(null);
    const normalizedLoins = localLoins.map((l, i) => ({
      ...l,
      name: `Loin ${l.id || i + 1}`
    }));
    updateFishLoins(fishId, normalizedLoins, 'done');
    
    // Auto expand next pending fish for smooth field tallying
    const nextPending = activeBatchFish.find(f => f.id !== fishId && f.status === 'pending');
    if (nextPending) {
      handleToggleExpand(nextPending);
    } else {
      setExpandedFishId(null);
    }
  };

  // Memoized Live Aggregates
  const { doneCount, pendingCount, totalLoinDone, totalLoinADone, totalLoinBDone, totalLoinCDone, overallBatchYield } = useMemo(() => {
    const doneFishList = activeBatchFish.filter(f => f.status === 'done');
    const done = doneFishList.length;
    const pending = activeBatchFish.length - done;
    const totalUtuhDone = doneFishList.reduce((acc, f) => acc + (f.beratUtuh || 0), 0);

    let loinTotal = 0;
    let loinA = 0;
    let loinB = 0;
    let loinC = 0;

    doneFishList.forEach(f => {
      (f.loins || []).forEach(l => {
        const w = l.weight || 0;
        loinTotal += w;
        if (l.grade === 'A') loinA += w;
        else if (l.grade === 'B') loinB += w;
        else if (l.grade === 'C') loinC += w;
      });
    });

    const yieldPct = totalUtuhDone > 0 ? (loinTotal / totalUtuhDone) : 0;
    return {
      doneCount: done,
      pendingCount: pending,
      totalLoinDone: loinTotal,
      totalLoinADone: loinA,
      totalLoinBDone: loinB,
      totalLoinCDone: loinC,
      overallBatchYield: yieldPct
    };
  }, [activeBatchFish]);

  // Memoized Filtered and Sorted Fish List
  const displayedFish = useMemo(() => {
    return [...activeBatchFish]
      .filter(f => {
        if (filterStatus === 'PENDING') return f.status === 'pending';
        if (filterStatus === 'DONE') return f.status === 'done';
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'STATUS_PENDING_FIRST') {
          if (a.status === 'pending' && b.status === 'done') return -1;
          if (a.status === 'done' && b.status === 'pending') return 1;
          return a.noIkan - b.noIkan;
        }
        if (sortBy === 'NO_ASC') return a.noIkan - b.noIkan;
        if (sortBy === 'NO_DESC') return b.noIkan - a.noIkan;
        if (sortBy === 'WEIGHT_DESC') return (b.beratUtuh || 0) - (a.beratUtuh || 0);
        if (sortBy === 'WEIGHT_ASC') return (a.beratUtuh || 0) - (b.beratUtuh || 0);
        return 0;
      });
  }, [activeBatchFish, filterStatus, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      
      {/* 1. Header & Live Yield Progress Bar */}
      <section 
        aria-labelledby="meja-potong-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Langkah 2</span>
              <span className="text-xs text-slate-400">&bull; Meja Potong</span>
            </div>
            <h1 id="meja-potong-heading" className="text-lg sm:text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Catat Hasil Potong Loin
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Buka ikan &rarr; Cek mutu daging (bisa koreksi Grade) &rarr; Masukkan timbangan <strong>Loin 1, 2, 3, 4, dst.</strong>
            </p>
          </div>

          {/* Big Live Rendemen Badge */}
          <div className="w-full sm:w-auto bg-slate-950 px-3 py-3 sm:px-4 rounded-2xl border border-slate-800 flex flex-row items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Rendemen Batch</span>
              <span className={`text-lg sm:text-2xl font-black font-mono tabular-nums leading-tight ${
                doneCount === 0
                  ? 'text-slate-400'
                  : overallBatchYield >= 0.60
                    ? 'text-emerald-400'
                    : 'text-amber-300'
              }`}>
                {doneCount > 0 ? formatPercent(overallBatchYield) : '0.0%'}
              </span>
            </div>
            <div className="text-right sm:text-left text-xs border-l border-slate-800 pl-3">
              <span className="text-slate-400 block text-[11px]">Standar: ≥ 60.0%</span>
              <span className={`font-bold ${
                doneCount === 0
                  ? 'text-slate-400'
                  : overallBatchYield >= 0.60
                    ? 'text-emerald-400'
                    : 'text-amber-300'
              }`}>
                {doneCount === 0 
                  ? 'Siap Potong' 
                  : overallBatchYield >= 0.60 
                    ? '✓ Sesuai Target (≥60%)' 
                    : '⚠️ Rendemen Rendah (<60%)'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>Kemajuan Pemotongan:</span>
            <span className="font-bold text-white font-mono tabular-nums">
              {doneCount} dari {activeBatchFish.length} Ekor Selesai ({activeBatchFish.length > 0 ? Math.round((doneCount / activeBatchFish.length) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${activeBatchFish.length > 0 ? (doneCount / activeBatchFish.length) * 100 : 0}%` }}
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={activeBatchFish.length}
            />
          </div>
        </div>

        {/* Grade Breakdown Summary Pills */}
        {doneCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="bg-slate-950 p-2 sm:p-2.5 flex sm:block items-center justify-between sm:justify-center rounded-xl border border-slate-800 text-left sm:text-center">
              <span className="text-emerald-400 font-bold block text-[11px] font-sans">Loin Grade A</span>
              <span className="text-white font-bold text-sm tabular-nums">{formatKg(totalLoinADone)}</span>
            </div>
            <div className="bg-slate-950 p-2 sm:p-2.5 flex sm:block items-center justify-between sm:justify-center rounded-xl border border-slate-800 text-left sm:text-center">
              <span className="text-blue-400 font-bold block text-[11px] font-sans">Loin Grade B</span>
              <span className="text-white font-bold text-sm tabular-nums">{formatKg(totalLoinBDone)}</span>
            </div>
            <div className="bg-slate-950 p-2 sm:p-2.5 flex sm:block items-center justify-between sm:justify-center rounded-xl border border-slate-800 text-left sm:text-center">
              <span className="text-amber-400 font-bold block text-[11px] font-sans">Loin Grade C</span>
              <span className="text-white font-bold text-sm tabular-nums">{formatKg(totalLoinCDone)}</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Filter & Sort Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto" role="group" aria-label="Filter Status Ikan">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring text-center ${
              filterStatus === 'ALL'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Semua ({activeBatchFish.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring text-center ${
              filterStatus === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Antre ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DONE')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring text-center ${
              filterStatus === 'DONE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Selesai ({doneCount})
          </button>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs min-h-[44px]">
          <ArrowUpDown className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <label htmlFor="sort-fish-select" className="text-slate-300 font-medium shrink-0 hidden sm:inline-block">Urutan:</label>
          <select
            id="sort-fish-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs w-full sm:w-auto truncate"
          >
            <option value="STATUS_PENDING_FIRST" className="bg-slate-900 text-white">⏳ Belum Dipotong Dulu</option>
            <option value="NO_ASC" className="bg-slate-900 text-white">🔢 No. Ikan Naik</option>
            <option value="NO_DESC" className="bg-slate-900 text-white">🔢 No. Ikan Turun</option>
            <option value="WEIGHT_DESC" className="bg-slate-900 text-white">⚖️ Berat Terbesar Dulu</option>
            <option value="WEIGHT_ASC" className="bg-slate-900 text-white">⚖️ Berat Terkecil Dulu</option>
          </select>
        </div>
      </div>

      {/* 3. Fish Accordion List: Mobile-Friendly Touch Cards */}
      <div className="space-y-3">
        {displayedFish.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs sm:text-sm">
            Tidak ada ikan pada filter ini.
          </div>
        ) : (
          displayedFish.map((fish) => {
            const isExpanded = expandedFishId === fish.id;
            const isDone = fish.status === 'done';
            
            // Total Loin on this fish
            const currentLoins = isExpanded ? localLoins : (fish.loins || []);
            const currentTotalLoin = currentLoins.reduce((acc, l) => acc + (l.weight || 0), 0);
            const currentYield = fish.beratUtuh > 0 ? (currentTotalLoin / fish.beratUtuh) : 0;
            const isYieldBelow60 = currentYield < 0.60;

            return (
              <div 
                key={fish.id}
                className={`bg-slate-900 rounded-2xl border-2 transition-all shadow-lg overflow-hidden ${
                  isExpanded 
                    ? 'border-cyan-500/80 ring-2 ring-cyan-500/20' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Accordion Card Header */}
                <button
                  type="button"
                  onClick={() => handleToggleExpand(fish)}
                  className="w-full p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left touch-manipulation focus-ring"
                  aria-expanded={isExpanded}
                  aria-label={`Ikan nomor ${fish.noIkan}, berat ${formatKg(fish.beratUtuh)}, grade ${fish.gradeNota}, status ${isDone ? 'Selesai' : 'Antre'}`}
                >
                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm font-mono shrink-0 ${
                        isDone 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}>
                        #{fish.noIkan}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base font-mono tabular-nums">
                            {formatKg(fish.beratUtuh)}
                          </span>
                          {/* Grade Display with Change Transition (e.g. Grade C -> Grade B) */}
                          {fish.gradePotong && fish.gradePotong !== fish.gradeNota ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-mono font-bold">
                              <span className={`px-1.5 py-0.2 rounded font-sans ${
                                fish.gradeNota === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : fish.gradeNota === 'B'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                Grade {fish.gradeNota}
                              </span>
                              <span className="text-slate-400 font-bold">&rarr;</span>
                              <span className={`px-1.5 py-0.2 rounded font-sans ${
                                fish.gradePotong === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : fish.gradePotong === 'B'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                Grade {fish.gradePotong}
                              </span>
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              fish.gradeNota === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : fish.gradeNota === 'B'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              Grade {fish.gradeNota}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-300 block mt-0.5 font-sans">
                          {fish.kodeIkan}
                        </span>
                      </div>
                    </div>
                    
                    {/* Mobile Only: Chevron top right */}
                    <div className="p-1 rounded-lg bg-slate-950 text-slate-400 sm:hidden shrink-0 mt-0.5">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Right: Status & Yield Info with Yellow Highlight only if < 60% */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/80">
                    <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto">
                      {isDone ? (
                        <>
                          <span className={`text-xs font-bold block font-mono tabular-nums ${
                            isYieldBelow60 ? 'text-amber-300' : 'text-emerald-400'
                          }`}>
                            {formatKg(currentTotalLoin)} ({formatPercent(currentYield)})
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-0 sm:mt-0.5 ${
                            isYieldBelow60 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {isYieldBelow60 ? '⚠️ <60%' : '✓ ≥60%'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-amber-400 block">Antre Potong</span>
                          <span className="text-[10px] text-slate-400 ml-2 sm:ml-0">Tekan untuk isi</span>
                        </>
                      )}
                    </div>

                    <div className="p-1 rounded-lg bg-slate-950 text-slate-400 hidden sm:block shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Loin Tallying Pad */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/95 border-t border-slate-800 space-y-4 animate-in fade-in">
                    
                    {/* Feature 1: Cek & Ubah Grade Ikan (Meja Potong) */}
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          <span>🔍</span>
                          <span>Cek Ulang Grade Ikan #{fish.noIkan}:</span>
                        </span>
                        <span className="text-[11px] text-slate-300 leading-tight">
                          Nota Beli Awal: <strong className="text-cyan-300 font-mono">Grade {fish.gradeNota}</strong>
                        </span>
                      </div>

                      {fish.gradePotong && fish.gradePotong !== fish.gradeNota && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs flex items-center justify-between gap-2">
                          <span className="text-slate-300 font-medium">Mutu Daging Berubah:</span>
                          <span className="font-extrabold font-mono text-cyan-300 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">Grade {fish.gradeNota}</span>
                            <span>&rarr;</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300">Grade {fish.gradePotong}</span>
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Ubah Grade Ikan nomor ${fish.noIkan}`}>
                        {(['A', 'B', 'C'] as FishGrade[]).map((g) => {
                          const currentGrade = fish.gradePotong || fish.gradeNota;
                          const isSelected = currentGrade === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => handleChangeFishGrade(fish.id, g)}
                              className={`py-2 px-3 rounded-xl font-extrabold text-xs border transition-all flex items-center justify-center gap-1.5 touch-manipulation focus-ring min-h-[40px] ${
                                isSelected
                                  ? g === 'A'
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                                    : g === 'B'
                                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                                      : 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span>Grade {g}</span>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      Masukkan berat timbangan untuk masing-masing loin (kg):
                    </div>

                    {errorValidation && (
                      <div className="flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                        <span>{errorValidation}</span>
                      </div>
                    )}

                    {/* Dynamic Loin Input Grid: Loin 1, Loin 2, Loin 3, Loin 4, dst. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {localLoins.map((loin, index) => {
                        const plainLoinName = `Loin ${loin.id || index + 1}`;
                        return (
                          <div 
                            key={loin.id}
                            className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2.5"
                          >
                            <div className="flex flex-row items-center justify-between gap-2">
                              <span className="font-extrabold text-sm text-white flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                {plainLoinName}
                              </span>
                              
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                                  {fish.beratUtuh > 0 && loin.weight > 0 ? formatPercent(loin.weight / fish.beratUtuh) : '0%'} rendemen
                                </span>
                                {localLoins.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLoin(loin.id)}
                                    className="p-2 -mr-1 text-slate-500 hover:text-rose-400 rounded-lg focus-ring transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 touch-manipulation"
                                    title={`Hapus ${plainLoinName}`}
                                    aria-label={`Hapus ${plainLoinName}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Direct Clean Weight Input Field */}
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={loin.weight > 0 ? loin.weight : ''}
                                onChange={(e) => handleLoinChange(loin.id, 'weight', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 sm:py-2.5 text-lg font-black text-cyan-300 font-mono tabular-nums focus-ring min-h-[48px]"
                                aria-label={`Berat timbangan ${plainLoinName} dalam kilogram`}
                              />
                              <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-extrabold font-mono pointer-events-none">
                                KG
                              </span>
                            </div>

                            {/* Grade Selector for this Individual Loin */}
                            <div>
                              <span className="block text-[11px] text-slate-300 font-semibold mb-1.5">Grade {plainLoinName}:</span>
                              <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="radiogroup" aria-label={`Grade ${plainLoinName}`}>
                                {(['A', 'B', 'C', 'Reject'] as FishGrade[]).map((g) => {
                                  const isSel = loin.grade === g;
                                  return (
                                    <button
                                      key={g}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSel}
                                      onClick={() => handleLoinChange(loin.id, 'grade', g)}
                                      className={`py-3 sm:py-2 rounded-lg text-xs font-bold border transition-all touch-manipulation focus-ring min-h-[44px] ${
                                        isSel 
                                          ? g === 'A' 
                                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm' 
                                            : g === 'B' 
                                              ? 'bg-blue-600 text-white border-blue-400 shadow-sm' 
                                              : g === 'C' 
                                                ? 'bg-amber-600 text-white border-amber-400 shadow-sm' 
                                                : 'bg-rose-600 text-white border-rose-400 shadow-sm'
                                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                                      }`}
                                    >
                                      {g}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Tombol Tambah Loin Baru */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-2 gap-3 sm:gap-0">
                      <button
                        type="button"
                        onClick={() => handleAddLoin(fish.gradeNota)}
                        className="px-4 py-3 sm:py-2.5 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring shadow-sm min-h-[44px]"
                      >
                        <Plus className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                        <span>+ Tambah Loin (Loin {localLoins.length + 1})</span>
                      </button>
                      <span className="text-[11px] text-slate-400 font-mono text-center sm:text-right">
                        Jumlah: <strong className="text-white">{localLoins.length} Loin</strong>
                      </span>
                    </div>

                    {/* Card Summary: Live Sum with Yellow Highlight only if Rendemen < 60% */}
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-xs text-slate-300 block">Total Daging Loin Ikan Ini:</span>
                          <span className="text-lg font-black text-white font-mono tabular-nums">
                            {formatKg(currentTotalLoin)} <span className="text-xs font-normal text-slate-300 font-sans">dari {formatKg(fish.beratUtuh)}</span>
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-slate-300 block">Rendemen Ikan:</span>
                          <span className={`text-base font-extrabold font-mono tabular-nums ${
                            currentYield === 0 
                              ? 'text-slate-400' 
                              : currentYield >= 0.60 
                                ? 'text-emerald-400' 
                                : 'text-amber-300'
                          }`}>
                            {formatPercent(currentYield)} {currentYield === 0 ? '' : currentYield >= 0.60 ? '✓ Sesuai Target (≥60%)' : '⚠️ Rendemen Rendah (<60%)'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveFishLoins(fish.id)}
                        className="w-full py-3.5 px-4 sm:px-6 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:scale-[0.99] text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[50px] whitespace-normal sm:whitespace-nowrap leading-tight text-center"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>SIMPAN HASIL POTONG <br className="sm:hidden" /> (IKAN #{fish.noIkan})</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Bottom Flow Button to Step 3 & Packaging Entry */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-3 mb-6">
        <div>
          <span className="font-bold text-white text-sm block mb-0.5">Selesai Potong & Packing?</span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Catat jumlah es balok dan box styrofoam yang terpakai untuk batch ini sebelum hitung HPP.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={openPackagingModal}
            className="px-4 py-3 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[46px]"
          >
            <Package className="w-4 h-4 text-purple-400" />
            <span>Catat Pemakaian Kemasan</span>
          </button>
          <button
            onClick={() => setActiveTab('hpp')}
            className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all touch-manipulation focus-ring min-h-[46px]"
          >
            <span>Lanjut ke Tahap 3: HPP</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

    </div>
  );
};
