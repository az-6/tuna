import { BatchInfo, FishRecord, PackagingPrices, HppCalculationResult, GradeCostAllocation } from '../types';

/**
 * Mendapatkan tanggal saat ini dalam zona waktu Asia/Jakarta (WIB)
 */
export function getJakartaDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch {
    // Fallback if Intl timeZone fails
    const tzOffset = 7 * 60 * 60 * 1000;
    const wib = new Date(date.getTime() + tzOffset);
    return wib.toISOString().slice(0, 10);
  }
}

/**
 * Sanitasi angka non-negatif yang aman (mencegah NaN, Infinity, dan angka negatif)
 */
export function safeNonNegative(val: number | undefined | null, fallback = 0): number {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  return Math.max(0, val);
}

export function calculateExactHpp(
  batch: BatchInfo,
  fishList: FishRecord[],
  packagingPrices: PackagingPrices,
  _simYieldOverride?: number, // Deprecated
  customTetelanKg?: number,
  customTulangKg?: number,
  customCargo?: number,
  customUsage?: {
    esBalok?: number;
    styrofoamBox?: number;
    jellyIceLusin?: number;
    plastikLayer?: number;
    plastikStyrofoam?: number;
    lakbanRoll?: number;
  },
  customPriceA?: number,
  customPriceB?: number,
  customPriceC?: number,
  batchProgress?: {
    totalIkanCount: number;
    doneIkanCount: number;
    pendingIkanCount: number;
  }
): HppCalculationResult {
  const calculationScopeCount = fishList.length;
  let doneIkanCount = 0;
  let pendingIkanCount = 0;
  let totalBeratUtuh = 0;

  let grossCutOutputKg = 0; // Total semua potongan fisik
  let loinAKg = 0;
  let loinBKg = 0;
  let loinCKg = 0;
  let loinRejectKg = 0;

  let modalBahanBakuIkan = 0;

  let loinB_DariBeliC_Kg = 0;
  let loinA_DariBeliC_Kg = 0;
  let loinA_DariBeliB_Kg = 0;
  let loinC_DariBeliB_Kg = 0;

  // Nullish coalescing + safe non-negative clamping for purchase prices & armada
  const hargaBeliA = safeNonNegative(batch.hargaBeliGradeA, 50000);
  const hargaBeliB = safeNonNegative(batch.hargaBeliGradeB, 46000);
  const hargaBeliC = safeNonNegative(batch.hargaBeliGradeC, 43000);
  const biayaArmada = safeNonNegative(batch.biayaArmada, 0);

  // 1. Hitung total berat utuh dan modal bahan baku ikan aktual
  fishList.forEach((fish) => {
    if (fish.status === 'done') {
      doneIkanCount += 1;
    } else {
      pendingIkanCount += 1;
    }

    const w = safeNonNegative(fish.beratUtuh, 0);
    totalBeratUtuh += w;

    if (fish.gradeNota === 'A') {
      modalBahanBakuIkan += w * hargaBeliA;
    } else if (fish.gradeNota === 'B') {
      modalBahanBakuIkan += w * hargaBeliB;
    } else {
      modalBahanBakuIkan += w * hargaBeliC;
    }

    (fish.loins || []).forEach((l) => {
      const lw = safeNonNegative(l.weight, 0);
      grossCutOutputKg += lw;

      if (l.grade === 'A') {
        loinAKg += lw;
        if (fish.gradeNota === 'C') loinA_DariBeliC_Kg += lw;
        if (fish.gradeNota === 'B') loinA_DariBeliB_Kg += lw;
      } else if (l.grade === 'B') {
        loinBKg += lw;
        if (fish.gradeNota === 'C') loinB_DariBeliC_Kg += lw;
      } else if (l.grade === 'C') {
        loinCKg += lw;
        if (fish.gradeNota === 'B' || fish.gradeNota === 'A') loinC_DariBeliB_Kg += lw;
      } else if (l.grade === 'Reject') {
        loinRejectKg += lw;
      }
    });
  });

  // Batch Status: 'FINAL' if all fish in batch are done and at least 1 fish exists, else 'WIP'
  const progress = batchProgress ?? {
    totalIkanCount: calculationScopeCount,
    doneIkanCount,
    pendingIkanCount
  };
  const totalIkanCount = safeNonNegative(progress.totalIkanCount, calculationScopeCount);
  doneIkanCount = safeNonNegative(progress.doneIkanCount, doneIkanCount);
  pendingIkanCount = safeNonNegative(progress.pendingIkanCount, pendingIkanCount);
  const batchStatus: 'FINAL' | 'WIP' = (totalIkanCount > 0 && pendingIkanCount === 0) ? 'FINAL' : 'WIP';

  // SALEABLE LOIN KG (Hanya Grade A, B, C — Reject dieksklusi dari produk jual)
  const saleableLoinKg = loinAKg + loinBKg + loinCKg;
  const totalLoinKg = saleableLoinKg; // Alias untuk backwards compatibility

  // RENDEMEN:
  // Rendemen Resmi = saleableLoinKg / totalBeratUtuh (hanya memperhitungkan daging layak jual)
  // Gross Rendemen = grossCutOutputKg / totalBeratUtuh (termasuk Reject)
  const yieldRendemenPersen = totalBeratUtuh > 0 ? (saleableLoinKg / totalBeratUtuh) : 0;
  const grossYieldPersen = totalBeratUtuh > 0 ? (grossCutOutputKg / totalBeratUtuh) : 0;
  const yieldAktual = yieldRendemenPersen;
  const yieldSimulasi = yieldRendemenPersen;

  // Proporsi per Grade (terhadap total saleable loin)
  const propA = saleableLoinKg > 0 ? loinAKg / saleableLoinKg : 0;
  const propB = saleableLoinKg > 0 ? loinBKg / saleableLoinKg : 0;
  const propC = saleableLoinKg > 0 ? loinCKg / saleableLoinKg : 0;

  // By-Product (Tetelan & Tulang) - Clamped non-negative
  const tetelanPrice = safeNonNegative(batch.hargaTetelanPerKg ?? packagingPrices.tetelanPricePerKg, 25000);
  const tulangPrice = safeNonNegative(batch.hargaTulangPerKg ?? packagingPrices.tulangPricePerKg, 3000);
  const tetelanKg = customTetelanKg !== undefined ? safeNonNegative(customTetelanKg) : safeNonNegative(batch.tetelanKg, 0);
  const tulangKg = customTulangKg !== undefined ? safeNonNegative(customTulangKg) : safeNonNegative(batch.tulangKg, 0);
  const totalByProductRevenue = (tetelanKg * tetelanPrice) + (tulangKg * tulangPrice);

  // Rincian Pemakaian Kemasan Real per Batch (berdasarkan Saleable Loin) - Clamped non-negative
  const realBoxCount = saleableLoinKg > 0 ? Math.ceil(saleableLoinKg / 30) : 0;
  const qtyEs = safeNonNegative(customUsage?.esBalok !== undefined ? customUsage.esBalok : (batch.jmlEsBalok ?? (realBoxCount > 0 ? Math.round(realBoxCount * 0.5) : 0)));
  const qtyBox = safeNonNegative(customUsage?.styrofoamBox !== undefined ? customUsage.styrofoamBox : (batch.jmlStyrofoamBox ?? realBoxCount));
  const qtyJelly = safeNonNegative(customUsage?.jellyIceLusin !== undefined ? customUsage.jellyIceLusin : (batch.jmlJellyIceLusin ?? (realBoxCount * 0.75)));
  const qtyPlastikLayer = safeNonNegative(customUsage?.plastikLayer !== undefined ? customUsage.plastikLayer : (batch.jmlPlastikLayer ?? realBoxCount));
  const qtyPlastikFoam = safeNonNegative(customUsage?.plastikStyrofoam !== undefined ? customUsage.plastikStyrofoam : (batch.jmlPlastikStyrofoam ?? realBoxCount));
  const qtyLakban = safeNonNegative(customUsage?.lakbanRoll !== undefined ? customUsage.lakbanRoll : (batch.jmlLakbanRoll ?? (realBoxCount > 0 ? Math.max(0.5, +(realBoxCount * 0.025).toFixed(2)) : 0)));

  // Harga satuan kemasan: Prioritas batch, fallback ke template master - Clamped non-negative
  const priceEs = safeNonNegative(batch.hargaEsBalok ?? packagingPrices.esBalok, 25000);
  const priceBox = safeNonNegative(batch.hargaStyrofoamBox ?? packagingPrices.styrofoamBox, 102500);
  const priceJelly = safeNonNegative(batch.hargaJellyIceLusin ?? packagingPrices.jellyIceLusin, 300);
  const priceLayer = safeNonNegative(batch.hargaPlastikLayer ?? packagingPrices.plastikLayer, 500);
  const priceFoam = safeNonNegative(batch.hargaPlastikStyrofoam ?? packagingPrices.plastikStyrofoam, 800);
  const priceLakban = safeNonNegative(batch.hargaLakbanRoll ?? packagingPrices.lakbanRoll, 100000);
  const pricePlastikLoin = safeNonNegative(batch.hargaPlastikLoinPerKg ?? packagingPrices.alokasiPlastikLoinPerKg, 300);

  const subtotalEs = qtyEs * priceEs;
  const subtotalBox = qtyBox * priceBox;
  const subtotalJelly = qtyJelly * priceJelly;
  const subtotalPlastikLayer = qtyPlastikLayer * priceLayer;
  const subtotalPlastikFoam = qtyPlastikFoam * priceFoam;
  const subtotalLakban = qtyLakban * priceLakban;
  const subtotalPlastikLoin = saleableLoinKg * pricePlastikLoin;

  // Custom Materials - Clamped non-negative
  const rawCustomMaterials = Array.isArray(batch.customMaterials)
    ? batch.customMaterials
    : Array.isArray(packagingPrices.customMaterials)
      ? packagingPrices.customMaterials
      : [];
  const customMaterials = rawCustomMaterials
    .filter((m): m is typeof m & object => Boolean(m && typeof m === 'object'))
    .map(m => ({
    ...m,
    id: typeof m.id === 'string' ? m.id : `material-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof m.name === 'string' ? m.name.slice(0, 120) : 'Material',
    unit: typeof m.unit === 'string' ? m.unit.slice(0, 40) : 'unit',
    pricePerUnit: safeNonNegative(m.pricePerUnit, 0),
    quantity: safeNonNegative(m.quantity, 0)
  }));
  const subtotalCustomMaterials = customMaterials.reduce(
    (sum, m) => sum + (m.pricePerUnit * m.quantity), 0
  );

  const totalBiayaKemasan = subtotalEs + subtotalBox + subtotalJelly + subtotalPlastikLayer + subtotalPlastikFoam + subtotalLakban + subtotalPlastikLoin + subtotalCustomMaterials;
  const packagingCostPerKg = saleableLoinKg > 0 ? (totalBiayaKemasan / saleableLoinKg) : 0;
  const kargoPerKg = safeNonNegative(customCargo !== undefined ? customCargo : (batch.tarifKargoPerKgLoin ?? 31000));
  const totalBiayaKargo = saleableLoinKg * kargoPerKg;

  // COST POOL BATCH (Biaya Total Batch yang Dikeluarkan)
  const grossCostPool = modalBahanBakuIkan + biayaArmada + totalBiayaKemasan + totalBiayaKargo;
  // By-product may offset joint cost, but HPP itself must never become negative.
  // Any revenue above gross cost is presented separately as excess/other income.
  const byProductCreditApplied = Math.min(totalByProductRevenue, grossCostPool);
  const excessByProductRevenue = Math.max(0, totalByProductRevenue - byProductCreditApplied);
  const netCostPool = Math.max(0, grossCostPool - byProductCreditApplied);
  const massBalanceDifferenceKg = totalBeratUtuh - (grossCutOutputKg + tetelanKg + tulangKg);
  const costDeductionPerKgLoin = saleableLoinKg > 0 ? (byProductCreditApplied / saleableLoinKg) : 0;

  // ============================================================================
  // 1. HPP BATCH RESMI: BLENDED (PROCESS COSTING)
  // ============================================================================
  const blendedLandedHppPerKg = saleableLoinKg > 0 ? (netCostPool / saleableLoinKg) : 0;
  const blendedFobHppPerKg = saleableLoinKg > 0 ? (Math.max(0, netCostPool - totalBiayaKargo) / saleableLoinKg) : 0;

  // ============================================================================
  // 2. ANALISIS HPP PER GRADE: TRACE-AND-ALLOCATE
  // ============================================================================
  // Menelusuri biaya input ikan riil + alokasi armada ke masing-masing loin hasil potong
  let rawTracedCostA = 0;
  let rawTracedCostB = 0;
  let rawTracedCostC = 0;
  let unallocatedFishCost = 0;

  fishList.forEach((fish) => {
    const fw = safeNonNegative(fish.beratUtuh, 0);
    const fishPrice = fish.gradeNota === 'A' ? hargaBeliA : fish.gradeNota === 'B' ? hargaBeliB : hargaBeliC;
    const fishRawCost = fw * fishPrice;
    const fishArmadaCost = totalBeratUtuh > 0 ? biayaArmada * (fw / totalBeratUtuh) : 0;
    const fishTotalInput = fishRawCost + fishArmadaCost;

    // Hitung saleable loin dari ikan ini
    let fishSaleableKg = 0;
    (fish.loins || []).forEach((l) => {
      const lw = safeNonNegative(l.weight, 0);
      if (l.grade === 'A' || l.grade === 'B' || l.grade === 'C') {
        fishSaleableKg += lw;
      }
    });

    if (fishSaleableKg > 0) {
      // Alokasikan biaya input ikan ini ke loin-loinnya secara pro-rata berat
      const ratePerKg = fishTotalInput / fishSaleableKg;
      (fish.loins || []).forEach((l) => {
        const lw = safeNonNegative(l.weight, 0);
        if (l.grade === 'A') rawTracedCostA += lw * ratePerKg;
        else if (l.grade === 'B') rawTracedCostB += lw * ratePerKg;
        else if (l.grade === 'C') rawTracedCostC += lw * ratePerKg;
      });
    } else {
      // Ikan tanpa saleable loin (100% Reject atau belum ada loin): joint unallocated
      unallocatedFishCost += fishTotalInput;
    }
  });

  // Jika ada unallocated fish cost (misal ikan reject murni), alokasikan pro-rata ke pool saleable
  if (unallocatedFishCost > 0 && saleableLoinKg > 0) {
    rawTracedCostA += unallocatedFishCost * propA;
    rawTracedCostB += unallocatedFishCost * propB;
    rawTracedCostC += unallocatedFishCost * propC;
  }

  // Alokasi Joint Overheads & Deductions ke tiap grade
  const packagingAllocatedA = totalBiayaKemasan * propA;
  const packagingAllocatedB = totalBiayaKemasan * propB;
  const packagingAllocatedC = totalBiayaKemasan * propC;

  const cargoAllocatedA = loinAKg * kargoPerKg;
  const cargoAllocatedB = loinBKg * kargoPerKg;
  const cargoAllocatedC = loinCKg * kargoPerKg;

  // Credit by-product follows each grade's pre-credit absorbed cost. Allocating it
  // by output weight could make an individual grade negative when its traced raw
  // cost is materially lower than the batch average.
  const preCreditCostA = rawTracedCostA + packagingAllocatedA + cargoAllocatedA;
  const preCreditCostB = rawTracedCostB + packagingAllocatedB + cargoAllocatedB;
  const preCreditCostC = rawTracedCostC + packagingAllocatedC + cargoAllocatedC;
  const totalPreCreditCost = preCreditCostA + preCreditCostB + preCreditCostC;
  const byProductAllocatedA = totalPreCreditCost > 0 ? byProductCreditApplied * (preCreditCostA / totalPreCreditCost) : 0;
  const byProductAllocatedB = totalPreCreditCost > 0 ? byProductCreditApplied * (preCreditCostB / totalPreCreditCost) : 0;
  const byProductAllocatedC = totalPreCreditCost > 0 ? byProductCreditApplied * (preCreditCostC / totalPreCreditCost) : 0;

  // Total Alokasi Biaya per Grade (Landed)
  const allocatedCostA = Math.max(0, preCreditCostA - byProductAllocatedA);
  const allocatedCostB = Math.max(0, preCreditCostB - byProductAllocatedB);
  const allocatedCostC = Math.max(0, preCreditCostC - byProductAllocatedC);

  // HPP per kg per Grade
  const hppLandedA = loinAKg > 0 ? allocatedCostA / loinAKg : 0;
  const hppLandedB = loinBKg > 0 ? allocatedCostB / loinBKg : 0;
  const hppLandedC = loinCKg > 0 ? allocatedCostC / loinCKg : 0;

  const cogsFobA = loinAKg > 0 ? Math.max(0, allocatedCostA - cargoAllocatedA) / loinAKg : 0;
  const cogsFobB = loinBKg > 0 ? Math.max(0, allocatedCostB - cargoAllocatedB) / loinBKg : 0;
  const cogsFobC = loinCKg > 0 ? Math.max(0, allocatedCostC - cargoAllocatedC) / loinCKg : 0;

  // Harga Jual Pasar B2B - Clamped non-negative
  const currentPriceA = safeNonNegative(customPriceA ?? batch.hargaJualLoinA, 150000);
  const currentPriceB = safeNonNegative(customPriceB ?? batch.hargaJualLoinB, 135000);
  const currentPriceC = safeNonNegative(customPriceC ?? batch.hargaJualLoinC, 120000);

  const revenueA = loinAKg * currentPriceA;
  const revenueB = loinBKg * currentPriceB;
  const revenueC = loinCKg * currentPriceC;

  const profitA = revenueA - allocatedCostA;
  const profitB = revenueB - allocatedCostB;
  const profitC = revenueC - allocatedCostC;

  const marginA = currentPriceA > 0 ? (currentPriceA - hppLandedA) / currentPriceA : 0;
  const marginB = currentPriceB > 0 ? (currentPriceB - hppLandedB) / currentPriceB : 0;
  const marginC = currentPriceC > 0 ? (currentPriceC - hppLandedC) / currentPriceC : 0;

  const gradeAllocations: { A: GradeCostAllocation; B: GradeCostAllocation; C: GradeCostAllocation } = {
    A: {
      grade: 'A',
      weightKg: loinAKg,
      weightSharePct: propA,
      sellingPricePerKg: currentPriceA,
      revenue: revenueA,
      rawFishCostTraced: rawTracedCostA,
      packagingCostAllocated: packagingAllocatedA,
      cargoCostAllocated: cargoAllocatedA,
      byProductCreditAllocated: byProductAllocatedA,
      allocatedTotalCost: allocatedCostA,
      cogsFobPerKg: cogsFobA,
      hppLandedPerKg: hppLandedA,
      grossProfit: profitA,
      marginPercent: marginA
    },
    B: {
      grade: 'B',
      weightKg: loinBKg,
      weightSharePct: propB,
      sellingPricePerKg: currentPriceB,
      revenue: revenueB,
      rawFishCostTraced: rawTracedCostB,
      packagingCostAllocated: packagingAllocatedB,
      cargoCostAllocated: cargoAllocatedB,
      byProductCreditAllocated: byProductAllocatedB,
      allocatedTotalCost: allocatedCostB,
      cogsFobPerKg: cogsFobB,
      hppLandedPerKg: hppLandedB,
      grossProfit: profitB,
      marginPercent: marginB
    },
    C: {
      grade: 'C',
      weightKg: loinCKg,
      weightSharePct: propC,
      sellingPricePerKg: currentPriceC,
      revenue: revenueC,
      rawFishCostTraced: rawTracedCostC,
      packagingCostAllocated: packagingAllocatedC,
      cargoCostAllocated: cargoAllocatedC,
      byProductCreditAllocated: byProductAllocatedC,
      allocatedTotalCost: allocatedCostC,
      cogsFobPerKg: cogsFobC,
      hppLandedPerKg: hppLandedC,
      grossProfit: profitC,
      marginPercent: marginC
    }
  };

  // ============================================================================
  // 3. REKONSILIASI WAJIB: SUM(PER GRADE) === NET COST POOL
  // ============================================================================
  const totalAllocatedCost = allocatedCostA + allocatedCostB + allocatedCostC;
  const reconciliationDifference = totalAllocatedCost - netCostPool;
  const isReconciled = Math.abs(reconciliationDifference) < 0.01;

  // Financial Totals
  const totalOmzetLoin = revenueA + revenueB + revenueC;
  const totalRevenueBatch = totalOmzetLoin + totalByProductRevenue;
  const totalBiayaPengeluaran = grossCostPool;
  const totalLabaKotorBatch = totalRevenueBatch - totalBiayaPengeluaran; // True Gross Profit
  const grossMarginPercent = totalRevenueBatch > 0 ? (totalLabaKotorBatch / totalRevenueBatch) : 0;
  const finalizationIssues: string[] = [];
  if (pendingIkanCount > 0) finalizationIssues.push(`${pendingIkanCount} ikan belum selesai dipotong`);
  if (totalIkanCount === 0) finalizationIssues.push('Batch belum memiliki ikan');
  if (saleableLoinKg <= 0) finalizationIssues.push('Batch tidak memiliki loin layak jual');
  if (!isReconciled) finalizationIssues.push('Alokasi biaya belum rekonsiliasi');
  if (massBalanceDifferenceKg < -0.01) finalizationIssues.push('Total output dan by-product melebihi berat ikan masuk');
  const isFinalizable = finalizationIssues.length === 0;

  // Scenarios Matrix
  const discounts = [0, 2000, 5000, 8000];
  const scenarios = discounts.map(d => {
    const pA = Math.max(0, currentPriceA - d);
    const pB = Math.max(0, currentPriceB - d);
    const pC = Math.max(0, currentPriceC - d);
    const mA = pA > 0 ? (pA - hppLandedA) / pA : 0;
    const mB = pB > 0 ? (pB - hppLandedB) / pB : 0;
    const mC = pC > 0 ? (pC - hppLandedC) / pC : 0;
    const omzetLoin = (loinAKg * pA) + (loinBKg * pB) + (loinCKg * pC);
    const omzetTotal = omzetLoin + totalByProductRevenue;
    const profit = omzetTotal - totalBiayaPengeluaran;
    return {
      name: d === 0 ? 'Harga Normal Saat Ini' : `Diskon Rp ${d.toLocaleString('id-ID')}/kg`,
      discount: d,
      priceA: pA,
      marginA: mA,
      priceB: pB,
      marginB: mB,
      priceC: pC,
      marginC: mC,
      totalProfit: profit,
      totalOmzet: omzetTotal
    };
  });

  // Cuan Upgrade / Downgrade Beli
  const cuanUpgradeA_dari_C = yieldAktual > 0 ? (loinA_DariBeliC_Kg / yieldAktual) * (hargaBeliA - hargaBeliC) : 0;
  const cuanUpgradeA_dari_B = yieldAktual > 0 ? (loinA_DariBeliB_Kg / yieldAktual) * (hargaBeliA - hargaBeliB) : 0;
  const cuanUpgradeB_dari_C = yieldAktual > 0 ? (loinB_DariBeliC_Kg / yieldAktual) * (hargaBeliB - hargaBeliC) : 0;
  const cuanDowngradeBeli = cuanUpgradeA_dari_C + cuanUpgradeA_dari_B + cuanUpgradeB_dari_C;

  // Raw costs per kg for backwards compatibility
  const rawCostA = loinAKg > 0 ? rawTracedCostA / loinAKg : 0;
  const rawCostB = loinBKg > 0 ? rawTracedCostB / loinBKg : 0;
  const rawCostC = loinCKg > 0 ? rawTracedCostC / loinCKg : 0;

  return {
    totalIkanCount,
    calculationScopeCount,
    totalBeratUtuh,
    batchStatus,
    pendingIkanCount,
    doneIkanCount,
    grossCutOutputKg,
    saleableLoinKg,
    totalLoinKg,
    loinAKg,
    loinBKg,
    loinCKg,
    loinRejectKg,
    yieldRendemenPersen,
    grossYieldPersen,
    yieldAktual,
    yieldSimulasi,
    simTotalLoin: saleableLoinKg,
    simLoinA: loinAKg,
    simLoinB: loinBKg,
    simLoinC: loinCKg,
    propA,
    propB,
    propC,
    tetelanKg,
    tulangKg,
    tetelanPrice,
    tulangPrice,
    totalByProductRevenue,
    byProductCreditApplied,
    excessByProductRevenue,
    costDeductionPerKgLoin,
    massBalanceDifferenceKg,
    packagingCostPerKg,
    totalBiayaKemasan,
    packagingDetails: {
      qtyEs, priceEs, subtotalEs,
      qtyBox, priceBox, subtotalBox,
      qtyJelly, priceJelly, subtotalJelly,
      qtyPlastikLayer, priceLayer, subtotalPlastikLayer,
      qtyPlastikFoam, priceFoam, subtotalPlastikFoam,
      qtyLakban, priceLakban, subtotalLakban,
      pricePlastikLoin, subtotalPlastikLoin,
      customMaterials,
      subtotalCustomMaterials
    },
    kargoPerKg,
    totalBiayaKargo,
    modalBahanBakuIkan,
    biayaArmada,
    grossCostPool,
    netCostPool,
    blendedFobHppPerKg,
    blendedLandedHppPerKg,
    gradeAllocations,
    reconciliation: {
      totalAllocatedCost,
      netCostPool,
      difference: reconciliationDifference,
      isReconciled
    },
    totalOmzetLoin,
    totalRevenueBatch,
    totalBiayaPengeluaran,
    totalLabaKotorBatch,
    grossMarginPercent,
    isFinalizable,
    finalizationIssues,
    rawCostA,
    rawCostB,
    rawCostC,
    cogsFobA,
    cogsFobB,
    cogsFobC,
    trueNetLandedCogsA: hppLandedA,
    trueNetLandedCogsB: hppLandedB,
    trueNetLandedCogsC: hppLandedC,
    currentPriceA,
    currentPriceB,
    currentPriceC,
    marginA,
    marginB,
    marginC,
    scenarios,
    cuanDowngradeBeli,
    loinA_DariBeliC_Kg,
    loinA_DariBeliB_Kg,
    loinB_DariBeliC_Kg,
    loinC_DariBeliB_Kg
  };
}

// Formatting Helpers
export const formatRupiah = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
};

export const formatKg = (val: number | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '0.0 kg';
  return val.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' kg';
};

export const formatPercent = (val: number | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '0.0%';
  return (val * 100).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
};
