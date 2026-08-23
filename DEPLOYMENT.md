# Deployment KTG Tuna — Supabase + Vercel

Dokumen ini adalah runbook produksi. Frontend hanya memakai Supabase Project URL dan **Publishable Key**. Jangan pernah memasukkan `service_role` key ke `.env`, source code, atau Vercel karena seluruh variabel `VITE_*` akan tertanam di bundle browser.

## 1. Prasyarat

- Bun terpasang.
- Proyek Supabase dan proyek Vercel tersedia.
- CLI: `npx supabase --version` dan `npx vercel --version`.

## 2. Buat database

Login dan tautkan repository ke proyek Supabase:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migration utama berada di `supabase/migrations/202608230001_initial_production.sql`. Migration membuat tabel multi-organisasi, RLS, kontrol peran, audit log, snapshot HPP, prosedur finalisasi/reopen, serta trigger immutable untuk batch FINAL.

Setelah push, buka Supabase Dashboard → Authentication → URL Configuration:

- Site URL: URL produksi Vercel, misalnya `https://ops.example.com`.
- Redirect URLs: tambahkan URL produksi dan URL preview yang memang dipercaya.
- Untuk go-live, aktifkan konfirmasi email dan SMTP produksi. Jangan mengandalkan SMTP bawaan untuk trafik produksi.

## 3. Konfigurasi lokal

Salin `.env.example` menjadi `.env.local`, lalu isi:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Jalankan pemeriksaan:

```bash
bun install --frozen-lockfile
bun run check
bun run dev
```

`bun run check` juga mengeksekusi migration pada PostgreSQL-WASM (PGlite) dan menguji bootstrap akun, RPC batch, FINAL lock, snapshot, audit, serta reopen. Tetap jalankan migration pada staging Supabase sebelum production karena pemeriksaan lokal tidak menggantikan pengujian konfigurasi proyek nyata.

Buat akun pertama melalui layar daftar. Trigger database membuat organisasi dan memberi akun pertama peran `owner`.

## 4. Deploy ke Vercel

```bash
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add VITE_SUPABASE_URL preview
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
npx vercel --prod
```

Alternatifnya, tambahkan dua environment variable tersebut melalui Project Settings → Environment Variables. Perubahan environment variable baru berlaku pada deployment baru, jadi lakukan redeploy. `vercel.json` sudah menentukan build Bun/Vite, fallback SPA, cache aset, dan header keamanan.

## 5. Pemeriksaan sesudah deployment

1. Daftar/masuk menggunakan email produksi.
2. Buat batch WIP dan pastikan refresh browser tidak menghilangkan data.
3. Masukkan satu ikan, catat loin, kemasan, dan by-product.
4. Pastikan batch dengan ikan pending tetap WIP walaupun tampilan HPP memakai cakupan “ikan selesai”.
5. Finalisasi hanya setelah daftar pemeriksaan kosong; coba ubah ikan/batch dan pastikan database menolak.
6. Reopen dengan alasan minimal 10 karakter; periksa `audit_logs` dan `hpp_snapshots` di Supabase.
7. Uji akun `staff`: harga beli/HPP tidak terlihat, tetapi kuantitas operasional dapat dicatat.
8. Unduh Excel dan cocokkan `SUM(biaya per grade)` terhadap `net cost pool`.

## 6. Menambahkan anggota tim

Skema mendukung `owner`, `manager`, dan `staff`, satu organisasi per akun. Provisioning anggota lintas organisasi belum dibuka ke browser agar pengguna tidak bisa menaikkan perannya sendiri. Untuk tahap awal, buat pengguna lewat Supabase Dashboard lalu gunakan template administrator `supabase/scripts/provision_member.sql`. Setelah volume pengguna bertambah, gunakan server-side Edge Function dengan service-role key untuk alur undangan; jangan membuat RPC publik yang menerima role tanpa verifikasi owner.

## 7. Rollback

- Frontend: pilih deployment Vercel terakhir yang sehat lalu Promote to Production.
- Database: jangan menghapus migration yang sudah diterapkan. Buat migration korektif baru dan uji pada branch/staging Supabase.
- Data FINAL: jangan diedit langsung; gunakan `reopen_batch` agar alasan dan actor tercatat.

Referensi resmi: [Supabase JavaScript initialization](https://supabase.com/docs/reference/javascript/initializing), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel untuk Vite](https://vercel.com/docs/frameworks/frontend/vite), dan [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).
