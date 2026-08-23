import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, UserPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { normalizeUsername, validateUsername } from '../lib/username';

interface EmployeeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeAccountModal: React.FC<EmployeeAccountModalProps> = ({ isOpen, onClose }) => {
  const { createEmployee, profile } = useApp();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => firstInputRef.current?.focus(), 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
      setMessage(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen || profile?.role !== 'owner') return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const usernameError = validateUsername(username);
    if (usernameError) {
      setMessage({ type: 'error', text: usernameError });
      return;
    }
    if (displayName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Nama pegawai minimal 2 karakter.' });
      return;
    }
    if (password.length < 10) {
      setMessage({ type: 'error', text: 'Password pegawai minimal 10 karakter.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak sama.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await createEmployee({ username: normalizeUsername(username), displayName: displayName.trim(), password });
      setMessage({
        type: 'success',
        text: `Akun @${normalizeUsername(username)} berhasil dibuat. Sampaikan username dan password melalui saluran yang aman.`
      });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Akun pegawai gagal dibuat.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-account-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div ref={modalRef} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="min-w-0">
            <h2 id="employee-account-title" className="flex items-center gap-2 text-lg font-extrabold text-white">
              <UserPlus className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
              Buat Akun Pegawai
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">Akun baru otomatis mendapat peran staff pada organisasi {profile.organizationName}.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-40 focus-ring" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="employee-display-name" className="mb-1.5 block text-sm font-semibold text-slate-200">Nama pegawai</label>
            <input ref={firstInputRef} id="employee-display-name" required minLength={2} maxLength={120} value={displayName} onChange={event => setDisplayName(event.target.value)} className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white focus-ring" autoComplete="off" placeholder="Contoh: Budi Santoso" />
          </div>
          <div>
            <label htmlFor="employee-username" className="mb-1.5 block text-sm font-semibold text-slate-200">Username</label>
            <input id="employee-username" required minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9_]{1,30}[a-z0-9]" value={username} onChange={event => { setUsername(normalizeUsername(event.target.value)); setMessage(null); }} className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white focus-ring" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="employee-username-hint" placeholder="contoh: budi_produksi" />
            <p id="employee-username-hint" className="mt-1.5 text-xs text-slate-400">Unik secara sistem; gunakan huruf kecil, angka, dan underscore.</p>
          </div>
          <div>
            <label htmlFor="employee-password" className="mb-1.5 block text-sm font-semibold text-slate-200">Password sementara</label>
            <div className="relative">
              <input id="employee-password" type={showPassword ? 'text' : 'password'} required minLength={10} value={password} onChange={event => setPassword(event.target.value)} className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pe-12 text-base text-white focus-ring" autoComplete="new-password" aria-describedby="employee-password-hint" />
              <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 end-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:text-white focus-ring" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p id="employee-password-hint" className="mt-1.5 text-xs text-slate-400">Minimal 10 karakter. Jangan gunakan password yang sama untuk pegawai lain.</p>
          </div>
          <div>
            <label htmlFor="employee-confirm-password" className="mb-1.5 block text-sm font-semibold text-slate-200">Konfirmasi password</label>
            <input id="employee-confirm-password" type={showPassword ? 'text' : 'password'} required minLength={10} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white focus-ring" autoComplete="new-password" />
          </div>

          {message && (
            <div role={message.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${message.type === 'error' ? 'border-rose-700 bg-rose-950/70 text-rose-100' : 'border-emerald-700 bg-emerald-950/70 text-emerald-100'}`}>
              {message.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="break-words">{message.text}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="min-h-[48px] rounded-xl px-4 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 focus-ring">Tutup</button>
            <button type="submit" disabled={busy} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-extrabold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 focus-ring">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Membuat akun…' : 'Buat Akun Pegawai'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
