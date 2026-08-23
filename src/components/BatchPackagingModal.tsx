import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CustomMaterial, BatchInfo } from '../types';
import { formatKg, formatRupiah, getJakartaDateString, safeNonNegative } from '../utils/calculations';
import { Package, Plus, Trash2, X, Check, Sparkles, Save } from 'lucide-react';

interface BatchPackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchPackagingModal: React.FC<BatchPackagingModalProps> = ({ isOpen, onClose }) => {
  const { activeBatch, activeBatchFish, packagingPrices, updateBatch, updatePackagingPrices, canManageFinancials } = useApp();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Defensive fallback for activeBatch
  const currentBatch = activeBatch || {
    id: 'BATCH-01',
    nelayan: 'Kapal Nelayan',
    tanggal: getJakartaDateString(),
    hargaBeliGradeB: 46000,
    hargaBeliGradeC: 43000,
    hargaBeliGradeA: 50000,
    biayaArmada: 300000
  };

  const currentPrices = packagingPrices || {
    esBalok: 25000,
    styrofoamBox: 102500,
    jellyIceLusin: 300,
    plastikLayer: 500,
    plastikStyrofoam: 800,
    lakbanRoll: 100000,
    alokasiPlastikLoinPerKg: 300
  };

  // Calculate real saleable loin kg for this batch (excluding reject)
  const totalLoinKg = useMemo(() => {
    if (!activeBatchFish || !Array.isArray(activeBatchFish)) return 0;
    return activeBatchFish.reduce((acc, fish) => {
      const fishLoinSum = (fish?.loins || []).reduce((lAcc, l) => {
        if (l?.grade === 'Reject') return lAcc;
        return lAcc + (l?.weight || 0);
      }, 0);
      return acc + fishLoinSum;
    }, 0);
  }, [activeBatchFish]);

  const autoBoxCount = totalLoinKg > 0 ? Math.ceil(totalLoinKg / 30) : 0;

  // Local Form State (Quantity & Unit Prices per Batch) - All clamped non-negative
  const [qtyEs, setQtyEs] = useState<number>(0);
  const [priceEs, setPriceEs] = useState<number>(25000);

  const [qtyBox, setQtyBox] = useState<number>(0);
  const [priceBox, setPriceBox] = useState<number>(102500);

  const [qtyJelly, setQtyJelly] = useState<number>(0);
  const [priceJelly, setPriceJelly] = useState<number>(300);

  const [qtyLayer, setQtyLayer] = useState<number>(0);
  const [priceLayer, setPriceLayer] = useState<number>(500);

  const [qtyFoam, setQtyFoam] = useState<number>(0);
  const [priceFoam, setPriceFoam] = useState<number>(800);

  const [qtyLakban, setQtyLakban] = useState<number>(0);
  const [priceLakban, setPriceLakban] = useState<number>(100000);

  const [pricePlastikLoin, setPricePlastikLoin] = useState<number>(300);

