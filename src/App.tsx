import React from 'react';
import { useApp } from './context/AppContext';
import { SimpleNavbar } from './components/SimpleNavbar';
import { Step1IkanMasuk } from './components/Step1IkanMasuk';
import { Step2MejaPotong } from './components/Step2MejaPotong';
import { Step3HitungHpp } from './components/Step3HitungHpp';
import { BatchPackagingModal } from './components/BatchPackagingModal';
import { Inbox, Scissors, Calculator } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    activeBatchFish, 
    showPackagingModal, 
    closePackagingModal 
  } = useApp();
  
  const finishedCount = (activeBatchFish || []).filter(f => f.status === 'done').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-[72px] sm:pb-8">
      {/* Header & Global Controls */}
      <SimpleNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-6" id="main-content">
        {activeTab === 'masuk' && <Step1IkanMasuk />}
        {activeTab === 'proses' && <Step2MejaPotong />}
        {activeTab === 'hpp' && <Step3HitungHpp />}
      </main>

      {/* Mobile Fixed Bottom Navigation — safe area for notched phones */}
      <nav 
        aria-label="Navigasi Utama Mobile" 
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-2 pt-1.5 pb-1.5 safe-bottom no-print"
      >
        <div className="grid grid-cols-3 gap-1 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring min-h-[52px] ${
              activeTab === 'masuk'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-800'
            }`}
            aria-label={`1. Timbang Ikan Masuk (${activeBatchFish.length} ekor)`}
            aria-current={activeTab === 'masuk' ? 'page' : undefined}
          >
            <div className="relative">
              <Inbox className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-2.5 text-[9px] px-1 bg-slate-950 rounded-full font-mono text-cyan-300 font-bold border border-slate-700">
                {activeBatchFish.length}
              </span>
            </div>
            <span className="mt-1 text-[11px] font-semibold">1. Masuk</span>
          </button>

          <button
            onClick={() => setActiveTab('proses')}
            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring min-h-[52px] ${
              activeTab === 'proses'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-800'
            }`}
            aria-label={`2. Meja Potong Loin (${finishedCount} dari ${activeBatchFish.length} selesai)`}
            aria-current={activeTab === 'proses' ? 'page' : undefined}
          >
            <div className="relative">
              <Scissors className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-2.5 text-[9px] px-1 bg-slate-950 rounded-full font-mono text-emerald-300 font-bold border border-slate-700">
                {finishedCount}
              </span>
            </div>
            <span className="mt-1 text-[11px] font-semibold">2. Potong</span>
          </button>

          <button
            onClick={() => setActiveTab('hpp')}
            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-xs transition-all touch-manipulation focus-ring min-h-[52px] ${
              activeTab === 'hpp'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 active:bg-slate-800'
            }`}
            aria-label="3. Hitung HPP dan Laba"
            aria-current={activeTab === 'hpp' ? 'page' : undefined}
          >
            <div className="relative">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="mt-1 text-[11px] font-semibold">3. HPP</span>
          </button>
        </div>
      </nav>

      {/* Footer — hidden on mobile (behind bottom nav anyway) */}
      <footer className="hidden sm:block bg-slate-900 border-t border-slate-800/80 py-4 text-center text-xs text-slate-400 no-print">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>KTG Tuna Operations &bull; Sistem Lapangan Penerimaan, Meja Potong & HPP B2B</span>
          <span className="text-slate-300 font-mono text-[11px]">Versi Mobile First 2026</span>
        </div>
      </footer>

      {/* Root-Level Single Instance Packaging Modal (Avoids backdrop-blur stacking context bug) */}
      <BatchPackagingModal
        isOpen={showPackagingModal}
        onClose={closePackagingModal}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
