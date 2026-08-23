# KTG Tuna Operations

Aplikasi mobile-first untuk penerimaan ikan, meja potong, pemakaian kemasan, perhitungan HPP batch, analisis trace-and-allocate per grade, finalisasi, dan audit trail.

## Menjalankan lokal

```bash
bun install --frozen-lockfile
bun run check
bun run dev
```

Salin `.env.example` ke `.env.local` dan isi Project URL serta Publishable Key Supabase. Petunjuk database dan produksi tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).

## Model akses

- `owner` / `manager`: data biaya, HPP, pengaturan harga, finalisasi, reopen, dan penghapusan batch WIP.
- `staff`: penerimaan, hasil potong, dan kuantitas kemasan; tidak dapat membaca tabel finansial melalui RLS.
- Batch `FINAL`: immutable pada sisi UI dan database sampai prosedur reopen dijalankan dengan alasan audit.
