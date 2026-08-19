export type FishGrade = 'A' | 'B' | 'C' | 'Reject';

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
  id: string; // "BATCH-01"
  nelayan: string; // "Nama Nelayan / Kapal"
  tanggal: string; // "2026-08-16"
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

  // Biaya Kemasan & Kargo
  biayaKemasanPerKgLoin?: number; // Rp 5.000 / kg loin
  tarifKargoPerKgLoin?: number; // Rp 31.000 / kg loin
  kreditByProductPerKgLoin?: number; // Rp 11.240 / kg loin
  // Harga Jual Pasar B2B
  hargaJualLoinB: number; // Rp 135.000 / kg
  hargaJualLoinC: number; // Rp 120.000 / kg
  hargaJualLoinA?: number; // Rp 150.000 / kg
}

export interface HppCalculationResult {
  totalIkanCount: number;
  totalBeratUtuh: number;
  
  // Hasil Loin
  totalLoinKg: number;
  loinAKg: number;
  loinBKg: number;
  loinCKg: number;
  loinRejectKg: number;
  yieldRendemenPersen: number;

  // Analisis Perubahan Grade
  loinB_DariBeliC_Kg: number;
  loinC_DariBeliB_Kg: number;
  cuanDowngradeBeli: number;

  // Biaya & Modal
  modalBahanBakuIkan: number;
  biayaKemasanTotal: number;
  biayaKargoTotal: number;
  kreditByProductTotal: number;
  totalLandedCost: number;

  // HPP per kg
  hppRataRataPerKgLoin: number;
  hppLoinBPerKg: number;
  hppLoinCPerKg: number;

  // Penjualan & Margin
  totalOmzet: number;
  totalLabaKotor: number;
  marginPersen: number;
  marginLoinBPersen: number;
  marginLoinCPersen: number;
}
