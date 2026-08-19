import re

file_path = r"c:\Users\LENOVO\Documents\KTG old\src\components\Step3HitungHpp.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State replacements
old_state = """  // Packaging prices modal local state
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [localPrices, setLocalPrices] = useState({ ...packagingPrices });
  const [saveAlert, setSaveAlert] = useState(false);"""

new_state = """  // Zone A: Material Input State
  const [matPrices, setMatPrices] = useState(() => {
    const bp = activeBatch.batchPackagingPrices || packagingPrices;
    return { ...bp };
  });

  const [qtyEs, setQtyEs] = useState(activeBatch.jmlEsBalok ?? 0);
  const [qtyBox, setQtyBox] = useState(activeBatch.jmlStyrofoamBox ?? 0);
  const [qtyJelly, setQtyJelly] = useState(activeBatch.jmlJellyIceLusin ?? 0);
  const [qtyPlastikLayer, setQtyPlastikLayer] = useState(activeBatch.jmlPlastikLayer ?? 0);
  const [qtyPlastikFoam, setQtyPlastikFoam] = useState(activeBatch.jmlPlastikStyrofoam ?? 0);
  const [qtyLakban, setQtyLakban] = useState(activeBatch.jmlLakbanRoll ?? 0);

  const [batchCustomMats, setBatchCustomMats] = useState<CustomMaterial[]>(activeBatch.batchCustomMaterials || []);

  const [materialSaveAlert, setMaterialSaveAlert] = useState(false);

  useEffect(() => {
    const bp = activeBatch.batchPackagingPrices || packagingPrices;
    setMatPrices({ ...bp });
    setQtyEs(activeBatch.jmlEsBalok ?? 0);
    setQtyBox(activeBatch.jmlStyrofoamBox ?? 0);
    setQtyJelly(activeBatch.jmlJellyIceLusin ?? 0);
    setQtyPlastikLayer(activeBatch.jmlPlastikLayer ?? 0);
    setQtyPlastikFoam(activeBatch.jmlPlastikStyrofoam ?? 0);
    setQtyLakban(activeBatch.jmlLakbanRoll ?? 0);
    setBatchCustomMats(activeBatch.batchCustomMaterials || []);
  }, [activeBatch.id, activeBatch.batchPackagingPrices, activeBatch.batchCustomMaterials, packagingPrices, activeBatch.jmlEsBalok, activeBatch.jmlStyrofoamBox, activeBatch.jmlJellyIceLusin, activeBatch.jmlPlastikLayer, activeBatch.jmlPlastikStyrofoam, activeBatch.jmlLakbanRoll]);"""

content = content.replace(old_state, new_state)

# 2. Handlers replacements
old_handlers = """  // Handle save packaging prices
  const handleOpenPackagingModal = () => {
    setLocalPrices({ 
      ...packagingPrices,
      customMaterials: [...(packagingPrices.customMaterials || [])]
    });
    setNewMatName('');
    setNewMatUnit('pcs');
    setNewMatPrice('');
    setNewMatQty('');
    setShowPackagingModal(true);
    setSaveAlert(false);
  };

  const handleAddCustomMaterial = () => {
    if (!newMatName.trim()) return;
    const price = parseFloat(newMatPrice) || 0;
    const qty = parseFloat(newMatQty) || 0;
    if (price <= 0 || qty <= 0) return;

    const newMat: CustomMaterial = {
      id: `MAT-${Date.now()}`,
      name: newMatName.trim(),
      unit: newMatUnit.trim() || 'pcs',
      pricePerUnit: price,
      quantity: qty
    };

    setLocalPrices(prev => ({
      ...prev,
      customMaterials: [...(prev.customMaterials || []), newMat]
    }));

    setNewMatName('');
    setNewMatPrice('');
    setNewMatQty('');
  };

  const handleRemoveCustomMaterial = (id: string) => {
    setLocalPrices(prev => ({
      ...prev,
      customMaterials: (prev.customMaterials || []).filter(m => m.id !== id)
    }));
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    updatePackagingPrices(localPrices);
    setSaveAlert(true);
    setTimeout(() => {
      setSaveAlert(false);
      setShowPackagingModal(false);
    }, 900);
  };"""

new_handlers = """  // Zone A Handlers
  const handleAddCustomMaterial = () => {
    if (!newMatName.trim()) return;
    const price = parseFloat(newMatPrice) || 0;
    const qty = parseFloat(newMatQty) || 0;
    if (price <= 0 || qty <= 0) return;

    const newMat: CustomMaterial = {
      id: `MAT-${Date.now()}`,
      name: newMatName.trim(),
      unit: newMatUnit.trim() || 'pcs',
      pricePerUnit: price,
      quantity: qty
    };

    setBatchCustomMats(prev => [...prev, newMat]);

    setNewMatName('');
    setNewMatPrice('');
    setNewMatQty('');
  };

  const handleRemoveCustomMaterial = (id: string) => {
    setBatchCustomMats(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveMaterial = () => {
    updateBatch(activeBatch.id, {
      batchPackagingPrices: matPrices,
      batchCustomMaterials: batchCustomMats,
      jmlEsBalok: qtyEs,
      jmlStyrofoamBox: qtyBox,
      jmlJellyIceLusin: qtyJelly,
      jmlPlastikLayer: qtyPlastikLayer,
      jmlPlastikStyrofoam: qtyPlastikFoam,
      jmlLakbanRoll: qtyLakban,
    });
    setMaterialSaveAlert(true);
    setTimeout(() => setMaterialSaveAlert(false), 2500);
  };"""

