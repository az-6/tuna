import { describe, it, expect } from 'bun:test';
import { calculateExactHpp } from '../calculations';
import { BatchInfo, FishRecord, PackagingPrices } from '../../types';

describe('Accounting & HPP Calculation Engine', () => {
  const defaultPackagingPrices: PackagingPrices = {
    esBalok: 25000,
    styrofoamBox: 102500,
    jellyIceLusin: 300,
    plastikLayer: 500,
    plastikStyrofoam: 800,
    lakbanRoll: 100000,
    alokasiPlastikLoinPerKg: 300,
    tetelanPricePerKg: 25000,
    tulangPricePerKg: 3000,
    customMaterials: []
  };

  it('1. Golden Test: Exact Reconstruction of Reference Batch 861 kg from Operasional_Tuna_B2B.xlsx', () => {
    // Exact baseline from Operasional_Tuna_B2B.xlsx:
    // Input: 569 kg Grade B (@ 46.000) + 292 kg Grade C (@ 43.000) = 861.00 kg
    // Output: 480.27 kg Grade B (@ 135.000) + 47.61 kg Grade C (@ 120.000) = 527.88 kg
    const fish1: FishRecord = {
      id: 'FISH-1',
      batchId: 'BATCH-GOLDEN',
      noIkan: 1,
      kodeIkan: 'Tuna #001',
      beratUtuh: 569,
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 480.27, grade: 'B' }
      ]
    };

    const fish2: FishRecord = {
      id: 'FISH-2',
      batchId: 'BATCH-GOLDEN',
      noIkan: 2,
      kodeIkan: 'Tuna #002',
      beratUtuh: 292,
      gradeNota: 'C',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 47.61, grade: 'C' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-GOLDEN',
      nelayan: 'KM Referensi Excel',
      tanggal: '2026-08-16',
      hargaBeliGradeA: 50000,
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      biayaArmada: 300000,
      jmlEsBalok: 10,
      jmlStyrofoamBox: 21,
      jmlJellyIceLusin: 15.75,
      jmlPlastikLayer: 21,
      jmlPlastikStyrofoam: 21,
      jmlLakbanRoll: 0.5,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinA: 150000,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000
    };

    const res = calculateExactHpp(batch, [fish1, fish2], defaultPackagingPrices);

    // 1. Physical Yield Verification
    expect(res.totalBeratUtuh).toBe(861.00);
    expect(res.saleableLoinKg).toBe(527.88);
    expect(res.yieldRendemenPersen).toBeCloseTo(0.613101, 5); // 61.3101%

    // 2. Direct Raw Fish Purchase Cost
    // 569 * 46.000 + 292 * 43.000 = 26.174.000 + 12.556.000 = 38.730.000
    expect(res.modalBahanBakuIkan).toBe(38730000);
    expect(res.biayaArmada).toBe(300000);

    // 3. Packaging Cost Verification
    // 10*25k + 21*102.5k + 15.75*300 + 21*500 + 21*800 + 0.5*100k + (527.88 * 300 = 158.364) = 2.642.889
    expect(res.totalBiayaKemasan).toBe(2642889);

    // 4. Cargo Cost Verification
    // 527.88 * 31.000 = 16.364.280
    expect(res.totalBiayaKargo).toBe(16364280);

    // 5. Total Revenue Verification
    // (480.27 * 135.000 = 64.836.450) + (47.61 * 120.000 = 5.713.200) = 70.549.650
    expect(res.totalRevenueBatch).toBe(70549650);

    // 6. Gross Cost Pool Verification
    // 38.730.000 + 300.000 + 2.642.889 + 16.364.280 = 58.037.169
    expect(res.grossCostPool).toBe(58037169);
    expect(res.netCostPool).toBe(58037169);

    // 7. True Gross Profit Verification
    // 70.549.650 - 58.037.169 = 12.512.481
    expect(res.totalLabaKotorBatch).toBe(12512481);
    expect(res.grossMarginPercent).toBeCloseTo(0.177357, 5); // 17.7357%

    // 8. Blended Landed HPP Verification
    // 58.037.169 / 527.88 = 109.943,8679...
    expect(res.blendedLandedHppPerKg).toBeCloseTo(109943.868, 2);

    // 9. Exact Zero-Difference Reconciliation
    expect(res.reconciliation.isReconciled).toBe(true);
    expect(res.reconciliation.totalAllocatedCost).toBeCloseTo(58037169, 2);
    expect(Math.abs(res.reconciliation.difference)).toBeLessThan(0.01);
  });

  it('2. Invariant & Trace-and-Allocate Reconciliation: Sum(per-grade cost) === Net Cost Pool', () => {
    const fish: FishRecord = {
      id: 'FISH-C-TO-A',
      batchId: 'BATCH-02',
      noIkan: 1,
      kodeIkan: 'Tuna C',
      beratUtuh: 100,
      gradeNota: 'C', // bought at 43.000/kg
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 30, grade: 'A' },
        { id: 2, name: 'Loin 2', weight: 30, grade: 'B' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-02',
      nelayan: 'Kapal Nelayan 02',
      tanggal: '2026-08-16',
      hargaBeliGradeA: 50000,
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      biayaArmada: 300000,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinA: 150000,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices);

    expect(res.modalBahanBakuIkan).toBe(4300000);
    expect(res.reconciliation.isReconciled).toBe(true);
    expect(Math.abs(res.reconciliation.difference)).toBeLessThan(0.01);

    // Grade A raw cost traced must be based on actual Grade C purchase (4.300.000 + 300.000) / 2 = 2.300.000, NOT fictional 50.000/kg!
    expect(res.gradeAllocations.A.rawFishCostTraced).toBe(2300000);
    expect(res.gradeAllocations.B.rawFishCostTraced).toBe(2300000);
  });

  it('3. Reject Isolation: Reject is excluded from saleable loin and does not inflate rendemen', () => {
    const fish: FishRecord = {
      id: 'FISH-REJECT-TEST',
      batchId: 'BATCH-03',
      noIkan: 1,
      kodeIkan: 'Tuna Reject Test',
      beratUtuh: 100,
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 50, grade: 'B' },
        { id: 2, name: 'Loin 2', weight: 10, grade: 'Reject' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-03',
      nelayan: 'Kapal Nelayan 03',
      tanggal: '2026-08-16',
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      biayaArmada: 0,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices);

    expect(res.grossCutOutputKg).toBe(60);
    expect(res.saleableLoinKg).toBe(50);
    expect(res.loinRejectKg).toBe(10);
    expect(res.yieldRendemenPersen).toBe(0.50); // 50%, NOT 60%
    expect(res.grossYieldPersen).toBe(0.60);

    // Reconciliation holds
    expect(res.reconciliation.isReconciled).toBe(true);
    expect(Math.abs(res.reconciliation.difference)).toBeLessThan(0.01);
  });

  it('4. By-Product Credit: Revenue from tetelan & tulang reduces cost pool without double counting', () => {
    const fish: FishRecord = {
      id: 'FISH-BYPRODUCT',
      batchId: 'BATCH-04',
      noIkan: 1,
      kodeIkan: 'Tuna Byproduct',
      beratUtuh: 100,
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 60, grade: 'B' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-04',
      nelayan: 'Kapal Nelayan 04',
      tanggal: '2026-08-16',
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      biayaArmada: 0,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000,
      tetelanKg: 200,
      tulangKg: 100,
      hargaTetelanPerKg: 25000,
      hargaTulangPerKg: 3000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices);

    expect(res.totalByProductRevenue).toBe(5300000);
    expect(res.netCostPool).toBe(res.grossCostPool - 5300000);
    expect(res.totalRevenueBatch).toBe(res.totalOmzetLoin + 5300000);
    expect(res.totalLabaKotorBatch).toBe(res.totalRevenueBatch - res.grossCostPool);
    expect(res.reconciliation.isReconciled).toBe(true);
    expect(Math.abs(res.reconciliation.difference)).toBeLessThan(0.01);
  });

  it('5. Edge Case: Handles Rp 0 prices without falling back to defaults', () => {
    const fish: FishRecord = {
      id: 'FISH-ZERO',
      batchId: 'BATCH-05',
      noIkan: 1,
      kodeIkan: 'Tuna Zero',
      beratUtuh: 50,
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 30, grade: 'B' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-05',
      nelayan: 'Kapal Nelayan 05',
      tanggal: '2026-08-16',
      hargaBeliGradeB: 46000,
      hargaBeliGradeC: 43000,
      biayaArmada: 0,
      tarifKargoPerKgLoin: 0,
      hargaJualLoinB: 135000,
      hargaJualLoinC: 120000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices, undefined, undefined, undefined, 0);

    expect(res.kargoPerKg).toBe(0);
    expect(res.totalBiayaKargo).toBe(0);
    expect(res.reconciliation.isReconciled).toBe(true);
  });

  it('6. Edge Case: 100% Reject Batch & Zero Saleable Output (No Division by Zero)', () => {
    const fish: FishRecord = {
      id: 'FISH-ALL-REJECT',
      batchId: 'BATCH-06',
      noIkan: 1,
      kodeIkan: 'Tuna All Reject',
      beratUtuh: 50,
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: 30, grade: 'Reject' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-06',
      nelayan: 'Kapal Nelayan 06',
      tanggal: '2026-08-16',
      hargaBeliGradeB: 46000,
      biayaArmada: 100000,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinB: 135000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices);

    expect(res.saleableLoinKg).toBe(0);
    expect(res.loinRejectKg).toBe(30);
    expect(res.blendedLandedHppPerKg).toBe(0);
    expect(res.blendedFobHppPerKg).toBe(0);
    expect(res.yieldRendemenPersen).toBe(0);
    expect(res.grossMarginPercent).toBe(0);
    // When 0 saleable loins exist, netCostPool cannot be allocated to A/B/C
    expect(res.reconciliation.isReconciled).toBe(false);
    expect(res.reconciliation.difference).toBe(-res.netCostPool);
  });

  it('7. Negative Input Clamping: Clamps negative inputs to 0', () => {
    const fish: FishRecord = {
      id: 'FISH-NEG',
      batchId: 'BATCH-07',
      noIkan: 1,
      kodeIkan: 'Tuna Neg',
      beratUtuh: -50, // negative weight
      gradeNota: 'B',
      status: 'done',
      loins: [
        { id: 1, name: 'Loin 1', weight: -30, grade: 'B' }
      ]
    };

    const batch: BatchInfo = {
      id: 'BATCH-07',
      nelayan: 'Kapal Nelayan 07',
      tanggal: '2026-08-16',
      hargaBeliGradeB: -46000,
      biayaArmada: -300000,
      jmlStyrofoamBox: -10,
      tarifKargoPerKgLoin: -31000,
      hargaJualLoinB: -135000
    };

    const res = calculateExactHpp(batch, [fish], defaultPackagingPrices);

    expect(res.totalBeratUtuh).toBe(0);
    expect(res.saleableLoinKg).toBe(0);
    expect(res.grossCostPool).toBe(0);
    expect(res.totalBiayaKemasan).toBe(0);
    expect(res.totalBiayaKargo).toBe(0);
    expect(res.reconciliation.isReconciled).toBe(true);
  });

  it('8. WIP vs Final Batch Status Scope', () => {
    const fishDone: FishRecord = {
      id: 'FISH-DONE',
      batchId: 'BATCH-08',
      noIkan: 1,
      kodeIkan: 'Tuna Done',
      beratUtuh: 50,
      gradeNota: 'B',
      status: 'done',
      loins: [{ id: 1, name: 'Loin 1', weight: 25, grade: 'B' }]
    };

    const fishPending: FishRecord = {
      id: 'FISH-PENDING',
      batchId: 'BATCH-08',
      noIkan: 2,
      kodeIkan: 'Tuna Pending',
      beratUtuh: 45,
      gradeNota: 'B',
      status: 'pending',
      loins: []
    };

    const batch: BatchInfo = {
      id: 'BATCH-08',
      nelayan: 'Kapal Nelayan 08',
      tanggal: '2026-08-16',
      hargaBeliGradeB: 46000,
      biayaArmada: 0,
      tarifKargoPerKgLoin: 31000,
      hargaJualLoinB: 135000
    };

    // When both fish are included, batchStatus is 'WIP'
    const resWip = calculateExactHpp(batch, [fishDone, fishPending], defaultPackagingPrices);
    expect(resWip.batchStatus).toBe('WIP');
    expect(resWip.pendingIkanCount).toBe(1);
    expect(resWip.doneIkanCount).toBe(1);

    // When only done fish is included, batchStatus is 'FINAL'
    const resFinal = calculateExactHpp(batch, [fishDone], defaultPackagingPrices);
    expect(resFinal.batchStatus).toBe('FINAL');
    expect(resFinal.pendingIkanCount).toBe(0);
    expect(resFinal.doneIkanCount).toBe(1);
  });

  it('9. Full batch progress keeps DONE_ONLY calculations provisional while fish remain pending', () => {
    const doneFish: FishRecord = {
      id: 'DONE', batchId: 'BATCH-09', noIkan: 1, kodeIkan: 'DONE',
      beratUtuh: 50, gradeNota: 'B', status: 'done',
      loins: [{ id: 1, name: 'Loin 1', weight: 25, grade: 'B' }]
    };
    const batch: BatchInfo = {
      id: 'BATCH-09', nelayan: 'Audit WIP', tanggal: '2026-08-23',
      hargaBeliGradeB: 46000, hargaBeliGradeC: 43000, biayaArmada: 0,
      tarifKargoPerKgLoin: 31000, hargaJualLoinB: 135000, hargaJualLoinC: 120000
    };

    const result = calculateExactHpp(
      batch, [doneFish], defaultPackagingPrices,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { totalIkanCount: 2, doneIkanCount: 1, pendingIkanCount: 1 }
    );

    expect(result.batchStatus).toBe('WIP');
    expect(result.totalIkanCount).toBe(2);
    expect(result.calculationScopeCount).toBe(1);
  });

  it('10. Excess by-product income never creates negative HPP', () => {
    const fish: FishRecord = {
      id: 'FISH-EXCESS', batchId: 'BATCH-10', noIkan: 1, kodeIkan: 'EXCESS',
      beratUtuh: 100, gradeNota: 'C', status: 'done',
      loins: [{ id: 1, name: 'Loin 1', weight: 60, grade: 'C' }]
    };
    const batch: BatchInfo = {
      id: 'BATCH-10', nelayan: 'Audit Excess', tanggal: '2026-08-23',
      hargaBeliGradeB: 46000, hargaBeliGradeC: 43000, biayaArmada: 0,
      tarifKargoPerKgLoin: 0, hargaJualLoinB: 135000, hargaJualLoinC: 120000,
      tetelanKg: 1000, hargaTetelanPerKg: 25000
    };

    const result = calculateExactHpp(batch, [fish], defaultPackagingPrices);
    expect(result.netCostPool).toBe(0);
    expect(result.blendedLandedHppPerKg).toBe(0);
    expect(result.gradeAllocations.A.hppLandedPerKg).toBeGreaterThanOrEqual(0);
    expect(result.gradeAllocations.B.hppLandedPerKg).toBeGreaterThanOrEqual(0);
    expect(result.gradeAllocations.C.hppLandedPerKg).toBeGreaterThanOrEqual(0);
    expect(result.excessByProductRevenue).toBeGreaterThan(0);
    expect(result.totalByProductRevenue).toBe(result.byProductCreditApplied + result.excessByProductRevenue);
  });

  it('11. Malformed custom materials degrade safely to an empty array', () => {
    const fish: FishRecord = {
      id: 'FISH-SCHEMA', batchId: 'BATCH-11', noIkan: 1, kodeIkan: 'SCHEMA',
      beratUtuh: 100, gradeNota: 'C', status: 'done',
      loins: [{ id: 1, name: 'Loin 1', weight: 60, grade: 'C' }]
    };
    const batch = {
      id: 'BATCH-11', nelayan: 'Audit Schema', tanggal: '2026-08-23',
      hargaBeliGradeB: 46000, hargaBeliGradeC: 43000, biayaArmada: 0,
      tarifKargoPerKgLoin: 0, hargaJualLoinB: 135000, hargaJualLoinC: 120000,
      customMaterials: { invalid: true }
    } as unknown as BatchInfo;

    expect(() => calculateExactHpp(batch, [fish], defaultPackagingPrices)).not.toThrow();
    expect(calculateExactHpp(batch, [fish], defaultPackagingPrices).packagingDetails.customMaterials).toEqual([]);
  });
});
