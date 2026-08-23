# Hasil Implementasi Audit dan Kesiapan Deployment

Tanggal pemeriksaan: 23 Agustus 2026  
Target: Vercel (frontend) dan Supabase (Auth + PostgreSQL)

## Ringkasan

Temuan prioritas tinggi dari audit sebelumnya telah diimplementasikan pada jalur aplikasi utama. Ledger browser dan password HPP lokal diganti dengan Supabase Auth, penyimpanan PostgreSQL, RLS organisasi, dan peran `owner/manager/staff`. Status FINAL sekarang merupakan state persisten yang hanya dapat dibuat melalui prosedur finalisasi, bukan kesimpulan otomatis dari filter layar.

## Perubahan bisnis dan akuntansi

1. Cakupan kalkulasi `DONE_ONLY` tidak lagi mengubah status batch menjadi FINAL bila masih ada ikan pending pada batch penuh.
2. Finalisasi memerlukan: ada ikan, seluruh ikan selesai, ada loin saleable, rekonsiliasi biaya cocok, dan output fisik tidak melebihi input.
3. Finalisasi menyimpan snapshot HPP, actor, versi batch, waktu, dan audit log; trigger database membuat batch FINAL immutable.
4. Reopen hanya untuk owner/manager dan memerlukan alasan minimal 10 karakter.
5. Kredit by-product dibatasi sebesar gross cost pool sehingga HPP blended tidak negatif. Kelebihan dicatat terpisah sebagai pendapatan by-product di atas cost pool.
6. Kredit by-product per grade dialokasikan proporsional terhadap biaya sebelum kredit, menjaga HPP grade tidak negatif dan tetap tie-out ke net cost pool.
7. `customMaterials` yang malformed tidak lagi menjatuhkan mesin kalkulasi.
8. Pembuatan batch dan patch operasional+finansial memakai transaksi RPC atomik agar tidak meninggalkan data parsial.

## Kontrol data dan keamanan

- Tabel finansial dipisahkan dari tabel operasional.
- RLS membatasi seluruh data berdasarkan organisasi.
- Staff tidak mendapat `SELECT` ke data finansial/HPP dan tidak dapat mengubah harga.
- Audit trigger mencatat INSERT/UPDATE/DELETE; FINALIZE dan REOPEN memiliki event eksplisit.
- Snapshot final menyimpan salinan input batch, finansial, ikan, dan master kemasan dari sisi database agar angka final dapat direproduksi setelah batch direopen.
- Frontend hanya menerima publishable key; service-role key dilarang berada di browser.
- Vercel dilengkapi fallback SPA, cache aset immutable, CSP, anti-frame, MIME sniffing protection, dan permissions policy.

## Mobile-first dan UX

- Navigasi bawah tetap menjadi jalur utama pada layar kecil.
- Target sentuh kritis minimum 44 px.
- Layar autentikasi, loading, konfigurasi hilang, sinkronisasi, error/retry, empty state, status WIP/siap-final/FINAL, serta feedback permission tersedia.
- Staff mendapat form pemakaian kemasan khusus kuantitas tanpa membuka harga atau subtotal biaya.

## Artefak deployment

- Migration: `supabase/migrations/202608230001_initial_production.sql`
- Konfigurasi lokal Supabase: `supabase/config.toml`
- Template environment: `.env.example`
- Konfigurasi Vercel: `vercel.json`
- Runbook: `DEPLOYMENT.md`

## Batas kesiapan

Repository telah disiapkan untuk deployment, tetapi belum dapat dipasang ke proyek Supabase/Vercel nyata tanpa project ref, publishable key, dan otorisasi akun pemilik. Provisioning anggota organisasi juga sengaja belum tersedia di browser; gunakan alur administrator yang dijelaskan dalam runbook atau Edge Function server-side sebelum self-service invitation dibuka.

Migration diuji secara lokal melalui PGlite. Validasi terhadap Supabase hosted tetap menjadi gate sebelum go-live karena environment ini tidak memiliki kredensial proyek dan Docker daemon lokal tidak aktif.