content = content.replace(old_handlers, new_handlers)

# 3. Modify Layout
# Find everything starting from "// 1. Password Lock Gate Screen" to the end.
layout_start = content.find("  // --------------------------------------------------------------------------\n  // 1. Password Lock Gate Screen")

if layout_start == -1:
    print("Could not find start of layout block")
    exit(1)

pre_layout = content[:layout_start]
post_layout_raw = content[layout_start:]

# Remove the packaging modal from the end
modal_start = post_layout_raw.find("      {/* Modal Settings: Harga Bahan Kemasan")
if modal_start != -1:
    modal_end = post_layout_raw.find("      {/* Modal: Ganti Password HPP */}", modal_start)
    if modal_end != -1:
        post_layout_raw = post_layout_raw[:modal_start] + post_layout_raw[modal_end:]

# Modify the Biaya Kemasan Button (Exclusive inside HPP!) -> remove it
btn_start = post_layout_raw.find("            {/* Biaya Kemasan Button")
if btn_start != -1:
    btn_end = post_layout_raw.find("            {/* Excel Button */}", btn_start)
    if btn_end != -1:
        post_layout_raw = post_layout_raw[:btn_start] + post_layout_raw[btn_end:]

zone_a_ui = """      {/* ZONE A: MATERIAL INPUT FORM (UNLOCKED) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" aria-hidden="true" />
            📦 Input Material Kemasan — Batch {activeBatch.id}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catat material yang terpakai dan harga satuan untuk batch ini
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-xs text-slate-400 bg-slate-950/50">
              <tr>
                <th className="px-3 py-2 rounded-l-lg">Material</th>
                <th className="px-3 py-2">Harga Satuan (Rp)</th>
                <th className="px-3 py-2">Jumlah Terpakai</th>
                <th className="px-3 py-2 rounded-r-lg text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {/* Es Balok */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Es Balok (balok)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.esBalok} onChange={(e) => setMatPrices({...matPrices, esBalok: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyEs} onChange={(e) => setQtyEs(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.esBalok || 0) * (qtyEs || 0))}</td>
              </tr>
              {/* Styrofoam Box */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Styrofoam Box (box)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.styrofoamBox} onChange={(e) => setMatPrices({...matPrices, styrofoamBox: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyBox} onChange={(e) => setQtyBox(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.styrofoamBox || 0) * (qtyBox || 0))}</td>
              </tr>
              {/* Jelly Ice */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Jelly Ice (lusin)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.jellyIceLusin} onChange={(e) => setMatPrices({...matPrices, jellyIceLusin: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyJelly} onChange={(e) => setQtyJelly(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.jellyIceLusin || 0) * (qtyJelly || 0))}</td>
              </tr>
              {/* Plastik Layer */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Plastik Layer (lembar)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.plastikLayer} onChange={(e) => setMatPrices({...matPrices, plastikLayer: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyPlastikLayer} onChange={(e) => setQtyPlastikLayer(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.plastikLayer || 0) * (qtyPlastikLayer || 0))}</td>
              </tr>
              {/* Plastik Styrofoam */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Plastik Styrofoam (lembar)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.plastikStyrofoam} onChange={(e) => setMatPrices({...matPrices, plastikStyrofoam: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyPlastikFoam} onChange={(e) => setQtyPlastikFoam(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.plastikStyrofoam || 0) * (qtyPlastikFoam || 0))}</td>
              </tr>
              {/* Lakban */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Lakban (roll)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.lakbanRoll} onChange={(e) => setMatPrices({...matPrices, lakbanRoll: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={qtyLakban} onChange={(e) => setQtyLakban(parseFloat(e.target.value) || 0)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.lakbanRoll || 0) * (qtyLakban || 0))}</td>
              </tr>
              {/* Plastik Loin Vacuum */}
              <tr className="hover:bg-slate-800/20">
                <td className="px-3 py-2 font-medium text-slate-200">Plastik Loin Vacuum (per kg loin)</td>
                <td className="px-3 py-2">
                  <input type="number" value={matPrices.alokasiPlastikLoinPerKg} onChange={(e) => setMatPrices({...matPrices, alokasiPlastikLoinPerKg: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus-ring text-base tabular-nums" />
                </td>
                <td className="px-3 py-2 font-mono text-slate-400">
                  {formatKg(hpp.totalLoinKg)} (otomatis)
                </td>
                <td className="px-3 py-2 text-right font-mono text-purple-300 font-bold">{formatRupiah((matPrices.alokasiPlastikLoinPerKg || 0) * (hpp.totalLoinKg || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Harga Jual Tetelan & Tulang (Moved from packaging modal) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <label htmlFor="price-tetelan" className="block text-emerald-300 font-semibold mb-1 text-xs">Harga Jual Tetelan (Rp/kg)</label>
            <input
              id="price-tetelan"
              type="number"
              value={matPrices.tetelanPricePerKg}
              onChange={(e) => setMatPrices({ ...matPrices, tetelanPricePerKg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-base focus-ring tabular-nums"
            />
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <label htmlFor="price-tulang" className="block text-emerald-300 font-semibold mb-1 text-xs">Harga Jual Tulang (Rp/kg)</label>
            <input
              id="price-tulang"
              type="number"
              value={matPrices.tulangPricePerKg}
              onChange={(e) => setMatPrices({ ...matPrices, tulangPricePerKg: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-base focus-ring tabular-nums"
            />
          </div>
        </div>

        {/* Custom Materials */}
        <div className="border-t border-slate-800 pt-4 mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-sm text-white block font-sans">
                Material Tambahan Lainnya
              </span>
              <span className="text-[11px] text-slate-400">
                Tambahkan material baru khusus untuk batch ini
              </span>
            </div>
            <span className="text-[11px] text-purple-300 font-mono font-bold bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-500/30">
              {batchCustomMats.length} Item
            </span>
          </div>

          {batchCustomMats.length > 0 && (
            <div className="space-y-2">
              {batchCustomMats.map((mat) => {
                const subtotal = (mat.pricePerUnit || 0) * (mat.quantity || 0);
                return (
                  <div key={mat.id} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm truncate">{mat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                          {mat.quantity} {mat.unit}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        @ {formatRupiah(mat.pricePerUnit)}/{mat.unit} &bull; Subtotal: <strong className="text-purple-300 font-bold">{formatRupiah(subtotal)}</strong>
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

          {/* Add Custom Material Form */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-dashed border-slate-700 space-y-2.5">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Tambah Material / Biaya Baru:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <label className="block text-[11px] text-slate-300 mb-1">Nama Material:</label>
                <input
                  type="text"
                  placeholder="Misal: Segel Pengaman"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-white focus-ring placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-300 mb-1">Satuan:</label>
                <input
                  type="text"
                  placeholder="pcs / roll"
                  value={newMatUnit}
                  onChange={(e) => setNewMatUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-white focus-ring font-mono placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-300 mb-1">Harga / Satuan (Rp):</label>
                <input
                  type="number"
                  step="100"
                  placeholder="Rp / unit"
                  value={newMatPrice}
                  onChange={(e) => setNewMatPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-white font-mono focus-ring tabular-nums placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-300 mb-1">Jumlah (Qty):</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Qty dipakai"
                  value={newMatQty}
                  onChange={(e) => setNewMatQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-white font-mono focus-ring tabular-nums placeholder:text-slate-600"
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
              <span>Masukkan ke Daftar Material</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
          {materialSaveAlert && (
            <div className="flex items-center justify-center gap-2 font-bold text-emerald-300 text-sm py-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl">
              <Check className="w-4 h-4" /> Material Batch Berhasil Disimpan!
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveMaterial}
            className="w-full sm:w-auto px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm shadow-md shadow-purple-600/30 transition-all focus-ring flex justify-center items-center gap-2 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Material Batch Ini</span>
          </button>
        </div>
      </section>
"""

