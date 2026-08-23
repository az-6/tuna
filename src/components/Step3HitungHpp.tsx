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
  Check,
  ShieldAlert,
  ArrowLeft,
  Save,
  CheckCircle2,
  LogOut,
  RotateCcw
} from 'lucide-react';

export const Step3HitungHpp: React.FC = () => {
  const {
    activeBatch,
    activeBatchFish,
    packagingPrices,
    updateBatch,
    canViewHpp,
    canManageFinancials,
    profile,
    signOut,
    finalizeBatch,
    reopenBatch,
    setActiveTab,
    openPackagingModal
  } = useApp();

  // Selection scope
  const [calcScope, setCalcScope] = useState<'ALL' | 'DONE_ONLY'>('DONE_ONLY');

  // Dynamic Inputs per Batch
  const [customCargo, setCustomCargo] = useState<number>(activeBatch.tarifKargoPerKgLoin ?? 31000);
  const [customPriceA, setCustomPriceA] = useState<number>(activeBatch.hargaJualLoinA ?? 150000);
  const [customPriceB, setCustomPriceB] = useState<number>(activeBatch.hargaJualLoinB ?? 135000);
  const [customPriceC, setCustomPriceC] = useState<number>(activeBatch.hargaJualLoinC ?? 120000);

  // By-Product state
  const [tetelanKgInput, setTetelanKgInput] = useState<number>(activeBatch.tetelanKg ?? 0);
  const [tulangKgInput, setTulangKgInput] = useState<number>(activeBatch.tulangKg ?? 0);
  const [tetelanPriceInput, setTetelanPriceInput] = useState<number>(activeBatch.hargaTetelanPerKg ?? packagingPrices.tetelanPricePerKg ?? 25000);
  const [tulangPriceInput, setTulangPriceInput] = useState<number>(activeBatch.hargaTulangPerKg ?? packagingPrices.tulangPricePerKg ?? 3000);

  const [savePriceAlert, setSavePriceAlert] = useState(false);
  const [saveByProductAlert, setSaveByProductAlert] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isChangingLifecycle, setIsChangingLifecycle] = useState(false);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Sync state if activeBatch changes
  useEffect(() => {
    setCustomCargo(activeBatch.tarifKargoPerKgLoin ?? 31000);
    setCustomPriceA(activeBatch.hargaJualLoinA ?? 150000);
    setCustomPriceB(activeBatch.hargaJualLoinB ?? 135000);
    setCustomPriceC(activeBatch.hargaJualLoinC ?? 120000);
    setTetelanKgInput(activeBatch.tetelanKg ?? 0);
    setTulangKgInput(activeBatch.tulangKg ?? 0);
    setTetelanPriceInput(activeBatch.hargaTetelanPerKg ?? packagingPrices.tetelanPricePerKg ?? 25000);
    setTulangPriceInput(activeBatch.hargaTulangPerKg ?? packagingPrices.tulangPricePerKg ?? 3000);
  }, [
    activeBatch.id,
    activeBatch.tarifKargoPerKgLoin,
    activeBatch.hargaJualLoinA,
    activeBatch.hargaJualLoinB,
    activeBatch.hargaJualLoinC,
    activeBatch.tetelanKg,
    activeBatch.tulangKg,
    activeBatch.hargaTetelanPerKg,
    activeBatch.hargaTulangPerKg,
    packagingPrices.tetelanPricePerKg,
    packagingPrices.tulangPricePerKg
  ]);

  const [showDetailBiaya, setShowDetailBiaya] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showByProductSection, setShowByProductSection] = useState(false);

  // Save HPP selling prices & cargo permanently to batch
  const handleSaveHppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBatch(activeBatch.id, {
        hargaJualLoinA: Math.max(0, customPriceA),
        hargaJualLoinB: Math.max(0, customPriceB),
        hargaJualLoinC: Math.max(0, customPriceC),
        tarifKargoPerKgLoin: Math.max(0, customCargo)
      });
      setSavePriceAlert(true);
      setTimeout(() => setSavePriceAlert(false), 2500);
    } catch {
      setSavePriceAlert(false);
    }
  };

  // Save By-Product info to batch
  const handleSaveByProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBatch(activeBatch.id, {
        tetelanKg: Math.max(0, tetelanKgInput),
        tulangKg: Math.max(0, tulangKgInput),
        hargaTetelanPerKg: Math.max(0, tetelanPriceInput),
        hargaTulangPerKg: Math.max(0, tulangPriceInput)
      });
      setSaveByProductAlert(true);
      setTimeout(() => setSaveByProductAlert(false), 2500);
    } catch {
      setSaveByProductAlert(false);
    }
  };

  // Filter selected fish
  const targetFishList = useMemo(() => {
    return activeBatchFish.filter((fish) => {
      if (calcScope === 'ALL') return true;
      if (calcScope === 'DONE_ONLY') return fish.status === 'done';
      return true;
    });
  }, [activeBatchFish, calcScope]);

  // Memoized Exact Real HPP Calculation
  const hpp = useMemo(() => {
    return calculateExactHpp(
      activeBatch,
      targetFishList,
      packagingPrices,
      undefined,
      tetelanKgInput,
      tulangKgInput,
      customCargo,
      undefined,
      customPriceA,
      customPriceB,
      customPriceC,
      {
        totalIkanCount: activeBatchFish.length,
        doneIkanCount: activeBatchFish.filter(fish => fish.status === 'done').length,
        pendingIkanCount: activeBatchFish.filter(fish => fish.status !== 'done').length
      }
    );
  }, [
    activeBatch,
    targetFishList,
    packagingPrices,
    tetelanKgInput,
    tulangKgInput,
    customCargo,
    customPriceA,
    customPriceB,
    customPriceC,
    activeBatchFish
  ]);

  const isProfitable = hpp.totalLabaKotorBatch >= 0;

  // Export to Excel (Dynamic Import with secure SheetJS 0.20.3)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const isPersistedFinal = activeBatch.lifecycleStatus === 'FINAL';
      const titleBanner = isPersistedFinal
        ? "RINGKASAN BATCH KTG TUNA (STATUS: HPP FINAL RESMI)"
        : `RINGKASAN BATCH KTG TUNA (STATUS: ESTIMASI INTERIM / WIP - ${hpp.pendingIkanCount} IKAN PENDING)`;

      const dataRingkasan = [
        [titleBanner],
        ["Nama Nelayan / Kapal", activeBatch.nelayan],
        ["Kode Batch", activeBatch.code || activeBatch.id],
        ["Tanggal", activeBatch.tanggal],
        ["Status Batch", isPersistedFinal ? "FINAL (Disahkan & Dikunci)" : `WIP (${hpp.pendingIkanCount} Ikan Belum Selesai)`],
        ["Total Ikan Dihitung", `${targetFishList.length} Ekor`],
        ["Total Berat Utuh", `${hpp.totalBeratUtuh.toFixed(1)} kg`],
        ["Hasil Loin Saleable (A+B+C)", `${hpp.saleableLoinKg.toFixed(1)} kg`],
        ["Loin Reject (Terisolasi)", `${hpp.loinRejectKg.toFixed(1)} kg`],
        ["Rendemen Saleable (Resmi)", `${(hpp.yieldRendemenPersen * 100).toFixed(1)}%`],
        [""],
        ["ARUS PENDAPATAN (REVENUE)"],
        ["Omset Penjualan Loin", hpp.totalOmzetLoin],
        ["Pemasukan By-Product (Tetelan & Tulang)", hpp.totalByProductRevenue],
        ["Total Pendapatan Batch", hpp.totalRevenueBatch],
        [""],
        ["STRUKTUR BIAYA & PENGELUARAN (COST POOL)"],
        ["Modal Bahan Baku Ikan", hpp.modalBahanBakuIkan],
        ["Biaya Armada", hpp.biayaArmada],
        ["Biaya Bahan Kemasan Total", hpp.totalBiayaKemasan],
        ["Biaya Kargo Pesawat Total", hpp.totalBiayaKargo],
        ["Total Biaya Kotor Batch (Gross Cost Pool)", hpp.grossCostPool],
        ["Kredit By-Product yang Diterapkan", -hpp.byProductCreditApplied],
        ["Pendapatan By-Product di Atas Cost Pool", hpp.excessByProductRevenue],
        ["Total Biaya Bersih Batch (Net Cost Pool)", hpp.netCostPool],
        [""],
        ["HPP BATCH RESMI (BLENDED PROCESS COSTING)"],
        ["HPP FOB Bersih Rata-Rata (Rp/kg)", Math.round(hpp.blendedFobHppPerKg)],
        ["HPP Landed Bersih Rata-Rata (Rp/kg)", Math.round(hpp.blendedLandedHppPerKg)],
        [""],
        ["ANALISIS HPP PER GRADE (TRACE-AND-ALLOCATE)"],
        ["Grade", "Kg Output", "Biaya Ikan Traced", "Alokasi Kemasan", "Alokasi Kargo", "Kredit By-Product", "Total Biaya Teralokasi", "HPP Landed (Rp/kg)", "Harga Jual (Rp/kg)", "Laba Kotor Grade", "Margin %"],
        [
          "Grade A",
          hpp.gradeAllocations.A.weightKg,
          Math.round(hpp.gradeAllocations.A.rawFishCostTraced),
          Math.round(hpp.gradeAllocations.A.packagingCostAllocated),
          Math.round(hpp.gradeAllocations.A.cargoCostAllocated),
          Math.round(hpp.gradeAllocations.A.byProductCreditAllocated),
          Math.round(hpp.gradeAllocations.A.allocatedTotalCost),
          Math.round(hpp.gradeAllocations.A.hppLandedPerKg),
          hpp.gradeAllocations.A.sellingPricePerKg,
          Math.round(hpp.gradeAllocations.A.grossProfit),
          `${(hpp.gradeAllocations.A.marginPercent * 100).toFixed(1)}%`
        ],
        [
          "Grade B",
          hpp.gradeAllocations.B.weightKg,
          Math.round(hpp.gradeAllocations.B.rawFishCostTraced),
          Math.round(hpp.gradeAllocations.B.packagingCostAllocated),
          Math.round(hpp.gradeAllocations.B.cargoCostAllocated),
          Math.round(hpp.gradeAllocations.B.byProductCreditAllocated),
          Math.round(hpp.gradeAllocations.B.allocatedTotalCost),
          Math.round(hpp.gradeAllocations.B.hppLandedPerKg),
          hpp.gradeAllocations.B.sellingPricePerKg,
          Math.round(hpp.gradeAllocations.B.grossProfit),
          `${(hpp.gradeAllocations.B.marginPercent * 100).toFixed(1)}%`
        ],
        [
          "Grade C",
          hpp.gradeAllocations.C.weightKg,
          Math.round(hpp.gradeAllocations.C.rawFishCostTraced),
          Math.round(hpp.gradeAllocations.C.packagingCostAllocated),
          Math.round(hpp.gradeAllocations.C.cargoCostAllocated),
          Math.round(hpp.gradeAllocations.C.byProductCreditAllocated),
          Math.round(hpp.gradeAllocations.C.allocatedTotalCost),
          Math.round(hpp.gradeAllocations.C.hppLandedPerKg),
          hpp.gradeAllocations.C.sellingPricePerKg,
          Math.round(hpp.gradeAllocations.C.grossProfit),
          `${(hpp.gradeAllocations.C.marginPercent * 100).toFixed(1)}%`
        ],
        ["TOTAL TERALOKASI", hpp.saleableLoinKg, "", "", "", "", Math.round(hpp.reconciliation.totalAllocatedCost), "", "", "", ""],
        ["SELISIH REKONSILIASI KE NET COST POOL", "", "", "", "", "", Math.round(hpp.reconciliation.difference), hpp.reconciliation.isReconciled ? "100% TIE-OUT (MATCH)" : "SELISIH"],
        [""],
        ["LABA KOTOR BATCH (TRUE GROSS PROFIT)", Math.round(hpp.totalLabaKotorBatch)],
        ["MARGIN KOTOR BATCH", `${(hpp.grossMarginPercent * 100).toFixed(1)}%`]
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(dataRingkasan);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan HPP & Rekonsiliasi");

      // Detail Per Ikan
      const maxLoinCount = Math.max(4, ...targetFishList.map(f => (f.loins || []).length));
      const loinHeaders = Array.from({ length: maxLoinCount }, (_, i) => `Loin ${i + 1} (kg)`);

      const dataDetail = [
        ["No", "Kode Ikan", "Berat Utuh (kg)", "Grade Nota (Beli)", "Grade Potong (Meja)", "Status", ...loinHeaders, "Total Loin (kg)", "Rendemen %"],
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
            f.status === 'done' ? 'Selesai' : 'Pending',
            ...loinWeights,
            tot,
            `${yld.toFixed(1)}%`
          ];
        })
      ];

      const wsDetail = XLSX.utils.aoa_to_sheet(dataDetail);
      XLSX.utils.book_append_sheet(wb, wsDetail, "Rincian Meja Potong");

      XLSX.writeFile(wb, `Laporan_HPP_${activeBatch.nelayan.replace(/[^a-zA-Z0-9]/g, '_')}_${activeBatch.code || activeBatch.id}.xlsx`);
    } catch (err) {
      console.error('Gagal export Excel:', err);
      alert('Gagal mengekspor data Excel. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFinalize = async () => {
    setIsChangingLifecycle(true);
    setLifecycleMessage(null);
    try {
      await finalizeBatch(activeBatch.id, hpp);
      setLifecycleMessage('Batch berhasil difinalisasi. Data operasional dan finansial kini terkunci.');
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : 'Finalisasi batch gagal.');
    } finally {
      setIsChangingLifecycle(false);
    }
  };

  const handleReopen = async () => {
    if (reopenReason.trim().length < 10) {
      setLifecycleMessage('Alasan reopen wajib diisi minimal 10 karakter untuk audit trail.');
      return;
    }
    setIsChangingLifecycle(true);
    setLifecycleMessage(null);
    try {
      await reopenBatch(activeBatch.id, reopenReason.trim());
      setReopenReason('');
      setLifecycleMessage('Batch dibuka kembali. Semua perubahan berikutnya tercatat di audit log.');
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : 'Reopen batch gagal.');
    } finally {
      setIsChangingLifecycle(false);
    }
  };

  // HPP dilindungi peran organisasi di Supabase, bukan password yang disimpan di browser.
  if (!canViewHpp) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-lg mx-auto py-6 px-2">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">

          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Akses HPP dibatasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Akun dengan peran <strong>{profile?.role || 'staff'}</strong> dapat mencatat produksi, tetapi hanya owner atau manager yang dapat melihat data biaya dan laba.
            </p>
          </div>

          {/* Quick packaging access for workers even when HPP is locked */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={openPackagingModal}
              className="w-full py-3 px-3 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all touch-manipulation focus-ring min-h-[44px]"
            >
              <Package className="w-4 h-4 text-purple-400" />
              <span>Pegawai: Catat Pemakaian Kemasan Batch Ini</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proses')}
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 mx-auto py-2 focus-ring min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Meja Potong</span>
            </button>
          </div>

        </div>

      </div>
    );
  }

  // Tampilan laporan untuk owner/manager.
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
              <span className="text-xs text-slate-400">&bull; Laporan Akuntansi & HPP</span>
            </div>
            <h1 id="hpp-heading" className="text-lg sm:text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Hitung HPP & Laba Kotor Batch
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Kalkulasi HPP resmi (Blended), analisis per grade (Trace-and-Allocate), dan rekonsiliasi biaya bersih batch ({activeBatch.nelayan}).
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 sm:pt-0 no-print">

            {/* Packaging Prices Button */}
            <button
              onClick={openPackagingModal}
              className="px-3.5 py-2.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[44px]"
              title="Catat Pemakaian & Biaya Kemasan Batch"
            >
              <Package className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>Biaya Kemasan</span>
            </button>

            {/* Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3.5 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[44px]"
              title="Unduh laporan lengkap (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{isExporting ? 'Memproses...' : 'Excel'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm touch-manipulation focus-ring min-h-[44px]"
              title="Cetak nota laporan HPP"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Session Button */}
            <button
              onClick={() => void signOut()}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 touch-manipulation focus-ring min-h-[44px]"
              title="Keluar dan kunci sesi"
              aria-label="Keluar dan kunci sesi"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Keluar</span>
            </button>

          </div>
        </div>

        {/* Calculation Scope Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs no-print" role="group" aria-label="Cakupan Data Ikan">
          <button
            type="button"
            onClick={() => setCalcScope('DONE_ONLY')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition-all touch-manipulation focus-ring text-center min-h-[44px] flex items-center justify-center ${
              calcScope === 'DONE_ONLY'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ikan Selesai Potong Saja ({activeBatchFish.filter(f => f.status === 'done').length} Ekor Selesai)
          </button>
          <button
            type="button"
            onClick={() => setCalcScope('ALL')}
            className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition-all touch-manipulation focus-ring text-center min-h-[44px] flex items-center justify-center ${
              calcScope === 'ALL'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Ikan Masuk / WIP ({activeBatchFish.length} Ekor Terdaftar)
          </button>
        </div>
      </section>

      {/* Batch Status Banner: status persisten adalah sumber kebenaran finalisasi. */}
      {activeBatch.lifecycleStatus !== 'FINAL' ? (
        <div className="p-4 bg-amber-950/70 border-2 border-amber-500/50 rounded-2xl text-amber-200 text-xs flex items-start gap-3 shadow-md">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-amber-300 block text-sm">
              {hpp.isFinalizable ? 'Status Batch: Siap Finalisasi' : 'Status Batch: Estimasi Interim / WIP'}
            </span>
            <p className="text-amber-200/90 leading-relaxed">
              {hpp.isFinalizable
                ? 'Perhitungan telah lolos pemeriksaan dasar. Finalisasi harus dikonfirmasi owner/manager agar snapshot HPP tersimpan dan batch dikunci.'
                : 'Kalkulasi di bawah masih provisional. Selesaikan seluruh pemeriksaan sebelum finalisasi.'}
            </p>
            {!hpp.isFinalizable && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-100">
                {hpp.finalizationIssues.map(issue => <li key={issue}>{issue}</li>)}
              </ul>
            )}
            <button
              type="button"
              onClick={handleFinalize}
              disabled={!hpp.isFinalizable || isChangingLifecycle || !canManageFinancials}
              className="mt-3 min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              {isChangingLifecycle ? 'Memproses…' : 'Finalisasi & Kunci Batch'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-950/70 border-2 border-emerald-500/50 rounded-2xl text-emerald-200 text-xs shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-extrabold text-sm text-emerald-300">Status Batch: FINAL — snapshot HPP tersimpan & data terkunci</span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 font-bold">
              {hpp.doneIkanCount} / {hpp.totalIkanCount} Ekor Selesai
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="reopen-reason">Alasan membuka kembali batch</label>
            <input
              id="reopen-reason"
              value={reopenReason}
              onChange={event => setReopenReason(event.target.value)}
              placeholder="Alasan koreksi (wajib untuk audit trail)"
              className="min-h-[44px] rounded-xl border border-emerald-500/30 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-ring"
            />
            <button
              type="button"
              onClick={handleReopen}
              disabled={isChangingLifecycle || reopenReason.trim().length < 10}
              className="min-h-[44px] rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-2 font-bold text-amber-200 hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
            >
              <RotateCcw className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Reopen Batch
            </button>
          </div>
        </div>
      )}

      {lifecycleMessage && (
        <div role="status" className="rounded-xl border border-cyan-500/40 bg-cyan-950/70 p-3 text-xs font-semibold text-cyan-100">
          {lifecycleMessage}
        </div>
      )}

      {/* 2. Top Executive Summary Cards (Big, High-Contrast KPIs) */}
      <section aria-labelledby="kpi-summary-heading" className="space-y-3">
        <h2 id="kpi-summary-heading" className="sr-only">Ringkasan Angka Utama</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Card 1: Total Omset Penjualan Batch */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Total Pendapatan Batch</span>
              <DollarSign className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white font-mono tabular-nums break-all sm:break-normal">
              {formatRupiah(hpp.totalRevenueBatch)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Loin: {formatRupiah(hpp.totalOmzetLoin)} {hpp.totalByProductRevenue > 0 ? `+ By-Product: ${formatRupiah(hpp.totalByProductRevenue)}` : ''}
            </p>
          </div>

          {/* Card 2: Laba Kotor Batch (True Gross Profit) */}
          <div className={`border rounded-2xl p-4 shadow-xl ${
            isProfitable
              ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/50'
              : 'bg-gradient-to-br from-rose-950/60 to-slate-900 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-semibold text-slate-200">Laba Kotor Batch</span>
                <span className="text-[10px] text-slate-400 block font-normal">(True Gross Profit)</span>
              </div>
              <TrendingUp className={`w-4 h-4 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`} aria-hidden="true" />
            </div>
            <div className={`text-lg sm:text-2xl font-black font-mono tabular-nums break-all sm:break-normal ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatRupiah(hpp.totalLabaKotorBatch)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-bold">
              Margin Kotor: <span className="font-mono tabular-nums">{formatPercent(hpp.grossMarginPercent)}</span> dari omset
            </p>
          </div>

          {/* Card 3: Rendemen & Total Loin Saleable */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Hasil Loin Layak Jual</span>
              <Scale className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono tabular-nums break-all sm:break-normal">
              {formatKg(hpp.saleableLoinKg)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Rendemen Saleable: <strong className={hpp.yieldRendemenPersen >= 0.60 ? 'text-emerald-400' : 'text-amber-300'}>
                {formatPercent(hpp.yieldRendemenPersen)}
              </strong>
              {hpp.loinRejectKg > 0 && (
                <span className="text-rose-400 ml-1 text-[10px] block font-sans">
                  (+ {formatKg(hpp.loinRejectKg)} Reject terisolasi)
                </span>
              )}
            </p>
          </div>

        </div>
      </section>

      {/* 3. HPP BATCH RESMI: BLENDED LANDED COGS */}
      <section
        aria-labelledby="official-hpp-heading"
        className="bg-gradient-to-br from-slate-900 to-cyan-950/40 border-2 border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Standar Resmi Batch
              </span>
              <span className="text-xs text-slate-400">&bull; IAS 2 Process Costing</span>
            </div>
            <h2 id="official-hpp-heading" className="text-base sm:text-lg font-extrabold text-white mt-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              {activeBatch.lifecycleStatus === 'FINAL' ? 'HPP Batch Resmi (Blended Costing)' : 'Estimasi HPP Batch (Blended WIP)'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Total biaya bersih batch dibagi rata ke seluruh kg loin layak jual ({formatKg(hpp.saleableLoinKg)}).
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-cyan-500/40 text-right shrink-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">HPP Landed Rata-Rata</span>
            <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tabular-nums">
              {formatRupiah(Math.round(hpp.blendedLandedHppPerKg))} <span className="text-xs font-normal text-slate-400 font-sans">/kg</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400 font-sans">HPP FOB Gudang (Sebelum Kargo):</span>
            <span className="font-bold text-white text-sm tabular-nums">{formatRupiah(Math.round(hpp.blendedFobHppPerKg))}/kg</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400 font-sans">Total Biaya Bersih Batch (Net Cost Pool):</span>
            <span className="font-bold text-cyan-300 text-sm tabular-nums">{formatRupiah(Math.round(hpp.netCostPool))}</span>
          </div>
        </div>
      </section>

      {/* 4. ANALISIS HPP PER GRADE: TRACE-AND-ALLOCATE */}
      <section
        aria-labelledby="grade-analysis-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 id="grade-analysis-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Analisis HPP Per Grade (Trace-and-Allocate)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Alokasi biaya input ikan riil tertelusur ke hasil meja potong + alokasi beban kemasan & kargo.
            </p>
          </div>
        </div>

        {/* 3 Grade Price Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">

          {/* Grade A */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-400 font-sans">Loin Grade A ({formatKg(hpp.gradeAllocations.A.weightKg)})</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {formatPercent(hpp.gradeAllocations.A.weightSharePct)}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.gradeAllocations.A.hppLandedPerKg))} <span className="text-xs font-normal text-slate-400 font-sans">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80 font-sans">
              <div className="flex justify-between">
                <span>HPP FOB:</span>
                <span className="font-mono text-slate-300 font-bold">{formatRupiah(Math.round(hpp.gradeAllocations.A.cogsFobPerKg))}/kg</span>
              </div>
              <div className="flex justify-between">
                <span>Harga Jual:</span>
                <span className="font-bold text-emerald-300 font-mono">{formatRupiah(hpp.gradeAllocations.A.sellingPricePerKg)}/kg</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Margin Kotor:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatPercent(hpp.gradeAllocations.A.marginPercent)}</span>
              </div>
            </div>
          </div>

          {/* Grade B */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-blue-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-400 font-sans">Loin Grade B ({formatKg(hpp.gradeAllocations.B.weightKg)})</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                {formatPercent(hpp.gradeAllocations.B.weightSharePct)}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.gradeAllocations.B.hppLandedPerKg))} <span className="text-xs font-normal text-slate-400 font-sans">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80 font-sans">
              <div className="flex justify-between">
                <span>HPP FOB:</span>
                <span className="font-mono text-slate-300 font-bold">{formatRupiah(Math.round(hpp.gradeAllocations.B.cogsFobPerKg))}/kg</span>
              </div>
              <div className="flex justify-between">
                <span>Harga Jual:</span>
                <span className="font-bold text-blue-300 font-mono">{formatRupiah(hpp.gradeAllocations.B.sellingPricePerKg)}/kg</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Margin Kotor:</span>
                <span className="font-bold text-blue-400 font-mono">{formatPercent(hpp.gradeAllocations.B.marginPercent)}</span>
              </div>
            </div>
          </div>

          {/* Grade C */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-amber-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-400 font-sans">Loin Grade C ({formatKg(hpp.gradeAllocations.C.weightKg)})</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {formatPercent(hpp.gradeAllocations.C.weightSharePct)}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tabular-nums break-all sm:break-normal">
              {formatRupiah(Math.round(hpp.gradeAllocations.C.hppLandedPerKg))} <span className="text-xs font-normal text-slate-400 font-sans">/kg</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80 font-sans">
              <div className="flex justify-between">
                <span>HPP FOB:</span>
                <span className="font-mono text-slate-300 font-bold">{formatRupiah(Math.round(hpp.gradeAllocations.C.cogsFobPerKg))}/kg</span>
              </div>
              <div className="flex justify-between">
                <span>Harga Jual:</span>
                <span className="font-bold text-amber-300 font-mono">{formatRupiah(hpp.gradeAllocations.C.sellingPricePerKg)}/kg</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Margin Kotor:</span>
                <span className="font-bold text-amber-400 font-mono">{formatPercent(hpp.gradeAllocations.C.marginPercent)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. REKONSILIASI WAJIB TIE-OUT CARD */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <span className="font-extrabold text-white font-sans flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Rekonsiliasi Total Biaya Bersih Batch (Cost Pool Tie-Out)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              hpp.reconciliation.isReconciled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {hpp.reconciliation.isReconciled ? '✓ 100% RECONCILED (Selisih Rp 0)' : `⚠️ Selisih: ${formatRupiah(hpp.reconciliation.difference)}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-sans">Total Alokasi Grade A+B+C:</span>
              <span className="font-bold text-white text-xs tabular-nums">{formatRupiah(Math.round(hpp.reconciliation.totalAllocatedCost))}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-sans">Total Biaya Bersih Batch (Net):</span>
              <span className="font-bold text-cyan-300 text-xs tabular-nums">{formatRupiah(Math.round(hpp.reconciliation.netCostPool))}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-sans">Status Invariant:</span>
              <span className="font-bold text-emerald-400 text-xs font-sans">Tepat & Tie-out Sempurna</span>
            </div>
          </div>
        </div>

      </section>

      {/* 6. INPUT BY-PRODUCT (TETELAN & TULANG) */}
      <section
        aria-labelledby="byproduct-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 no-print"
      >
        <button
          type="button"
          onClick={() => setShowByProductSection(!showByProductSection)}
          className="w-full flex items-center justify-between text-left touch-manipulation focus-ring min-h-[44px]"
          aria-expanded={showByProductSection}
        >
          <div>
            <h2 id="byproduct-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              Input Penjualan By-Product (Tetelan & Tulang)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Catat kilogram tetelan & tulang yang laku terjual untuk mengurangi total modal pokok (HPP) batch ini.
            </p>
          </div>
          <div className="p-1 rounded-lg bg-slate-950 text-slate-400">
            {showByProductSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showByProductSection && (
          <form onSubmit={handleSaveByProduct} className="space-y-3.5 pt-3 border-t border-slate-800 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Tetelan */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-300">Tetelan Tuna</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatRupiah((tetelanKgInput || 0) * (tetelanPriceInput || 0))}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="tetelan-kg-input" className="block text-[11px] text-slate-300 font-semibold mb-1">Berat Terjual (kg):</label>
                    <input
                      id="tetelan-kg-input"
                      disabled={activeBatch.lifecycleStatus === 'FINAL'}
                      type="number"
                      step="0.1"
                      min="0"
                      value={tetelanKgInput || ''}
                      onChange={(e) => setTetelanKgInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="tetelan-price-input" className="block text-[11px] text-slate-300 font-semibold mb-1">Harga / kg (Rp):</label>
                    <input
                      id="tetelan-price-input"
                      disabled={activeBatch.lifecycleStatus === 'FINAL'}
                      type="number"
                      step="500"
                      min="0"
                      value={tetelanPriceInput || ''}
                      onChange={(e) => setTetelanPriceInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Tulang */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-300">Tulang / Kepala Tuna</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatRupiah((tulangKgInput || 0) * (tulangPriceInput || 0))}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="tulang-kg-input" className="block text-[11px] text-slate-300 font-semibold mb-1">Berat Terjual (kg):</label>
                    <input
                      id="tulang-kg-input"
                      disabled={activeBatch.lifecycleStatus === 'FINAL'}
                      type="number"
                      step="0.1"
                      min="0"
                      value={tulangKgInput || ''}
                      onChange={(e) => setTulangKgInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="tulang-price-input" className="block text-[11px] text-slate-300 font-semibold mb-1">Harga / kg (Rp):</label>
                    <input
                      id="tulang-price-input"
                      disabled={activeBatch.lifecycleStatus === 'FINAL'}
                      type="number"
                      step="500"
                      min="0"
                      value={tulangPriceInput || ''}
                      onChange={(e) => setTulangPriceInput(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

            </div>

            {saveByProductAlert && (
              <div className="flex items-center justify-center gap-2 font-bold text-emerald-300 text-xs py-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Data By-Product Berhasil Disimpan Permanen ke Batch!</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={activeBatch.lifecycleStatus === 'FINAL'}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all touch-manipulation focus-ring min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Realisasi By-Product</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 7. Rincian Komponen Biaya Modal (Accordion) */}
      <section
        aria-labelledby="cost-breakdown-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
      >
        <button
          type="button"
          onClick={() => setShowDetailBiaya(!showDetailBiaya)}
          className="w-full flex items-center justify-between text-left touch-manipulation focus-ring min-h-[44px]"
          aria-expanded={showDetailBiaya}
        >
          <div>
            <h2 id="cost-breakdown-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Rincian Komponen Biaya Kemasan & Kargo (Klik Buka/Tutup)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparansi hitungan biaya es balok, styrofoam, kargo, dan potongan penjualan by-product.
            </p>
          </div>
          <div className="p-1 rounded-lg bg-slate-950 text-slate-400">
            {showDetailBiaya ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showDetailBiaya && (
          <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs font-mono animate-in fade-in">

            {/* Modal Ikan & Armada */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white block font-sans">Modal Pembelian Ikan + Armada</span>
                <span className="text-[11px] text-slate-400">
                  Pembelian: {formatRupiah(hpp.modalBahanBakuIkan)} + Armada: {formatRupiah(hpp.biayaArmada)}
                </span>
              </div>
              <span className="font-bold text-white text-sm sm:text-base tabular-nums">{formatRupiah(hpp.modalBahanBakuIkan + hpp.biayaArmada)}</span>
            </div>

            {/* Biaya Kemasan */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white block font-sans">Biaya Bahan Kemasan & Es</span>
                <span className="text-[11px] text-slate-400">
                  Es ({hpp.packagingDetails?.qtyEs} balok), Box Styrofoam ({hpp.packagingDetails?.qtyBox} box), Jelly Ice, Plastik & Lakban
                  {hpp.packagingDetails?.customMaterials && hpp.packagingDetails.customMaterials.length > 0 && (
                    <span className="text-purple-300 block sm:inline sm:ml-1 font-sans font-medium">
                      + {hpp.packagingDetails.customMaterials.length} Material Tambahan
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPackagingModal}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline font-sans p-1 focus-ring"
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
                  {formatRupiah(hpp.kargoPerKg)}/kg x {formatKg(hpp.saleableLoinKg)} loin saleable
                </span>
              </div>
              <span className="font-bold text-cyan-300 text-sm sm:text-base tabular-nums">{formatRupiah(hpp.totalBiayaKargo)}</span>
            </div>

            {/* Pemasukan By-Product */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-300 block font-sans">Kredit By-Product yang Diterapkan ke HPP</span>
                <span className="text-[11px] text-slate-400">
                  {hpp.byProductCreditApplied > 0
                    ? `Tetelan ${formatKg(hpp.tetelanKg)} + Tulang ${formatKg(hpp.tulangKg)}; kredit maksimal sebesar gross cost pool`
                    : 'Belum dimasukkan (Rp 0)'}
                </span>
              </div>
              <span className={`font-bold text-sm sm:text-base tabular-nums ${hpp.byProductCreditApplied > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {hpp.byProductCreditApplied > 0 ? `- ${formatRupiah(hpp.byProductCreditApplied)}` : 'Rp 0'}
              </span>
            </div>

            {hpp.excessByProductRevenue > 0 && (
              <div className="bg-cyan-950/50 p-3 rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-cyan-100">Pendapatan by-product di atas cost pool (pendapatan lain-lain)</span>
                <span className="font-bold font-mono text-cyan-300">+ {formatRupiah(hpp.excessByProductRevenue)}</span>
              </div>
            )}

          </div>
        )}
      </section>

      {/* 8. Penyesuaian Harga Jual & Tarif Kargo */}
      <section
        aria-labelledby="simulator-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 no-print"
      >
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between text-left touch-manipulation focus-ring min-h-[44px]"
          aria-expanded={showSimulator}
        >
          <div>
            <h2 id="simulator-heading" className="font-extrabold text-white text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              Penyesuaian Harga Jual Pasar & Tarif Kargo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ubah harga penawaran B2B atau tarif kargo untuk simulasi perolehan laba kotor batch.
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
                  disabled={activeBatch.lifecycleStatus === 'FINAL'}
                  type="number"
                  step="5000"
                  min="0"
                  value={customPriceA}
                  onChange={(e) => setCustomPriceA(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums min-h-[44px]"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="price-jual-b" className="block text-blue-300 font-semibold mb-1">Harga Jual Grade B (Rp/kg)</label>
                <input
                  id="price-jual-b"
                  disabled={activeBatch.lifecycleStatus === 'FINAL'}
                  type="number"
                  step="5000"
                  min="0"
                  value={customPriceB}
                  onChange={(e) => setCustomPriceB(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums min-h-[44px]"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="price-jual-c" className="block text-amber-300 font-semibold mb-1">Harga Jual Grade C (Rp/kg)</label>
                <input
                  id="price-jual-c"
                  disabled={activeBatch.lifecycleStatus === 'FINAL'}
                  type="number"
                  step="5000"
                  min="0"
                  value={customPriceC}
                  onChange={(e) => setCustomPriceC(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums min-h-[44px]"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label htmlFor="tarif-kargo" className="block text-cyan-300 font-semibold mb-1">Tarif Kargo Pesawat (Rp/kg)</label>
                <input
                  id="tarif-kargo"
                  disabled={activeBatch.lifecycleStatus === 'FINAL'}
                  type="number"
                  step="1000"
                  min="0"
                  value={customCargo}
                  onChange={(e) => setCustomCargo(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono text-base focus-ring tabular-nums min-h-[44px]"
                />
              </div>
            </div>

            {/* Save Button */}
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
                disabled={activeBatch.lifecycleStatus === 'FINAL' || !canManageFinancials}
                className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all touch-manipulation focus-ring min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Harga & Kargo</span>
              </button>
              {activeBatch.lifecycleStatus === 'FINAL' && (
                <span className="text-xs font-semibold text-amber-300">Batch FINAL terkunci. Reopen untuk mengubah.</span>
              )}
            </div>

          </div>
        )}
      </section>

    </div>
  );
};
