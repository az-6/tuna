import React, { useState } from 'react';
import { Anchor, ArrowRight, Database, Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('KTG Tuna');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const text = await signUp(email, password, displayName, organizationName);
        setMessage({ type: 'success', text });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Autentikasi gagal.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden lg:flex relative overflow-hidden border-r border-slate-800 p-12 xl:p-16 flex-col justify-between">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(8,145,178,0.16),transparent_50%,rgba(15,23,42,0.9))]" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Anchor className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-black tracking-tight text-xl">KTG TUNA</p>
            <p className="text-xs text-cyan-300">Operations & Cost Control</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-black tracking-[-0.035em] leading-[1.05] text-balance">
            Setiap kilogram terlacak. Setiap rupiah dapat direkonsiliasi.
          </h1>
          <p className="mt-5 text-base text-slate-300 leading-relaxed max-w-[62ch]">
            Alur timbang, meja potong, kemasan, by-product, dan HPP berada dalam satu sumber data dengan akses berbasis peran dan jejak audit.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-4 max-w-xl text-sm">
          <div className="flex gap-3 text-slate-300"><Database className="w-5 h-5 text-cyan-400 shrink-0" /><span>Database Supabase dengan RLS organisasi</span></div>
          <div className="flex gap-3 text-slate-300"><ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /><span>Batch final immutable dan tercatat</span></div>
        </div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center"><Anchor className="w-5 h-5" /></div>
            <div><p className="font-black">KTG TUNA</p><p className="text-xs text-cyan-300">Operations & Cost Control</p></div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {mode === 'signin' ? 'Masuk ke ruang operasi' : 'Buat organisasi baru'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'signin' ? 'Gunakan akun yang sudah terdaftar di Supabase Auth.' : 'Akun pertama otomatis menjadi owner organisasi.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-display-name" className="block text-sm font-semibold text-slate-200 mb-1.5">Nama pengguna</label>
                  <input id="auth-display-name" required maxLength={120} value={displayName} onChange={event => setDisplayName(event.target.value)} className="w-full min-h-[48px] rounded-xl bg-slate-900 border border-slate-700 px-4 text-base focus-ring" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="auth-organization" className="block text-sm font-semibold text-slate-200 mb-1.5">Nama organisasi</label>
                  <input id="auth-organization" required minLength={2} maxLength={120} value={organizationName} onChange={event => setOrganizationName(event.target.value)} className="w-full min-h-[48px] rounded-xl bg-slate-900 border border-slate-700 px-4 text-base focus-ring" autoComplete="organization" />
                </div>
              </>
            )}
            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-200 mb-1.5">Email</label>
              <input id="auth-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full min-h-[48px] rounded-xl bg-slate-900 border border-slate-700 px-4 text-base focus-ring" autoComplete="email" inputMode="email" />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-200 mb-1.5">Password</label>
              <input id="auth-password" type="password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} className="w-full min-h-[48px] rounded-xl bg-slate-900 border border-slate-700 px-4 text-base focus-ring" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>

            {message && (
              <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'error' ? 'bg-rose-950/70 border-rose-700 text-rose-200' : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'}`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={busy} className="w-full min-h-[50px] rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-extrabold flex items-center justify-center gap-2 focus-ring transition-colors">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="w-5 h-5" aria-hidden="true" />}
              {busy ? 'Memproses…' : mode === 'signin' ? 'Masuk' : 'Buat akun owner'}
            </button>
          </form>

          <button type="button" onClick={() => { setMode(current => current === 'signin' ? 'signup' : 'signin'); setMessage(null); }} className="mt-5 w-full min-h-[44px] text-sm text-cyan-300 hover:text-cyan-200 focus-ring rounded-lg">
            {mode === 'signin' ? 'Belum punya organisasi? Buat akun owner' : 'Sudah punya akun? Masuk'}
          </button>
        </div>
      </section>
    </main>
  );
};
