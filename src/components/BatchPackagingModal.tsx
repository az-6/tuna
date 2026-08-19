import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CustomMaterial, BatchInfo } from '../types';
import { formatKg, formatRupiah } from '../utils/calculations';
import { Package, Plus, Trash2, X, Check, Sparkles, Save } from 'lucide-react';

interface BatchPackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchPackagingModal: React.FC<BatchPackagingModalProps> = ({ isOpen, onClose }) => {
  const { activeBatch, activeBatchFish, packagingPrices, updateBatch, updatePackagingPrices } = useApp();

  // Defensive fallback for activeBatch
  const currentBatch = activeBatch || {
    id: 'BATCH-01',
    nelayan: 'Kapal Nelayan',
    tanggal: new Date().toISOString().slice(0, 10),
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

  // Calculate real loin kg for this batch
  const totalLoinKg = useMemo(() => {
    if (!activeBatchFish || !Array.isArray(activeBatchFish)) return 0;
    return activeBatchFish.reduce((acc, fish) => {
      const fishLoinSum = (fish?.loins || []).reduce((lAcc, l) => lAcc + (l?.weight || 0), 0);
      return acc + fishLoinSum;
    }, 0);
  }, [activeBatchFish]);

  const autoBoxCount = totalLoinKg > 0 ? Math.ceil(totalLoinKg / 30) : 0;

  // Local Form State (Quantity & Unit Prices per Batch)
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

  // Sync state when modal opens or active batch changes
  useEffect(() => {
    if (isOpen && currentBatch) {
      const boxes = currentBatch.jmlStyrofoamBox ?? autoBoxCount;
      setQtyBox(boxes);
      setQtyEs(currentBatch.jmlEsBalok ?? (boxes > 0 ? Math.round(boxes * 0.5) : 0));
      setQtyJelly(currentBatch.jmlJellyIceLusin ?? (boxes > 0 ? +(boxes * 0.75).toFixed(1) : 0));
      setQtyLayer(currentBatch.jmlPlastikLayer ?? boxes);
      setQtyFoam(currentBatch.jmlPlastikStyrofoam ?? boxes);
      setQtyLakban(currentBatch.jmlLakbanRoll ?? (boxes > 0 ? Math.max(0.5, +(boxes * 0.025).toFixed(2)) : 0));

      setPriceEs(currentBatch.hargaEsBalok ?? currentPrices.esBalok ?? 25000);
      setPriceBox(currentBatch.hargaStyrofoamBox ?? currentPrices.styrofoamBox ?? 102500);
      setPriceJelly(currentBatch.hargaJellyIceLusin ?? currentPrices.jellyIceLusin ?? 300);
      setPriceLayer(currentBatch.hargaPlastikLayer ?? currentPrices.plastikLayer ?? 500);
      setPriceFoam(currentBatch.hargaPlastikStyrofoam ?? currentPrices.plastikStyrofoam ?? 800);
      setPriceLakban(currentBatch.hargaLakbanRoll ?? currentPrices.lakbanRoll ?? 100000);
      setPricePlastikLoin(currentBatch.hargaPlastikLoinPerKg ?? currentPrices.alokasiPlastikLoinPerKg ?? 300);

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
    const p = parseFloat(newMatPrice) || 0;
    const q = parseFloat(newMatQty) || 0;
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
  const subtotalCustom = (customMaterials || []).reduce((sum, m) => sum + ((m?.pricePerUnit || 0) * (m?.quantity || 0)), 0);

  const grandTotalKemasan = subtotalEs + subtotalBox + subtotalJelly + subtotalLayer + subtotalFoam + subtotalLakban + subtotalPlastikLoin + subtotalCustom;
  const costPerKgLoin = totalLoinKg > 0 ? grandTotalKemasan / totalLoinKg : 0;

  // Save changes directly to active batch in localStorage
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBatchData: Partial<BatchInfo> = {
      jmlEsBalok: qtyEs,
      jmlStyrofoamBox: qtyBox,
      jmlJellyIceLusin: qtyJelly,
      jmlPlastikLayer: qtyLayer,
      jmlPlastikStyrofoam: qtyFoam,
      jmlLakbanRoll: qtyLakban,

      hargaEsBalok: priceEs,
      hargaStyrofoamBox: priceBox,
      hargaJellyIceLusin: priceJelly,
      hargaPlastikLayer: priceLayer,
      hargaPlastikStyrofoam: priceFoam,
      hargaLakbanRoll: priceLakban,
      hargaPlastikLoinPerKg: pricePlastikLoin,

      customMaterials: customMaterials,
      biayaKemasanPerKgLoin: Math.round(costPerKgLoin)
    };

    if (currentBatch.id) {
      updateBatch(currentBatch.id, updatedBatchData);
    }

    // Also update global packagingPrices templates for future batches
    updatePackagingPrices({
      esBalok: priceEs,
      styrofoamBox: priceBox,
      jellyIceLusin: priceJelly,
      plastikLayer: priceLayer,
      plastikStyrofoam: priceFoam,
      lakbanRoll: priceLakban,
      alokasiPlastikLoinPerKg: pricePlastikLoin
    });

    setSaveAlert(true);
    setTimeout(() => {
      setSaveAlert(false);
      onClose();
    }, 900);
  };

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
              Batch: <strong className="text-cyan-300">{currentBatch.nelayan}</strong> &bull; {currentBatch.id}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg focus-ring shrink-0"
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
            className="w-full sm:w-auto px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring"
            title="Hitung otomatis rekomendasi jumlah box dan es berdasarkan kilogram loin"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Isi Otomatis Sesuai Loin</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          
          {/* Section: Material Inti (Qty & Harga) */}
          <div className="space-y-3">
            <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider block">
              1. Material Kemasan & Es Balok (Input Jumlah Terpakai & Harga)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Es Balok */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-es" className="font-bold text-white">Es Balok</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalEs)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Balok):</span>
                    <input
                      id="input-qty-es"
                      type="number"
                      step="0.5"
                      placeholder="Qty"
                      value={qtyEs === 0 ? '' : qtyEs}
                      onChange={(e) => setQtyEs(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Balok (Rp):</span>
                    <input
                      type="number"
                      step="1000"
                      value={priceEs || ''}
                      onChange={(e) => setPriceEs(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Styrofoam Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-box" className="font-bold text-white">Styrofoam Box</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalBox)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Box):</span>
                    <input
                      id="input-qty-box"
                      type="number"
                      step="1"
                      placeholder="Qty"
                      value={qtyBox === 0 ? '' : qtyBox}
                      onChange={(e) => setQtyBox(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Box (Rp):</span>
                    <input
                      type="number"
                      step="500"
                      value={priceBox || ''}
                      onChange={(e) => setPriceBox(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Jelly Ice */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-jelly" className="font-bold text-white">Jelly Ice</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalJelly)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Lusin):</span>
                    <input
                      id="input-qty-jelly"
                      type="number"
                      step="0.5"
                      placeholder="Lusin"
                      value={qtyJelly === 0 ? '' : qtyJelly}
                      onChange={(e) => setQtyJelly(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Lusin (Rp):</span>
                    <input
                      type="number"
                      step="50"
                      value={priceJelly || ''}
                      onChange={(e) => setPriceJelly(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Lakban */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-lakban" className="font-bold text-white">Lakban Roll</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalLakban)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Roll):</span>
                    <input
                      id="input-qty-lakban"
                      type="number"
                      step="0.1"
                      placeholder="Roll"
                      value={qtyLakban === 0 ? '' : qtyLakban}
                      onChange={(e) => setQtyLakban(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Roll (Rp):</span>
                    <input
                      type="number"
                      step="1000"
                      value={priceLakban || ''}
                      onChange={(e) => setPriceLakban(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Plastik Layer */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-layer" className="font-bold text-white">Plastik Layer</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalLayer)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Lembar):</span>
                    <input
                      id="input-qty-layer"
                      type="number"
                      step="1"
                      placeholder="Lembar"
                      value={qtyLayer === 0 ? '' : qtyLayer}
                      onChange={(e) => setQtyLayer(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Lembar (Rp):</span>
                    <input
                      type="number"
                      step="50"
                      value={priceLayer || ''}
                      onChange={(e) => setPriceLayer(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Plastik Foam */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-qty-foam" className="font-bold text-white">Plastik Foam (Styrofoam)</label>
                  <span className="text-purple-300 font-mono font-bold">{formatRupiah(subtotalFoam)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah (Lembar):</span>
                    <input
                      id="input-qty-foam"
                      type="number"
                      step="1"
                      placeholder="Lembar"
                      value={qtyFoam === 0 ? '' : qtyFoam}
                      onChange={(e) => setQtyFoam(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Harga / Lembar (Rp):</span>
                    <input
                      type="number"
                      step="50"
                      value={priceFoam || ''}
                      onChange={(e) => setPriceFoam(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
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
                  <span className="text-[10px] text-slate-400 block mb-0.5">Biaya Plastik / kg Loin (Rp):</span>
                  <input
                    id="input-price-plastik-loin"
                    type="number"
                    step="50"
                    value={pricePlastikLoin || ''}
                    onChange={(e) => setPricePlastikLoin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono text-sm focus-ring tabular-nums"
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
                        className="p-1.5 text-slate-400 hover:text-rose-400 active:bg-slate-800 rounded-lg transition-colors focus-ring shrink-0"
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
                  <label className="block text-[10px] text-slate-300 mb-0.5">Nama Material:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Segel Pengaman"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus-ring placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-300 mb-0.5">Satuan:</label>
                  <input
                    type="text"
                    placeholder="pcs / roll"
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus-ring font-mono placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-slate-300 mb-0.5">Harga / Satuan (Rp):</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="Rp"
                    value={newMatPrice}
                    onChange={(e) => setNewMatPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus-ring tabular-nums placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-slate-300 mb-0.5">Jumlah Terpakai:</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Qty"
                    value={newMatQty}
                    onChange={(e) => setNewMatQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus-ring tabular-nums placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomMaterial}
                disabled={!newMatName.trim() || !(parseFloat(newMatPrice) > 0) || !(parseFloat(newMatQty) > 0)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring min-h-[38px]"
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
                className="flex-1 sm:flex-none px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-ring min-h-[44px]"
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
