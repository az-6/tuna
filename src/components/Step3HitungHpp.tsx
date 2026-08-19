import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateExactHpp, formatKg, formatPercent, formatRupiah } from '../utils/calculations';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet, 
  Printer, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Layers, 
  Award, 
  Scale, 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldAlert,
  ArrowLeft,
  Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const Step3HitungHpp: React.FC = () => {
  const { 
    activeBatch, 
    activeBatchFish, 
    packagingPrices,
    updateBatch,
    isHppUnlocked,
    unlockHpp,
    lockHpp,
    hppPassword,
    setHppPassword,
    setActiveTab,
    openPackagingModal
  } = useApp();

  // Password / Login local state
  const [inputPass, setInputPass] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Change password modal
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [changePassMsg, setChangePassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selection scope
  const [calcScope, setCalcScope] = useState<'ALL' | 'DONE_ONLY'>('DONE_ONLY');

  // Dynamic Inputs per Batch
  const [customCargo, setCustomCargo] = useState<number>(activeBatch.tarifKargoPerKgLoin || 31000);
  const [customPriceA, setCustomPriceA] = useState<number>(activeBatch.hargaJualLoinA || 150000);
  const [customPriceB, setCustomPriceB] = useState<number>(activeBatch.hargaJualLoinB || 135000);
  const [customPriceC, setCustomPriceC] = useState<number>(activeBatch.hargaJualLoinC || 120000);
  const [customTetelan, setCustomTetelan] = useState<string>('');
  const [customTulang, setCustomTulang] = useState<string>('');
  const [savePriceAlert, setSavePriceAlert] = useState(false);

  // Sync state if activeBatch changes
  useEffect(() => {
    setCustomCargo(activeBatch.tarifKargoPerKgLoin || 31000);
    setCustomPriceA(activeBatch.hargaJualLoinA || 150000);
    setCustomPriceB(activeBatch.hargaJualLoinB || 135000);
    setCustomPriceC(activeBatch.hargaJualLoinC || 120000);
  }, [activeBatch.id, activeBatch.tarifKargoPerKgLoin, activeBatch.hargaJualLoinA, activeBatch.hargaJualLoinB, activeBatch.hargaJualLoinC]);

  const [showDetailBiaya, setShowDetailBiaya] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Save HPP selling prices & cargo permanently to batch
  const handleSaveHppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateBatch(activeBatch.id, {
      hargaJualLoinA: customPriceA,
      hargaJualLoinB: customPriceB,
      hargaJualLoinC: customPriceC,
      tarifKargoPerKgLoin: customCargo
    });
    setSavePriceAlert(true);
    setTimeout(() => {
      setSavePriceAlert(false);
    }, 2500);
  };

  // Handle unlock submission
  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPass.trim()) {
      setAuthError('Silakan masukkan kata sandi!');
      return;
    }
    const success = unlockHpp(inputPass);
    if (success) {
      setAuthError(null);
      setInputPass('');
    } else {
      setAuthError('Kata sandi salah. Silakan coba lagi! (Default: ktg123)');
    }
  };

  // Handle password change
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassInput.trim() !== hppPassword.trim()) {
      setChangePassMsg({ type: 'error', text: 'Password lama salah!' });
      return;
    }
    if (newPassInput.trim().length < 3) {
      setChangePassMsg({ type: 'error', text: 'Password baru minimal 3 karakter!' });
      return;
    }
    setHppPassword(newPassInput.trim());
    setChangePassMsg({ type: 'success', text: 'Password HPP berhasil diubah!' });
    setTimeout(() => {
      setShowChangePassModal(false);
      setOldPassInput('');
      setNewPassInput('');
      setChangePassMsg(null);
    }, 1000);
  };

  // Filter selected fish
  const targetFishList = useMemo(() => {
    return activeBatchFish.filter((fish) => {
      if (calcScope === 'ALL') return true;
      if (calcScope === 'DONE_ONLY') return fish.status === 'done';
      return true;
    });
  }, [activeBatchFish, calcScope]);

  const parsedTetelan = customTetelan !== '' ? parseFloat(customTetelan) : undefined;
  const parsedTulang = customTulang !== '' ? parseFloat(customTulang) : undefined;

  // Memoized Exact Real HPP Calculation
  const hpp = useMemo(() => {
    return calculateExactHpp(
      activeBatch,
      targetFishList,
      packagingPrices,
      undefined,
      parsedTetelan,
      parsedTulang,
      customCargo,
      undefined,
      customPriceA,
      customPriceB,
      customPriceC
    );
  }, [
    activeBatch,
    targetFishList,
    packagingPrices,
    parsedTetelan,
    parsedTulang,
    customCargo,
    customPriceA,
    customPriceB,
    customPriceC
  ]);

  // Derived financials
  const activeScenario = hpp.scenarios?.[0];
  const totalOmzetLoin = activeScenario?.totalOmzet || 0;
  const totalEstimasiLaba = activeScenario?.totalProfit || 0;
  const marginLabaTotal = totalOmzetLoin > 0 ? (totalEstimasiLaba / totalOmzetLoin) : 0;
  const totalBiayaKargo = hpp.simTotalLoin * hpp.kargoPerKg;
  const isProfitable = totalEstimasiLaba >= 0;

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const dataRingkasan = [
      ["RINGKASAN BATCH KTG TUNA OPERATIONS (REAL DATA)"],
      ["Nama Nelayan / Kapal", activeBatch.nelayan],
      ["Kode Batch", activeBatch.id],
      ["Tanggal", activeBatch.tanggal],
      ["Total Ikan Dihitung", `${targetFishList.length} Ekor`],
      ["Total Berat Utuh", `${hpp.totalBeratUtuh.toFixed(1)} kg`],
      ["Total Loin Bersih (Real)", `${hpp.totalLoinKg.toFixed(1)} kg`],
      ["Rendemen Aktual (Real)", `${(hpp.yieldAktual * 100).toFixed(1)}%`],
      [""],
      ["ANALISIS KEUANGAN & HPP LANDED REAL"],
      ["Total Omset Penjualan Loin", totalOmzetLoin],
      ["Pemasukan By-Product (Tetelan & Tulang)", hpp.totalByProductRevenue],
      ["Biaya Bahan Kemasan Total", hpp.totalBiayaKemasan],
      ["Biaya Kargo Pesawat Total", totalBiayaKargo],
      ["Laba Bersih Real", totalEstimasiLaba],
      ["Margin Keuntungan", `${(marginLabaTotal * 100).toFixed(1)}%`],
      [""],
      ["HPP LANDED REAL PER KG LOIN"],
      ["HPP Loin Grade A (Rp/kg)", Math.round(hpp.trueNetLandedCogsA)],
      ["HPP Loin Grade B (Rp/kg)", Math.round(hpp.trueNetLandedCogsB)],
      ["HPP Loin Grade C (Rp/kg)", Math.round(hpp.trueNetLandedCogsC)],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(dataRingkasan);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan HPP");

    // Detail Per Ikan — Dynamic loin columns based on max loins across all fish
    const maxLoinCount = Math.max(4, ...targetFishList.map(f => (f.loins || []).length));
    const loinHeaders = Array.from({ length: maxLoinCount }, (_, i) => `Loin ${i + 1} (kg)`);

    const dataDetail = [
      ["No", "Kode Ikan", "Berat Utuh (kg)", "Grade Nota (Beli)", "Grade Potong (Meja)", ...loinHeaders, "Total Loin (kg)", "Rendemen %"],
      ...targetFishList.map(f => {
        const loinWeights = Array.from({ length: maxLoinCount }, (_, i) => f.loins?.[i]?.weight || 0);
        const tot = loinWeights.reduce((sum, w) => sum + w, 0);
        const yld = f.beratUtuh > 0 ? (tot / f.beratUtuh) * 100 : 0;
        const gradePotongStr = f.gradePotong && f.gradePotong !== f.gradeNota 
          ? `${f.gradeNota} -> ${f.gradePotong}` 
          : (f.gradePotong || f.gradeNota);
        return [
          f.noIkan,
          f.kodeIkan,
          f.beratUtuh,
          f.gradeNota,
          gradePotongStr,
          ...loinWeights,
          tot,
          `${yld.toFixed(1)}%`
        ];
      })
    ];

    const wsDetail = XLSX.utils.aoa_to_sheet(dataDetail);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Rincian Meja Potong");

    XLSX.writeFile(wb, `Laporan_HPP_${activeBatch.nelayan.replace(/[^a-zA-Z0-9]/g, '_')}_${activeBatch.id}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // IF HPP IS LOCKED: SHOW PASSWORD GATE
  if (!isHppUnlocked) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-lg mx-auto py-6 px-2">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Laporan HPP & Laba Terkunci
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Bagian ini berisi rahasia modal pokok, harga beli, dan estimasi keuntungan pabrik. Khusus akses pemilik / manajer.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
            <div>
              <label htmlFor="hpp-password-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Masukkan Kata Sandi HPP:
              </label>
              <div className="relative">
                <input
                  id="hpp-password-input"
                  type={showPasswordText ? "text" : "password"}
                  placeholder="Masukkan kata sandi..."
                  value={inputPass}
                  onChange={(e) => {
                    setInputPass(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-white focus-ring pr-11 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white p-1 rounded-lg focus-ring"
                  aria-label={showPasswordText ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white font-extrabold rounded-xl text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[48px]"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Akses Laporan HPP</span>
            </button>
          </form>

          {/* Quick packaging access for workers even when HPP is locked */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={openPackagingModal}
              className="w-full py-2.5 px-3 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[42px]"
            >
              <Package className="w-4 h-4 text-purple-400" />
              <span>Pegawai: Catat Pemakaian Kemasan Batch Ini</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proses')}
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 mx-auto py-1 focus-ring"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Meja Potong</span>
            </button>
          </div>

        </div>

      </div>
    );
  }

  // UNLOCKED VIEW: FULL HPP REPORT
  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      
      {/* 1. Header Navigation & Quick Actions */}
      <section 
        aria-labelledby="hpp-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Langkah 3</span>
              <span className="text-xs text-slate-400">&bull; Laporan Real</span>
            </div>
            <h1 id="hpp-heading" className="text-lg sm:text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Hitung HPP & Laba (Real Aktual)
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Kalkulasi real biaya modal ikan, kemasan terpakai, kargo, dan laba bersih aktual berdasarkan hasil meja potong ({activeBatch.nelayan}).
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 sm:pt-0 no-print">
            
            {/* Packaging Prices Button */}
            <button
              onClick={openPackagingModal}
              className="px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[38px]"
              title="Catat Pemakaian & Biaya Kemasan Batch"
            >
              <Package className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>Biaya Kemasan</span>
            </button>

            {/* Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[38px]"
              title="Unduh format spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Excel</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[38px]"
              title="Cetak nota laporan HPP"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Lock Button */}
            <button
              onClick={lockHpp}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 touch-manipulation focus-ring min-h-[38px]"
              title="Kunci Akses HPP"
              aria-label="Kunci Akses HPP"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden md:inline">Kunci</span>
            </button>

          </div>
        </div>

        {/* Calculation Scope Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs no-print" role="group" aria-label="Cakupan Data Ikan">
          <button
            type="button"
            onClick={() => setCalcScope('DONE_ONLY')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all touch-manipulation focus-ring text-center ${
              calcScope === 'DONE_ONLY'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ikan Selesai Potong Saja ({activeBatchFish.filter(f => f.status === 'done').length} Ekor)
          </button>
          <button
            type="button"
            onClick={() => setCalcScope('ALL')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all touch-manipulation focus-ring text-center ${
              calcScope === 'ALL'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Ikan Masuk ({activeBatchFish.length} Ekor)
          </button>
        </div>
      </section>

      {/* 2. Top Executive Summary Cards (Big, High-Contrast KPIs) */}
      <section aria-labelledby="kpi-summary-heading" className="space-y-3">
        <h2 id="kpi-summary-heading" className="sr-only">Ringkasan Angka Utama</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Card 1: Total Omset Penjualan */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Total Omset Penjualan Loin</span>
              <DollarSign className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white font-mono tabular-nums break-all sm:break-normal">
              {formatRupiah(totalOmzetLoin)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Loin Real ({formatKg(hpp.totalLoinKg)}) {hpp.totalByProductRevenue > 0 ? `+ By-Product (${formatRupiah(hpp.totalByProductRevenue)})` : ''}
            </p>
          </div>

          {/* Card 2: Laba Bersih Real */}
          <div className={`border rounded-2xl p-4 shadow-xl ${
            isProfitable 
              ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/50' 
              : 'bg-gradient-to-br from-rose-950/60 to-slate-900 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300">Laba Bersih Real</span>
              <TrendingUp className={`w-4 h-4 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`} aria-hidden="true" />
            </div>
            <div className={`text-lg sm:text-2xl font-black font-mono tabular-nums break-all sm:break-normal ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatRupiah(totalEstimasiLaba)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-bold">
              Margin: <span className="font-mono tabular-nums">{formatPercent(marginLabaTotal)}</span> dari omset
            </p>
          </div>

          {/* Card 3: Rendemen & Total Loin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Hasil Daging Loin Bersih</span>
              <Scale className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono tabular-nums break-all sm:break-normal">
              {formatKg(hpp.totalLoinKg)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Rendemen Real: <strong className={hpp.yieldAktual >= 0.60 ? 'text-emerald-400' : 'text-amber-300'}>
                {formatPercent(hpp.yieldAktual)}
              </strong>
            </p>
          </div>

        </div>
      </section>

      {/* 3. HPP Landed Per KG (Harga Pokok Loin Sampai Tujuan) */}
      <section 
        aria-labelledby="hpp-landed-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 id="hpp-landed-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Harga Pokok Produksi (HPP) Landed per kg Loin
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Beban modal pokok aktual per kg berdasarkan rendemen nyata dari meja potong.
            </p>
          </div>
        </div>

        {/* 3 Grade Price Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          
          {/* Grade A */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/40 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-400 font-sans">Loin Grade A ({formatKg(hpp.loinAKg)})</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.trueNetLandedCogsA))} <span className="text-xs font-normal text-slate-400">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans flex justify-between pt-1 border-t border-slate-800/80">
              <span>Harga Jual:</span>
              <span className="font-bold text-emerald-300 font-mono tabular-nums">{formatRupiah(customPriceA)}/kg</span>
            </div>
          </div>

          {/* Grade B */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-blue-500/40 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-400 font-sans">Loin Grade B ({formatKg(hpp.loinBKg)})</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.trueNetLandedCogsB))} <span className="text-xs font-normal text-slate-400">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans flex justify-between pt-1 border-t border-slate-800/80">
              <span>Harga Jual:</span>
              <span className="font-bold text-blue-300 font-mono tabular-nums">{formatRupiah(customPriceB)}/kg</span>
            </div>
          </div>

          {/* Grade C */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-amber-500/40 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-400 font-sans">Loin Grade C ({formatKg(hpp.loinCKg)})</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.trueNetLandedCogsC))} <span className="text-xs font-normal text-slate-400">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans flex justify-between pt-1 border-t border-slate-800/80">
              <span>Harga Jual:</span>
              <span className="font-bold text-amber-300 font-mono tabular-nums">{formatRupiah(customPriceC)}/kg</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Rincian Komponen Biaya Modal (Accordion) */}
      <section 
        aria-labelledby="cost-breakdown-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
      >
        <button
          type="button"
          onClick={() => setShowDetailBiaya(!showDetailBiaya)}
          className="w-full flex items-center justify-between text-left touch-manipulation focus-ring"
          aria-expanded={showDetailBiaya}
        >
          <div>
            <h2 id="cost-breakdown-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Rincian Komponen Biaya Kemasan & Potongan (Klik Buka/Tutup)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparansi hitungan biaya es balok, styrofoam, kargo, dan penjualan by-product.
            </p>
          </div>
          <div className="p-1 rounded-lg bg-slate-950 text-slate-400">
            {showDetailBiaya ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showDetailBiaya && (
          <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs font-mono animate-in fade-in">
            
            {/* Biaya Kemasan */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white block font-sans">Biaya Bahan Kemasan & Es</span>
                <span className="text-[11px] text-slate-400">
                  Es ({hpp.packagingDetails?.qtyEs} balok), Box Styrofoam ({hpp.packagingDetails?.qtyBox} box), Jelly Ice, Plastik & Lakban
                  {hpp.packagingDetails?.customMaterials && hpp.packagingDetails.customMaterials.length > 0 && (
                    <span className="text-purple-300 block sm:inline sm:ml-1 font-sans font-medium">
                      + {hpp.packagingDetails.customMaterials.length} Material Tambahan ({hpp.packagingDetails.customMaterials.map(m => `${m.name} ${m.quantity} ${m.unit}`).join(', ')})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPackagingModal}
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline font-sans"
                >
                  Ubah Pemakaian
                </button>
                <span className="font-bold text-purple-300 text-sm sm:text-base tabular-nums">{formatRupiah(hpp.totalBiayaKemasan)}</span>
              </div>
            </div>

            {/* Biaya Kargo */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white block font-sans">Biaya Kargo Pesawat / Pengiriman</span>
                <span className="text-[11px] text-slate-400">
                  {formatRupiah(hpp.kargoPerKg)}/kg x {formatKg(hpp.totalLoinKg)}
                </span>
              </div>
              <span className="font-bold text-cyan-300 text-sm sm:text-base tabular-nums">{formatRupiah(totalBiayaKargo)}</span>
            </div>

            {/* Pemasukan By-Product */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-300 block font-sans">Pemasukan By-Product (Tetelan & Tulang)</span>
                <span className="text-[11px] text-slate-400">
                  {hpp.totalByProductRevenue > 0 
                    ? `Tetelan ${formatKg(hpp.tetelanKg)} + Tulang ${formatKg(hpp.tulangKg)} (mengurangi HPP)`
                    : 'Belum dimasukkan (tidak mengurangi HPP)'}
                </span>
              </div>
              <span className={`font-bold text-sm sm:text-base tabular-nums ${hpp.totalByProductRevenue > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {hpp.totalByProductRevenue > 0 ? `- ${formatRupiah(hpp.totalByProductRevenue)}` : 'Rp 0'}
              </span>
            </div>

          </div>
        )}
      </section>

      {/* 5. Penyesuaian Harga Jual & Tarif Kargo */}
      <section 
        aria-labelledby="simulator-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 no-print"
      >
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between text-left touch-manipulation focus-ring"
          aria-expanded={showSimulator}
        >
          <div>
            <h2 id="simulator-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Penyesuaian Harga Jual Pasar & Tarif Kargo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ubah harga jual penawaran atau tarif kargo pesawat untuk melihat dampaknya ke laba real.
            </p>
          </div>
          <div className="p-1 rounded-lg bg-slate-950 text-slate-400">
            {showSimulator ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showSimulator && (
          <div className="space-y-4 pt-3 border-t border-slate-800 text-xs animate-in fade-in">
            {/* Custom Prices Grid (Grade A, B, C, and Kargo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="price-jual-a" className="block text-emerald-300 font-semibold mb-1">Harga Jual Grade A (Rp/kg)</label>
                <input
                  id="price-jual-a"
                  type="number"
                  step="5000"
                  value={customPriceA}
                  onChange={(e) => setCustomPriceA(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="price-jual-b" className="block text-blue-300 font-semibold mb-1">Harga Jual Grade B (Rp/kg)</label>
                <input
                  id="price-jual-b"
                  type="number"
                  step="5000"
                  value={customPriceB}
                  onChange={(e) => setCustomPriceB(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="price-jual-c" className="block text-amber-300 font-semibold mb-1">Harga Jual Grade C (Rp/kg)</label>
                <input
                  id="price-jual-c"
                  type="number"
                  step="5000"
                  value={customPriceC}
                  onChange={(e) => setCustomPriceC(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="tarif-kargo" className="block text-cyan-300 font-semibold mb-1">Tarif Kargo Pesawat (Rp/kg)</label>
                <input
                  id="tarif-kargo"
                  type="number"
                  step="1000"
                  value={customCargo}
                  onChange={(e) => setCustomCargo(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums"
                />
              </div>
            </div>

            {/* Save Button & Change Password Trigger */}
            {savePriceAlert && (
              <div className="flex items-center justify-center gap-2 font-bold text-emerald-300 text-xs sm:text-sm py-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Harga Jual & Tarif Kargo Berhasil Disimpan Permanen ke Batch Ini!</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSaveHppSettings}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all touch-manipulation focus-ring min-h-[42px]"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Harga & Kargo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOldPassInput('');
                  setNewPassInput('');
                  setChangePassMsg(null);
                  setShowChangePassModal(true);
                }}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center justify-center sm:justify-start gap-1 py-1 focus-ring"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ubah Password Akses HPP</span>
              </button>
            </div>

          </div>
        )}
      </section>

      {/* Modal: Ganti Password HPP */}
      {showChangePassModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-change-pass-title"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl animate-in fade-in">
            <h2 id="modal-change-pass-title" className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              Ganti Password Akses HPP
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              Ubah kata sandi untuk melindungi akses laporan HPP & Laba.
            </p>

            {changePassMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-bold mb-3 ${
                changePassMsg.type === 'success' 
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/80 border border-rose-600/60 text-rose-200'
              }`}>
                {changePassMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password Lama:</label>
                <input
                  type="password"
                  required
                  value={oldPassInput}
                  onChange={(e) => setOldPassInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus-ring"
                  placeholder="Password saat ini"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password Baru:</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus-ring"
                  placeholder="Password baru (min. 3 karakter)"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs focus-ring"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/30 focus-ring"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