# Extract the locked screen content
lock_screen_start = post_layout_raw.find("    return (\n      <div className=\"max-w-md mx-auto py-8 sm:py-12 px-4 animate-in fade-in\">")
lock_screen_end = post_layout_raw.find("    );\n  }\n\n  // --------------------------------------------------------------------------\n  // 2. Unlocked Full HPP Financial Screen")

if lock_screen_start != -1 and lock_screen_end != -1:
    lock_screen_code = post_layout_raw[lock_screen_start + 13:lock_screen_end]
else:
    print("Could not find lock screen")
    exit(1)

# Extract unlocked screen content
unlocked_start = post_layout_raw.find("  return (\n    <div className=\"space-y-4 sm:space-y-6 max-w-4xl mx-auto\">")
if unlocked_start != -1:
    unlocked_code = post_layout_raw[unlocked_start + 84:] # Skip the wrapper div
    unlocked_code = unlocked_code[:unlocked_code.rfind("    </div>\n  );\n};\n")]
else:
    print("Could not find unlocked screen")
    exit(1)

# Assemble new layout
new_layout = """  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
""" + zone_a_ui + """
      {/* ZONE B: HPP RESULTS (LOCKED) */}
      {!isHppUnlocked ? (""" + lock_screen_code + """      ) : (
        <>
""" + unlocked_code + """        </>
      )}
    </div>
  );
};
"""

content = pre_layout + new_layout

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Success")
