export type FishGrade = 'A' | 'B' | 'C' | 'Reject';
export type AppRole = 'owner' | 'manager' | 'staff';

export interface UserProfile {
  id: string;
  organizationId: string;
  organizationName: string;
  displayName: string;
  role: AppRole;
  email: string;
}

export interface LoinItem {
  id: number;
  name: string; // "Loin 1", "Loin 2", "Loin 3", "Loin 4", "Loin Tambahan"
  weight: number; // kg
  grade: FishGrade;
}

export interface FishRecord {
  id: string;
  batchId: string;
  noIkan: number;
  kodeIkan: string;
  beratUtuh: number; // kg ikan utuh
  gradeNota: FishGrade; // Grade saat beli dari nelayan (Tahap 1)
  gradePotong?: FishGrade; // Grade saat dicek di meja potong (Tahap 2) jika berubah
  status: 'pending' | 'done';
  loins: LoinItem[];
  tetelanKg?: number;
  notes?: string;
}

export interface CustomMaterial {
  id: string;
  name: string;       // "Segel Pengaman", "Label Stiker", dll
  unit: string;        // "pcs", "roll", "kg", "lembar", "lusin"
  pricePerUnit: number; // Rp per unit
  quantity: number;     // Jumlah pemakaian
}

export interface PackagingPrices {
  esBalok: number; // Rp 25.000 / balok
  styrofoamBox: number; // Rp 102.500 / box
  jellyIceLusin: number; // Rp 300 / lusin
  plastikLayer: number; // Rp 500 / pcs
  plastikStyrofoam: number; // Rp 800 / pcs
  lakbanRoll: number; // Rp 100.000 / roll
  alokasiPlastikLoinPerKg: number; // Rp 300 / kg loin
  tetelanPricePerKg: number; // Rp 25.000 / kg
  tulangPricePerKg: number; // Rp 3.000 / kg
  customMaterials?: CustomMaterial[]; // Template default material tambahan
}

export interface BatchInfo {
  id: string; // UUID internal immutable "BATCH-..."
  code?: string; // Kode batch yang terlihat oleh pengguna
  organizationId?: string;
  nelayan: string; // "Nama Nelayan / Kapal"
  tanggal: string; // "2026-08-23"
  lifecycleStatus?: 'WIP' | 'FINAL';
  finalizedAt?: string;
  finalizedBy?: string;
  version?: number;

  // Harga Beli Modal dari Nelayan
  hargaBeliGradeB: number; // Rp 46.000 / kg
  hargaBeliGradeC: number; // Rp 43.000 / kg
  hargaBeliGradeA?: number; // Rp 50.000 / kg
  biayaArmada: number; // Rp 300.000 (tetap per batch)

  // Pemakaian Unit Kemasan Real per Batch (Jumlah Fisik)
  jmlEsBalok?: number;
  jmlStyrofoamBox?: number;
  jmlJellyIceLusin?: number;
  jmlPlastikLayer?: number;
  jmlPlastikStyrofoam?: number;
  jmlLakbanRoll?: number;

  // Harga Satuan Kemasan per Batch (Bisa Beda tiap Batch / Supplier)
  hargaEsBalok?: number;
  hargaStyrofoamBox?: number;
  hargaJellyIceLusin?: number;
  hargaPlastikLayer?: number;
  hargaPlastikStyrofoam?: number;
  hargaLakbanRoll?: number;
  hargaPlastikLoinPerKg?: number;

  // Material Tambahan Real per Batch
  customMaterials?: CustomMaterial[];

  /** @deprecated Gunakan rincian pemakaian kemasan aktual batch */
  biayaKemasanPerKgLoin?: number;
  tarifKargoPerKgLoin?: number; // Rp 31.000 / kg loin
  /** @deprecated Gunakan rincian by-product (tetelanKg & tulangKg) aktual batch */
  kreditByProductPerKgLoin?: number;

  // By-Product per Batch Real
  tetelanKg?: number;
  tulangKg?: number;
  hargaTetelanPerKg?: number;
  hargaTulangPerKg?: number;

  // Harga Jual Pasar B2B
  hargaJualLoinB: number; // Rp 135.000 / kg
  hargaJualLoinC: number; // Rp 120.000 / kg
  hargaJualLoinA?: number; // Rp 150.000 / kg
}

export interface GradeCostAllocation {
  grade: 'A' | 'B' | 'C';
  weightKg: number;
  weightSharePct: number; // Proporsi terhadap total saleable loin
  sellingPricePerKg: number;
  revenue: number;
  rawFishCostTraced: number; // Biaya ikan & armada tertelusur
  packagingCostAllocated: number; // Alokasi biaya kemasan
  cargoCostAllocated: number; // Biaya kargo per grade
  byProductCreditAllocated: number; // Alokasi potongan by-product
  allocatedTotalCost: number; // Total biaya teralokasi (Landed)
  cogsFobPerKg: number; // HPP FOB per kg
  hppLandedPerKg: number; // HPP Landed (BEP) per kg
  grossProfit: number; // Laba kotor per grade
  marginPercent: number; // Margin %
}

