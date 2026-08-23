# KTG Tuna Operations

Aplikasi mobile-first untuk penerimaan ikan, meja potong, pemakaian kemasan, perhitungan HPP batch, analisis trace-and-allocate per grade, finalisasi, dan audit trail.

Login memakai username dan password. Owner dapat membuat akun pegawai langsung dari aplikasi; akun tersebut otomatis mendapat role `staff` pada organisasi yang sama.

## Menjalankan lokal

```bash
bun install --frozen-lockfile
bun run check
bun run dev
```

Salin `.env.example` ke `.env.local` dan isi Project URL serta Publishable Key Supabase. Petunjuk database dan produksi tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).

## Model akses

- `owner`: seluruh input produksi dan harga, laporan HPP/laba, finalisasi, reopen, penghapusan batch WIP, serta pembuatan akun pegawai.
- `staff`: seluruh proses produksi WIP, termasuk batch/nelayan, ikan, hasil potong, harga beli, serta jumlah dan harga kemasan. Laporan HPP/laba dan lifecycle FINAL tetap khusus owner.
- Batch `FINAL`: immutable pada sisi UI dan database sampai prosedur reopen dijalankan dengan alasan audit.