  // Custom materials for this batch
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);

  // New Custom Material Inline Form
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('pcs');
  const [newMatPrice, setNewMatPrice] = useState<string>('');
  const [newMatQty, setNewMatQty] = useState<string>('');

  const [saveAlert, setSaveAlert] = useState(false);

  // Initial focus and focus restoration when the dialog closes.
  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(focusTimer);
      const returnTarget = returnFocusRef.current;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
      });
    };
  }, [isOpen]);

  // Focus trap & Escape key handler
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [isOpen, onClose]);

  // Sync state when modal opens or active batch changes
  useEffect(() => {
    if (isOpen && currentBatch) {
      const boxes = safeNonNegative(currentBatch.jmlStyrofoamBox, autoBoxCount);
      setQtyBox(boxes);
      setQtyEs(safeNonNegative(currentBatch.jmlEsBalok, boxes > 0 ? Math.round(boxes * 0.5) : 0));
      setQtyJelly(safeNonNegative(currentBatch.jmlJellyIceLusin, boxes > 0 ? +(boxes * 0.75).toFixed(1) : 0));
      setQtyLayer(safeNonNegative(currentBatch.jmlPlastikLayer, boxes));
      setQtyFoam(safeNonNegative(currentBatch.jmlPlastikStyrofoam, boxes));
      setQtyLakban(safeNonNegative(currentBatch.jmlLakbanRoll, boxes > 0 ? Math.max(0.5, +(boxes * 0.025).toFixed(2)) : 0));

      setPriceEs(safeNonNegative(currentBatch.hargaEsBalok ?? currentPrices.esBalok, 25000));
      setPriceBox(safeNonNegative(currentBatch.hargaStyrofoamBox ?? currentPrices.styrofoamBox, 102500));
      setPriceJelly(safeNonNegative(currentBatch.hargaJellyIceLusin ?? currentPrices.jellyIceLusin, 300));
      setPriceLayer(safeNonNegative(currentBatch.hargaPlastikLayer ?? currentPrices.plastikLayer, 500));
      setPriceFoam(safeNonNegative(currentBatch.hargaPlastikStyrofoam ?? currentPrices.plastikStyrofoam, 800));
      setPriceLakban(safeNonNegative(currentBatch.hargaLakbanRoll ?? currentPrices.lakbanRoll, 100000));
      setPricePlastikLoin(safeNonNegative(currentBatch.hargaPlastikLoinPerKg ?? currentPrices.alokasiPlastikLoinPerKg, 300));

      if (Array.isArray(currentBatch.customMaterials) && currentBatch.customMaterials.length > 0) {
        setCustomMaterials([...currentBatch.customMaterials]);
      } else if (Array.isArray(currentPrices.customMaterials) && currentPrices.customMaterials.length > 0) {
        setCustomMaterials([...currentPrices.customMaterials]);
      } else {
        setCustomMaterials([]);
      }

      setSaveAlert(false);
      setNewMatName('');
      setNewMatPrice('');
      setNewMatQty('');
    }
  }, [isOpen, currentBatch.id, autoBoxCount]);

  if (!isOpen) return null;

  // Auto Fill Handler based on real loin weight
  const handleAutoFill = () => {
    const boxes = autoBoxCount > 0 ? autoBoxCount : 1;
    setQtyBox(boxes);
    setQtyEs(Math.round(boxes * 0.5));
    setQtyJelly(+(boxes * 0.75).toFixed(1));
    setQtyLayer(boxes);
    setQtyFoam(boxes);
    setQtyLakban(Math.max(0.5, +(boxes * 0.025).toFixed(2)));
  };

  // Custom Material Handlers
  const handleAddCustomMaterial = () => {
    if (!newMatName.trim()) return;
    const p = safeNonNegative(parseFloat(newMatPrice), 0);
    const q = safeNonNegative(parseFloat(newMatQty), 0);
    if (p <= 0 || q <= 0) return;

    const newMat: CustomMaterial = {
      id: `MAT-${Date.now()}`,
      name: newMatName.trim(),
      unit: newMatUnit.trim() || 'pcs',
      pricePerUnit: p,
      quantity: q
    };

    setCustomMaterials(prev => [...prev, newMat]);
    setNewMatName('');
    setNewMatPrice('');
    setNewMatQty('');
  };

  const handleRemoveCustomMaterial = (id: string) => {
    setCustomMaterials(prev => prev.filter(m => m.id !== id));
  };

  // Subtotals Calculation with safety
  const subtotalEs = (qtyEs || 0) * (priceEs || 0);
  const subtotalBox = (qtyBox || 0) * (priceBox || 0);
  const subtotalJelly = (qtyJelly || 0) * (priceJelly || 0);
  const subtotalLayer = (qtyLayer || 0) * (priceLayer || 0);
  const subtotalFoam = (qtyFoam || 0) * (priceFoam || 0);
  const subtotalLakban = (qtyLakban || 0) * (priceLakban || 0);
  const subtotalPlastikLoin = (totalLoinKg || 0) * (pricePlastikLoin || 0);
  const subtotalCustom = (customMaterials || []).reduce((sum, m) => sum + (safeNonNegative(m?.pricePerUnit) * safeNonNegative(m?.quantity)), 0);

  const grandTotalKemasan = subtotalEs + subtotalBox + subtotalJelly + subtotalLayer + subtotalFoam + subtotalLakban + subtotalPlastikLoin + subtotalCustom;
  const costPerKgLoin = totalLoinKg > 0 ? grandTotalKemasan / totalLoinKg : 0;

  // Simpan kuantitas operasional dan, khusus owner/manager, data harga.
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBatchData: Partial<BatchInfo> = {
      jmlEsBalok: safeNonNegative(qtyEs),
      jmlStyrofoamBox: safeNonNegative(qtyBox),
      jmlJellyIceLusin: safeNonNegative(qtyJelly),
      jmlPlastikLayer: safeNonNegative(qtyLayer),
      jmlPlastikStyrofoam: safeNonNegative(qtyFoam),
      jmlLakbanRoll: safeNonNegative(qtyLakban),

      hargaEsBalok: safeNonNegative(priceEs),
      hargaStyrofoamBox: safeNonNegative(priceBox),
      hargaJellyIceLusin: safeNonNegative(priceJelly),
      hargaPlastikLayer: safeNonNegative(priceLayer),
      hargaPlastikStyrofoam: safeNonNegative(priceFoam),
      hargaLakbanRoll: safeNonNegative(priceLakban),
      hargaPlastikLoinPerKg: safeNonNegative(pricePlastikLoin),

      customMaterials: customMaterials,
      biayaKemasanPerKgLoin: Math.round(costPerKgLoin)
    };

    if (currentBatch.id) {
      await updateBatch(currentBatch.id, updatedBatchData);
    }

    // Also update global packagingPrices templates for future batches
    await updatePackagingPrices({
      esBalok: safeNonNegative(priceEs),
      styrofoamBox: safeNonNegative(priceBox),
      jellyIceLusin: safeNonNegative(priceJelly),
      plastikLayer: safeNonNegative(priceLayer),
      plastikStyrofoam: safeNonNegative(priceFoam),
      lakbanRoll: safeNonNegative(priceLakban),
      alokasiPlastikLoinPerKg: safeNonNegative(pricePlastikLoin)
    });

    setSaveAlert(true);
    setTimeout(() => {
      setSaveAlert(false);
      onClose();
    }, 900);
  };

  const handleStaffSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch.id || currentBatch.lifecycleStatus === 'FINAL') return;
    try {
      await updateBatch(currentBatch.id, {
        jmlEsBalok: safeNonNegative(qtyEs),
        jmlStyrofoamBox: safeNonNegative(qtyBox),
        jmlJellyIceLusin: safeNonNegative(qtyJelly),
        jmlPlastikLayer: safeNonNegative(qtyLayer),
        jmlPlastikStyrofoam: safeNonNegative(qtyFoam),
        jmlLakbanRoll: safeNonNegative(qtyLakban)
      });
      setSaveAlert(true);
      setTimeout(onClose, 700);
    } catch {
      setSaveAlert(false);
    }
  };

  if (!canManageFinancials) {
    const quantityRows = [
      ['Es balok', qtyEs, setQtyEs, 'balok'],
      ['Styrofoam box', qtyBox, setQtyBox, 'box'],
      ['Jelly ice', qtyJelly, setQtyJelly, 'lusin'],
      ['Plastik layer', qtyLayer, setQtyLayer, 'lembar'],
      ['Plastik styrofoam', qtyFoam, setQtyFoam, 'lembar'],
      ['Lakban', qtyLakban, setQtyLakban, 'roll']
    ] as const;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="staff-packaging-title">
        <div ref={modalRef} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 id="staff-packaging-title" className="font-extrabold text-white">Pemakaian Kemasan</h2>
              <p className="mt-1 text-xs text-slate-300">Staff mencatat kuantitas. Harga dan nilai biaya hanya tersedia untuk owner/manager.</p>
            </div>
            <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 focus-ring" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </div>
          {currentBatch.lifecycleStatus === 'FINAL' && (
            <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950 p-3 text-xs font-semibold text-amber-200">Batch FINAL terkunci.</p>
          )}
          <form onSubmit={handleStaffSave} className="mt-4 space-y-3">
            <button type="button" onClick={handleAutoFill} disabled={currentBatch.lifecycleStatus === 'FINAL'} className="min-h-[44px] w-full rounded-xl border border-purple-500/40 bg-purple-950 px-3 py-2 text-xs font-bold text-purple-200 disabled:opacity-40 focus-ring">
              <Sparkles className="mr-1.5 inline h-4 w-4" /> Isi rekomendasi otomatis
            </button>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quantityRows.map(([label, value, setter, unit], index) => (
                <label key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-semibold text-slate-200">
                  {label} ({unit})
                  <input
                    ref={index === 0 ? firstInputRef : undefined}
                    type="number"
                    min="0"
                    step="0.5"
                    value={value || ''}
                    disabled={currentBatch.lifecycleStatus === 'FINAL'}
                    onChange={event => setter(Math.max(0, Number(event.target.value) || 0))}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-base text-white disabled:opacity-50 focus-ring"
                  />
                </label>
              ))}
            </div>
            {saveAlert && <p role="status" className="text-center text-xs font-bold text-emerald-300">Pemakaian berhasil disimpan.</p>}
            <button type="submit" disabled={currentBatch.lifecycleStatus === 'FINAL'} className="min-h-[48px] w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40 focus-ring">
              <Save className="mr-1.5 inline h-4 w-4" /> Simpan Pemakaian
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-packaging-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl animate-in fade-in my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400 shrink-0" aria-hidden="true" />
              <h2 id="batch-packaging-title" className="text-base sm:text-lg font-bold text-white truncate">
                Catat Pemakaian & Biaya Kemasan
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-mono">
              Batch: <strong className="text-cyan-300">{currentBatch.nelayan}</strong> &bull; {currentBatch.code || currentBatch.id.slice(0, 8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl focus-ring shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup formulir kemasan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real Loin Weight & Quick Auto-Fill Banner */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5 text-xs shrink-0">
          <div>
            <span className="text-slate-400 block font-sans">Total Daging Loin Batch Ini:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-black text-cyan-300 font-mono tabular-nums">{formatKg(totalLoinKg)}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                Estimasi ~{autoBoxCount} Box (30 kg/box)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoFill}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring min-h-[44px]"
            title="Hitung otomatis rekomendasi jumlah box dan es berdasarkan kilogram loin"
          >
            <Sparkles className="w-4 h-4" />
            <span>Isi Otomatis Sesuai Loin</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={event => void handleSave(event).catch(() => setSaveAlert(false))} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">

          {/* Section: Material Inti (Qty & Harga) */}
          <div className="space-y-3">
            <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider block">
              1. Material Kemasan & Es Balok (Input Jumlah Terpakai & Harga)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Es Balok */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Es Balok</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalEs)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-es" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Balok):</label>
                    <input
                      ref={firstInputRef}
                      id="input-qty-es"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Qty"
                      value={qtyEs === 0 ? '' : qtyEs}
                      onChange={(e) => setQtyEs(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-es" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Balok (Rp):</label>
                    <input
                      id="input-price-es"
                      type="number"
                      step="1000"
                      min="0"
                      value={priceEs || ''}
                      onChange={(e) => setPriceEs(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Styrofoam Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Styrofoam Box</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalBox)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-box" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Box):</label>
                    <input
                      id="input-qty-box"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Qty"
                      value={qtyBox === 0 ? '' : qtyBox}
                      onChange={(e) => setQtyBox(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-box" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Box (Rp):</label>
                    <input
                      id="input-price-box"
                      type="number"
                      step="500"
                      min="0"
                      value={priceBox || ''}
                      onChange={(e) => setPriceBox(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Jelly Ice */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Jelly Ice</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalJelly)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-jelly" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Lusin):</label>
                    <input
                      id="input-qty-jelly"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Lusin"
                      value={qtyJelly === 0 ? '' : qtyJelly}
                      onChange={(e) => setQtyJelly(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-jelly" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Lusin (Rp):</label>
                    <input
                      id="input-price-jelly"
                      type="number"
                      step="50"
                      min="0"
                      value={priceJelly || ''}
                      onChange={(e) => setPriceJelly(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Lakban */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Lakban Roll</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalLakban)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-lakban" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Roll):</label>
                    <input
                      id="input-qty-lakban"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Roll"
                      value={qtyLakban === 0 ? '' : qtyLakban}
                      onChange={(e) => setQtyLakban(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-lakban" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Roll (Rp):</label>
                    <input
                      id="input-price-lakban"
                      type="number"
                      step="1000"
                      min="0"
                      value={priceLakban || ''}
                      onChange={(e) => setPriceLakban(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Plastik Layer */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Plastik Layer</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalLayer)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-layer" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Lembar):</label>
                    <input
                      id="input-qty-layer"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Lembar"
                      value={qtyLayer === 0 ? '' : qtyLayer}
                      onChange={(e) => setQtyLayer(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-layer" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Lembar (Rp):</label>
                    <input
                      id="input-price-layer"
                      type="number"
                      step="50"
                      min="0"
                      value={priceLayer || ''}
                      onChange={(e) => setPriceLayer(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Plastik Foam */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Plastik Foam (Styrofoam)</span>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalFoam)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="input-qty-foam" className="text-[10px] text-slate-300 font-semibold block mb-1">Jumlah (Lembar):</label>
                    <input
                      id="input-qty-foam"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Lembar"
                      value={qtyFoam === 0 ? '' : qtyFoam}
                      onChange={(e) => setQtyFoam(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-price-foam" className="text-[10px] text-slate-300 font-semibold block mb-1">Harga / Lembar (Rp):</label>
                    <input
                      id="input-price-foam"
                      type="number"
                      step="50"
                      min="0"
                      value={priceFoam || ''}
                      onChange={(e) => setPriceFoam(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Plastik Loin Vacuum (Alokasi per kg Loin) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <label htmlFor="input-price-plastik-loin" className="font-bold text-white block">Plastik Loin Vacuum (Alokasi per kg Daging)</label>
                    <span className="text-[10px] text-slate-400">Otomatis dikalikan {formatKg(totalLoinKg)} daging loin bersih</span>
                  </div>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalPlastikLoin)}</span>
                </div>
                <div>
                  <label htmlFor="input-price-plastik-loin" className="text-[10px] text-slate-300 font-semibold block mb-1">Biaya Plastik / kg Loin (Rp):</label>
                  <input
                    id="input-price-plastik-loin"
                    type="number"
                    step="50"
                    min="0"
                    value={pricePlastikLoin || ''}
                    onChange={(e) => setPricePlastikLoin(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-white font-mono text-sm focus-ring tabular-nums min-h-[44px]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section: Material Tambahan Dinamis */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider block">
                  2. Material Tambahan Batch Ini
                </span>
                <span className="text-[11px] text-slate-400">
                  Segel pengaman, karung goni, tali rafia, label stiker, atau upah packing buruh.
                </span>
              </div>
              <span className="text-[11px] text-purple-300 font-mono font-bold bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-500/30">
                {customMaterials.length} Item ({formatRupiah(subtotalCustom)})
              </span>
            </div>

            {/* List Material yang Sudah Ada */}
            {customMaterials.length > 0 && (
              <div className="space-y-2">
                {customMaterials.map((mat) => {
                  const sub = (mat.pricePerUnit || 0) * (mat.quantity || 0);
                  return (
                    <div
                      key={mat.id}
                      className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{mat.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono">
                            {mat.quantity} {mat.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          @ {formatRupiah(mat.pricePerUnit)}/{mat.unit} &bull; Subtotal: <strong className="text-purple-300 font-bold">{formatRupiah(sub)}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomMaterial(mat.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 active:bg-slate-800 rounded-lg transition-colors focus-ring shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title={`Hapus ${mat.name}`}
                        aria-label={`Hapus ${mat.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form Tambah Material Baru */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-dashed border-slate-700 space-y-2.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tambah Material / Ongkos Tambahan:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <label htmlFor="input-new-mat-name" className="block text-[10px] text-slate-300 font-semibold mb-1">Nama Material:</label>
                  <input
                    id="input-new-mat-name"
                    type="text"
                    placeholder="Contoh: Segel Pengaman"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-xs text-white focus-ring placeholder:text-slate-400 min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="input-new-mat-unit" className="block text-[10px] text-slate-300 font-semibold mb-1">Satuan:</label>
                  <input
                    id="input-new-mat-unit"
                    type="text"
                    placeholder="pcs / roll"
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-xs text-white focus-ring font-mono placeholder:text-slate-400 min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="input-new-mat-price" className="block text-[10px] text-slate-300 font-semibold mb-1">Harga / Satuan (Rp):</label>
                  <input
                    id="input-new-mat-price"
                    type="number"
                    step="100"
                    min="0"
                    placeholder="Rp"
                    value={newMatPrice}
                    onChange={(e) => setNewMatPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-xs text-white font-mono focus-ring tabular-nums placeholder:text-slate-400 min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="input-new-mat-qty" className="block text-[10px] text-slate-300 font-semibold mb-1">Jumlah Terpakai:</label>
                  <input
                    id="input-new-mat-qty"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Qty"
                    value={newMatQty}
                    onChange={(e) => setNewMatQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2.5 text-xs text-white font-mono focus-ring tabular-nums placeholder:text-slate-400 min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomMaterial}
                disabled={!newMatName.trim() || !(parseFloat(newMatPrice) > 0) || !(parseFloat(newMatQty) > 0)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan ke Material Batch</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {saveAlert && (
            <div className="flex items-center justify-center gap-2 font-bold text-emerald-300 text-xs sm:text-sm py-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Pemakaian Kemasan Berhasil Disimpan ke Batch Ini!</span>
            </div>
          )}

          {/* Bottom Total & Save Action */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">Total Biaya Kemasan Batch ({currentBatch.nelayan}):</span>
              <div className="text-lg sm:text-xl font-black text-purple-300 font-mono tabular-nums">
                {formatRupiah(grandTotalKemasan)} <span className="text-xs font-normal text-slate-400">({formatRupiah(Math.round(costPerKgLoin))}/kg loin)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs focus-ring min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={currentBatch.lifecycleStatus === 'FINAL'}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40 text-white font-extrabold rounded-xl text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pemakaian Batch</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