export interface HppReconciliation {
  totalAllocatedCost: number; // sum(allocatedTotalCost per grade)
  netCostPool: number; // total biaya bersih batch
  difference: number; // totalAllocatedCost - netCostPool (harus 0.00)
  isReconciled: boolean;
}

export interface HppCalculationResult {
  totalIkanCount: number;
  calculationScopeCount: number;
  totalBeratUtuh: number;
  batchStatus: 'FINAL' | 'WIP'; // 'FINAL' jika semua ikan selesai, 'WIP' jika masih ada pending
  pendingIkanCount: number;
  doneIkanCount: number;

  // Hasil Output Loin Fisik
  grossCutOutputKg: number; // Total semua potongan termasuk Reject
  saleableLoinKg: number; // Total loin saleable (A + B + C) - dasar HPP
  totalLoinKg: number; // Alias saleableLoinKg untuk backwards compatibility
  loinAKg: number;
  loinBKg: number;
  loinCKg: number;
  loinRejectKg: number;

  // KPI Rendemen
  yieldRendemenPersen: number; // saleableLoinKg / totalBeratUtuh (Rendemen Resmi)
  grossYieldPersen: number; // grossCutOutputKg / totalBeratUtuh
  yieldAktual: number; // Alias yieldRendemenPersen
  /** @deprecated Gunakan yieldRendemenPersen */
  yieldSimulasi: number;

  // By-Product Details
  tetelanKg: number;
  tulangKg: number;
  tetelanPrice: number;
  tulangPrice: number;
  totalByProductRevenue: number;
  byProductCreditApplied: number;
  excessByProductRevenue: number;
  costDeductionPerKgLoin: number;
  massBalanceDifferenceKg: number;

  // Packaging Details
  totalBiayaKemasan: number;
  packagingCostPerKg: number;
  packagingDetails: {
    qtyEs: number;
    priceEs: number;
    subtotalEs: number;
    qtyBox: number;
    priceBox: number;
    subtotalBox: number;
    qtyJelly: number;
    priceJelly: number;
    subtotalJelly: number;
    qtyPlastikLayer: number;
    priceLayer: number;
    subtotalPlastikLayer: number;
    qtyPlastikFoam: number;
    priceFoam: number;
    subtotalPlastikFoam: number;
    qtyLakban: number;
    priceLakban: number;
    subtotalLakban: number;
    pricePlastikLoin: number;
    subtotalPlastikLoin: number;
    customMaterials: CustomMaterial[];
    subtotalCustomMaterials: number;
  };

  // Cargo Details
  kargoPerKg: number;
  totalBiayaKargo: number;

  // Cost Pool (Biaya Riil Batch)
  modalBahanBakuIkan: number;
  biayaArmada: number;
  grossCostPool: number; // modal + armada + kemasan + kargo
  netCostPool: number; // grossCostPool - totalByProductRevenue

  // 1. HPP Batch Resmi (Blended Process Costing)
  blendedFobHppPerKg: number;
  blendedLandedHppPerKg: number;

  // 2. Analisis HPP Per Grade (Trace-and-Allocate)
  gradeAllocations: {
    A: GradeCostAllocation;
    B: GradeCostAllocation;
    C: GradeCostAllocation;
  };

  // 3. Rekonsiliasi Wajib Invariant
  reconciliation: HppReconciliation;

  // Financial Summary & Profit
  totalOmzetLoin: number;
  totalRevenueBatch: number; // omzet loin + by-product
  totalBiayaPengeluaran: number; // grossCostPool
  totalLabaKotorBatch: number; // True Gross Profit
  grossMarginPercent: number; // totalLabaKotorBatch / totalRevenueBatch
  isFinalizable: boolean;
  finalizationIssues: string[];

  // Analisis Perubahan Grade
  loinA_DariBeliC_Kg: number;
  loinA_DariBeliB_Kg: number;
  loinB_DariBeliC_Kg: number;
  loinC_DariBeliB_Kg: number;
  /** @deprecated Analisis cuan beli */
  cuanDowngradeBeli: number;

  // Simulasi Skenario Diskon
  scenarios: Array<{
    name: string;
    discount: number;
    priceA: number;
    marginA: number;
    priceB: number;
    marginB: number;
    priceC: number;
    marginC: number;
    totalProfit: number;
    totalOmzet: number;
  }>;

  // Legacy convenience fields
  rawCostA: number;
  rawCostB: number;
  rawCostC: number;
  cogsFobA: number;
  cogsFobB: number;
  cogsFobC: number;
  trueNetLandedCogsA: number;
  trueNetLandedCogsB: number;
  trueNetLandedCogsC: number;
  currentPriceA: number;
  currentPriceB: number;
  currentPriceC: number;
  marginA: number;
  marginB: number;
  marginC: number;
  propA: number;
  propB: number;
  propC: number;
  /** @deprecated Gunakan saleableLoinKg */
  simTotalLoin: number;
  /** @deprecated Gunakan loinAKg */
  simLoinA: number;
  /** @deprecated Gunakan loinBKg */
  simLoinB: number;
  /** @deprecated Gunakan loinCKg */
  simLoinC: number;
}
