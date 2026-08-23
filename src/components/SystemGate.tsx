import React from 'react';
import { AlertTriangle, Database, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from './AuthScreen';

export const SystemGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConfigured, authLoading, session, profile, dataLoading, syncState, syncMessage, retrySync } = useApp();

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
        <section className="w-full max-w-xl rounded-2xl border border-amber-700/60 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          <Database className="w-9 h-9 text-amber-400" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-black">Konfigurasi database diperlukan</h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">Aplikasi production tidak menggunakan localStorage sebagai ledger. Tambahkan environment variable berikut di Vercel dan redeploy:</p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-cyan-300"><code>VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY</code></pre>
          <p className="mt-4 text-xs text-slate-400">Jalankan migration Supabase terlebih dahulu. Detail lengkap tersedia di DEPLOYMENT.md.</p>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return <LoadingScreen label="Memeriksa sesi aman…" />;
  }
  if (!session) return <AuthScreen />;
  if (dataLoading && !profile) return <LoadingScreen label="Memuat ruang kerja organisasi…" />;

  return (
    <>
      {syncMessage && (
        <div role={syncState === 'error' ? 'alert' : 'status'} className={`fixed top-3 left-1/2 -translate-x-1/2 z-[80] max-w-[calc(100vw-1rem)] rounded-xl border px-4 py-3 shadow-xl flex items-center gap-3 text-sm ${syncState === 'error' ? 'bg-rose-950 border-rose-700 text-rose-100' : 'bg-slate-900 border-cyan-700 text-cyan-100'}`}>
          {syncState === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : syncState === 'saving' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
          <span className="min-w-0 break-words">{syncMessage}</span>
          {syncState === 'error' && <button type="button" onClick={() => void retrySync()} className="min-h-[44px] px-3 rounded-lg bg-rose-900 hover:bg-rose-800 font-bold focus-ring flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Coba lagi</button>}
        </div>
      )}
      {children}
    </>
  );
};

const LoadingScreen: React.FC<{ label: string }> = ({ label }) => (
  <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-5">
    <Loader2 className="w-9 h-9 text-cyan-400 animate-spin" aria-hidden="true" />
    <p className="text-sm text-slate-300">{label}</p>
  </main>
);
