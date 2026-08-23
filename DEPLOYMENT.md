# Deployment KTG Tuna — Supabase + Vercel

Frontend hanya memakai Supabase Project URL dan Publishable Key. Jangan pernah memasukkan secret/service-role key ke `.env`, source code, atau Vercel karena variabel `VITE_*` tertanam dalam bundle browser.

## 1. Prasyarat

- Bun, Supabase CLI, proyek Supabase, dan proyek Vercel.
- Domain produksi atau URL Vercel yang akan diizinkan memanggil Edge Function.

## 2. Database dan autentikasi

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migration dalam `supabase/migrations/` membuat database multi-organisasi, RLS, audit HPP, lifecycle FINAL, username unik, dua role (`owner`/`staff`), dan RPC provisioning pegawai.

Di Supabase Dashboard → Authentication → Providers → Email:

- Biarkan provider Email aktif karena Supabase Auth memakai alias identitas internal di belakang layar.
- Nonaktifkan **Confirm Email**. Sistem tidak meminta, mengirim, atau menampilkan alamat email pengguna.
- Login pada aplikasi tetap hanya memakai username dan password.

## 3. Edge Function akun pegawai

```bash
npx supabase secrets set APP_ORIGINS=https://ops.example.com,https://YOUR_PROJECT.vercel.app
npx supabase functions deploy create-employee --no-verify-jwt
```

`verify_jwt` dimatikan pada gateway untuk kompatibilitas signing key baru, tetapi function tetap memverifikasi access token melalui `auth.getUser()` dan memeriksa role owner. Secret key hanya tersedia pada runtime Supabase dan tidak boleh disalin ke Vercel.

## 4. Konfigurasi frontend

Salin `.env.example` menjadi `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

```bash
bun install --frozen-lockfile
bun run check
bun run dev
```

`bun run check` menguji seluruh migration melalui PGlite, termasuk username, provisioning pegawai, RPC/RLS, FINAL lock, snapshot, audit, dan reopen. Tetap uji pada staging Supabase sebelum production.

Buat akun pertama melalui layar daftar menggunakan username dan password. Akun tersebut menjadi owner organisasi.

## 5. Vercel

```bash
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add VITE_SUPABASE_URL preview
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
npx vercel --prod
```

Environment variable baru hanya berlaku pada deployment baru. `vercel.json` sudah mengatur build Bun/Vite, fallback SPA, cache aset, CSP, dan security headers.

## 6. Pemeriksaan go-live

1. Daftar/masuk menggunakan username owner dan password.
2. Dari tombol **Akun Pegawai**, buat akun staff; keluar lalu masuk memakai akun tersebut.
3. Pastikan staff dapat membuat batch/nelayan serta mengubah input produksi dan harga, tetapi tidak dapat membuat akun lain, membuka laporan HPP/laba, finalisasi, reopen, atau menghapus batch.
4. Buat batch WIP dan pastikan refresh tidak menghilangkan data.
5. Masukkan ikan, loin, kemasan, dan by-product.
6. Pastikan batch dengan ikan pending tetap WIP pada cakupan “ikan selesai”.
7. Finalisasi lalu pastikan database menolak perubahan pada batch FINAL.
8. Reopen dengan alasan minimal 10 karakter; periksa `audit_logs` dan `hpp_snapshots`.
9. Unduh Excel dan cocokkan total biaya per grade terhadap net cost pool.

## 7. Operasional akun pegawai

Owner membuat akun melalui tombol **Akun Pegawai**. Browser mengirim username, nama, dan password ke Edge Function; password ditangani Supabase Auth dan tidak pernah disimpan di tabel aplikasi atau audit log.

Karena tidak ada email pengguna, reset password mandiri melalui email tidak tersedia. Untuk saat ini, pemulihan password dilakukan administrator melalui Supabase Authentication Dashboard. Template `supabase/scripts/provision_member.sql` tersedia sebagai jalur pemulihan administrator, bukan alur harian.

## 8. Rollback

- Frontend: pilih deployment Vercel terakhir yang sehat lalu Promote to Production.
- Database: buat migration korektif baru; jangan menghapus migration yang sudah diterapkan.
- Data FINAL: gunakan `reopen_batch`, jangan edit langsung.

Referensi resmi: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [Supabase admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Supabase Edge Function auth](https://supabase.com/docs/guides/functions/auth), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), dan [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite).
