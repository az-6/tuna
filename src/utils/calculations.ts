import { BatchInfo, FishRecord, PackagingPrices } from '../types';

export function calculateExactHpp(
  batch: BatchInfo,
  fishList: FishRecord[],
  packagingPrices: PackagingPrices,
  _simYieldOverride?: number, // Deprecated: now uses 100% real yield
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
  customPriceC?: number
) {
  const totalIkanCount = fishList.length;
  let totalBeratUtuh = 0;

  let totalLoinKg = 0;
  let loinAKg = 0;
  let loinBKg = 0;
  let loinCKg = 0;
  let loinRejectKg = 0;

  let beratIkanBeliA = 0;
  let beratIkanBeliB = 0;
  let beratIkanBeliC = 0;
  let modalBahanBakuIkan = 0;
  
  let loinB_DariBeliC_Kg = 0;
  let loinA_DariBeliC_Kg = 0;
  let loinA_DariBeliB_Kg = 0;
  let loinC_DariBeliB_Kg = 0;

  const hargaBeliA = batch.hargaBeliGradeA || 50000;
  const hargaBeliB = batch.hargaBeliGradeB || 46000;
  const hargaBeliC = batch.hargaBeliGradeC || 43000;

  fishList.forEach((fish) => {
    const w = fish.beratUtuh || 0;
    totalBeratUtuh += w;

    if (fish.gradeNota === 'A') {
      beratIkanBeliA += w;
      modalBahanBakuIkan += w * hargaBeliA;
    } else if (fish.gradeNota === 'B') {
      beratIkanBeliB += w;
      modalBahanBakuIkan += w * hargaBeliB;
    } else {
      beratIkanBeliC += w;
      modalBahanBakuIkan += w * hargaBeliC;
    }

    (fish.loins || []).forEach((l) => {
      const lw = l.weight || 0;
      totalLoinKg += lw;
      if (l.grade === 'A') {
        loinAKg += lw;
        if (fish.gradeNota === 'C') loinA_DariBeliC_Kg += lw;
        if (fish.gradeNota === 'B') loinA_DariBeliB_Kg += lw;
      }
      else if (l.grade === 'B') {
        loinBKg += lw;
        if (fish.gradeNota === 'C') loinB_DariBeliC_Kg += lw;
      }
      else if (l.grade === 'C') {
        loinCKg += lw;
        if (fish.gradeNota === 'B' || fish.gradeNota === 'A') loinC_DariBeliB_Kg += lw;
      }
      else if (l.grade === 'Reject') loinRejectKg += lw;
    });
  });

  // 100% REAL YIELD DARI HASIL MEJA POTONG
  const yieldAktual = totalBeratUtuh > 0 ? (totalLoinKg / totalBeratUtuh) : 0;
  const yieldSimulasi = yieldAktual; // Real yield

  // Output Real Loin (Bukan Simulasi)
  const simTotalLoin = totalLoinKg;
  const simLoinA = loinAKg;
  const simLoinB = loinBKg;
  const simLoinC = loinCKg;

  // Proporsi Real
  const totalGradedLoin = loinAKg + loinBKg + loinCKg;
  const propA = totalGradedLoin > 0 ? loinAKg / totalGradedLoin : 0;
  const propB = totalGradedLoin > 0 ? loinBKg / totalGradedLoin : 0;
  const propC = totalGradedLoin > 0 ? loinCKg / totalGradedLoin : 0;

  // By-Product (Tetelan & Tulang): Default 0 kg (jangan dimasukkan terlebih dahulu sesuai instruksi)
  const tetelanPrice = packagingPrices.tetelanPricePerKg || 25000;
  const tulangPrice = packagingPrices.tulangPricePerKg || 3000;
  const tetelanKg = customTetelanKg !== undefined ? customTetelanKg : 0;
  const tulangKg = customTulangKg !== undefined ? customTulangKg : 0;
  const totalByProductRevenue = (tetelanKg * tetelanPrice) + (tulangKg * tulangPrice);
  const costDeductionPerKgLoin = totalLoinKg > 0 ? (totalByProductRevenue / totalLoinKg) : 0;

  // Rincian Pemakaian Kemasan Real per Batch
  const realBoxCount = totalLoinKg > 0 ? Math.ceil(totalLoinKg / 30) : 0;
  const qtyEs = customUsage?.esBalok !== undefined ? customUsage.esBalok : (batch.jmlEsBalok ?? (realBoxCount > 0 ? Math.round(realBoxCount * 0.5) : 0));
  const qtyBox = customUsage?.styrofoamBox !== undefined ? customUsage.styrofoamBox : (batch.jmlStyrofoamBox ?? realBoxCount);
  const qtyJelly = customUsage?.jellyIceLusin !== undefined ? customUsage.jellyIceLusin : (batch.jmlJellyIceLusin ?? (realBoxCount * 0.75));
  const qtyPlastikLayer = customUsage?.plastikLayer !== undefined ? customUsage.plastikLayer : (batch.jmlPlastikLayer ?? realBoxCount);
  const qtyPlastikFoam = customUsage?.plastikStyrofoam !== undefined ? customUsage.plastikStyrofoam : (batch.jmlPlastikStyrofoam ?? realBoxCount);
  const qtyLakban = customUsage?.lakbanRoll !== undefined ? customUsage.lakbanRoll : (batch.jmlLakbanRoll ?? (realBoxCount > 0 ? Math.max(0.5, +(realBoxCount * 0.025).toFixed(2)) : 0));

  // Harga satuan kemasan: Prioritas harga spesifik batch, fallback ke template master
  const priceEs = batch.hargaEsBalok !== undefined ? batch.hargaEsBalok : (packagingPrices.esBalok || 25000);
  const priceBox = batch.hargaStyrofoamBox !== undefined ? batch.hargaStyrofoamBox : (packagingPrices.styrofoamBox || 102500);
  const priceJelly = batch.hargaJellyIceLusin !== undefined ? batch.hargaJellyIceLusin : (packagingPrices.jellyIceLusin || 300);
  const priceLayer = batch.hargaPlastikLayer !== undefined ? batch.hargaPlastikLayer : (packagingPrices.plastikLayer || 500);
  const priceFoam = batch.hargaPlastikStyrofoam !== undefined ? batch.hargaPlastikStyrofoam : (packagingPrices.plastikStyrofoam || 800);
  const priceLakban = batch.hargaLakbanRoll !== undefined ? batch.hargaLakbanRoll : (packagingPrices.lakbanRoll || 100000);
  const pricePlastikLoin = batch.hargaPlastikLoinPerKg !== undefined ? batch.hargaPlastikLoinPerKg : (packagingPrices.alokasiPlastikLoinPerKg || 300);

  const subtotalEs = qtyEs * priceEs;
  const subtotalBox = qtyBox * priceBox;
  const subtotalJelly = qtyJelly * priceJelly;
  const subtotalPlastikLayer = qtyPlastikLayer * priceLayer;
  const subtotalPlastikFoam = qtyPlastikFoam * priceFoam;
  const subtotalLakban = qtyLakban * priceLakban;
  const subtotalPlastikLoin = totalLoinKg * pricePlastikLoin;

  // Custom Materials (dynamic user-added materials): Prioritas batch, fallback master
  const customMaterials = batch.customMaterials !== undefined ? batch.customMaterials : (packagingPrices.customMaterials || []);
  const subtotalCustomMaterials = customMaterials.reduce(
    (sum, m) => sum + ((m.pricePerUnit || 0) * (m.quantity || 0)), 0
  );

  const totalBiayaKemasan = subtotalEs + subtotalBox + subtotalJelly + subtotalPlastikLayer + subtotalPlastikFoam + subtotalLakban + subtotalPlastikLoin + subtotalCustomMaterials;
  const packagingCostPerKg = totalLoinKg > 0 ? (totalBiayaKemasan / totalLoinKg) : 0;
  const kargoPerKg = customCargo !== undefined ? customCargo : (batch.tarifKargoPerKgLoin || 31000);
  const totalBiayaKargo = totalLoinKg * kargoPerKg;

  // Modal Bahan Baku per kg Loin Real (Grade A, B, C)
  const armadaPerKgLoin = totalLoinKg > 0 ? (batch.biayaArmada / totalLoinKg) : 0;
  const rawCostA = yieldAktual > 0 ? (hargaBeliA / yieldAktual) + armadaPerKgLoin : 0;
  const rawCostB = yieldAktual > 0 ? (hargaBeliB / yieldAktual) + armadaPerKgLoin : 0;
  const rawCostC = yieldAktual > 0 ? (hargaBeliC / yieldAktual) + armadaPerKgLoin : 0;

  // COGS Bersih FOB (Gudang) Real
  const cogsFobA = Math.max(0, rawCostA + packagingCostPerKg - costDeductionPerKgLoin);
  const cogsFobB = Math.max(0, rawCostB + packagingCostPerKg - costDeductionPerKgLoin);
  const cogsFobC = Math.max(0, rawCostC + packagingCostPerKg - costDeductionPerKgLoin);

  // True Net Landed COGS Real (BEP per kg Loin)
  const trueNetLandedCogsA = Math.max(0, cogsFobA + kargoPerKg);
  const trueNetLandedCogsB = Math.max(0, cogsFobB + kargoPerKg);
  const trueNetLandedCogsC = Math.max(0, cogsFobC + kargoPerKg);

  // Harga Jual
  const currentPriceA = customPriceA || batch.hargaJualLoinA || 150000;
  const currentPriceB = customPriceB || batch.hargaJualLoinB || 135000;
  const currentPriceC = customPriceC || batch.hargaJualLoinC || 120000;

  // Margin %
  const marginA = currentPriceA > 0 ? (currentPriceA - trueNetLandedCogsA) / currentPriceA : 0;
  const marginB = currentPriceB > 0 ? (currentPriceB - trueNetLandedCogsB) / currentPriceB : 0;
  const marginC = currentPriceC > 0 ? (currentPriceC - trueNetLandedCogsC) / currentPriceC : 0;

  // Total Pengeluaran Real (Bahan baku ikan + Armada + Kemasan + Kargo)
  const realTotalCost = modalBahanBakuIkan + batch.biayaArmada + totalBiayaKemasan + totalBiayaKargo;

  // Scenarios Matrix (Menggunakan Real Loin Weights)
  const discounts = [0, 2000, 5000, 8000];
  const scenarios = discounts.map(d => {
    const pA = Math.max(0, currentPriceA - d);
    const pB = Math.max(0, currentPriceB - d);
    const pC = Math.max(0, currentPriceC - d);
    const mA = pA > 0 ? (pA - trueNetLandedCogsA) / pA : 0;
    const mB = pB > 0 ? (pB - trueNetLandedCogsB) / pB : 0;
    const mC = pC > 0 ? (pC - trueNetLandedCogsC) / pC : 0;
    const omzet = (loinAKg * pA) + (loinBKg * pB) + (loinCKg * pC) + totalByProductRevenue;
    const profit = omzet - realTotalCost;
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
      totalOmzet: omzet
    };
  });

  // Cuan Upgrade / Downgrade Beli
  const cuanUpgradeA_dari_C = yieldAktual > 0 ? (loinA_DariBeliC_Kg / yieldAktual) * (hargaBeliA - hargaBeliC) : 0;
  const cuanUpgradeA_dari_B = yieldAktual > 0 ? (loinA_DariBeliB_Kg / yieldAktual) * (hargaBeliA - hargaBeliB) : 0;
  const cuanUpgradeB_dari_C = yieldAktual > 0 ? (loinB_DariBeliC_Kg / yieldAktual) * (hargaBeliB - hargaBeliC) : 0;
  const cuanDowngradeBeli = cuanUpgradeA_dari_C + cuanUpgradeA_dari_B + cuanUpgradeB_dari_C;

  return {
    totalIkanCount,
    totalBeratUtuh,
    totalLoinKg,
    loinAKg,
    loinBKg,
    loinCKg,
    loinRejectKg,
    yieldAktual,
    yieldSimulasi,
    simTotalLoin,
    simLoinA,
    simLoinB,
    simLoinC,
    propA,
    propB,
    propC,
    tetelanKg,
    tulangKg,
    totalByProductRevenue,
    costDeductionPerKgLoin,
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
    rawCostA,
    rawCostB,
    rawCostC,
    cogsFobA,
    cogsFobB,
    cogsFobC,
    trueNetLandedCogsA,
    trueNetLandedCogsB,
    trueNetLandedCogsC,
    currentPriceA,
    currentPriceB,
    currentPriceC,
    marginA,
    marginB,
    marginC,
    scenarios,
    cuanDowngradeBeli,
    loinA_DariBeliC_Kg,
    loinB_DariBeliC_Kg,
    loinC_DariBeliB_Kg
  };
}

// Helpers
export const formatRupiah = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
};

export const formatKg = (val: number | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0 kg';
  return val.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' kg';
};

export const formatPercent = (val: number | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return (val * 100).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
};
