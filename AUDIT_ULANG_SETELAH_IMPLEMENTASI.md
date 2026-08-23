# Audit Ulang KTG Tuna Operations Setelah Implementasi

**Tanggal:** 23 Agustus 2026  
**Jenis pemeriksaan:** delta audit terhadap 24 temuan sebelumnya  
**Cakupan:** logika bisnis, HPP per batch, blended process costing, trace-and-allocate per grade, laba, integritas input/data, build, dependensi, aksesibilitas, dan mobile-first.

## Keputusan Ringkas

**Engine HPP inti sekarang PASS untuk data valid dan lengkap.** Blended dan trace-and-allocate sama-sama dihitung per batch, memakai satu `netCostPool`, dan hasil keduanya berhasil direkonsiliasi sampai selisih kurang dari Rp0,01.

Namun, keputusan rilis keseluruhan masih **GO bersyarat untuk pilot terkontrol, NO-GO sebagai satu-satunya sumber pencatatan akuntansi produksi**. Penyebabnya bukan lagi rumus inti HPP, melainkan kontrol input finansial, status batch/WIP, duplikasi ID batch, penyimpanan browser tanpa audit trail, keamanan password, dan dua kerentanan tinggi pada `xlsx`.

## Ringkasan Perubahan dari Audit Sebelumnya

| Status | Jumlah | Keterangan |
|---|---:|---|
| Selesai | 12 | Rumus cost pool, Reject, by-product, label laba, state loin, default kemasan, ekspor, lazy-load XLSX, favicon/font, dan artefak refactor |
| Selesai sebagian | 9 | Validasi, ID, modal, test, tanggal WIB, scope WIP, parsing storage, type drift, dan mobile accessibility |
| Belum selesai | 3 | Ledger/audit trail, password sisi klien, vulnerability `xlsx` |

Tidak ditemukan regresi pada rumus utama. Regresi/risiko yang masih aktif terutama berada di batas input dan alur operasional.

## Hasil Verifikasi Akuntansi dan HPP

### 1. Baseline workbook direproduksi tepat

Rekonstruksi independen atas baris pertama `Operasional_Tuna_B2B.xlsx` menghasilkan:

| Komponen | Workbook | Engine saat ini | Selisih |
|---|---:|---:|---:|
| Ikan utuh | 861,00 kg | 861,00 kg | 0 |
| Saleable loin | 527,88 kg | 527,88 kg | 0 |
| Rendemen | 61,3101% | 61,3101% | 0 |
| Kemasan/operasional | Rp2.642.889 | Rp2.642.889 | Rp0 |
| Total revenue | Rp70.549.650 | Rp70.549.650 | Rp0 |
| Gross cost pool | Rp58.037.169 | Rp58.037.169 | Rp0 |
| Laba kotor batch | Rp12.512.481 | Rp12.512.481 | Rp0 |
| Gross margin | 17,7357% | 17,7357% | 0 |
| Blended landed HPP | Rp109.943,8679/kg | Rp109.943,8679/kg | Rp0 |
| Rekonsiliasi alokasi grade | — | Rp58.037.169 = Rp58.037.169 | Rp0 |

### 2. Kedua metode benar-benar berjalan per batch

Alur yang sekarang diterapkan:

```text
gross cost pool batch
= pembelian ikan aktual berdasarkan grade nota
+ armada
+ kemasan aktual batch
+ kargo atas saleable loin

net cost pool batch
= gross cost pool - pendapatan by-product

blended HPP per kg
= net cost pool / total saleable loin batch

trace-and-allocate per grade
= biaya input ikan yang ditelusuri per ikan
+ alokasi kemasan
+ alokasi kargo
- kredit by-product
```

Invariant wajibnya sudah benar:

```text
Σ allocated cost Grade A/B/C = net cost pool batch
Σ gross profit Grade A/B/C = gross profit batch
blended HPP × saleable kg = net cost pool batch
```

Saya menguji **500 variasi batch acak** dengan total **1.501 assertion**. Semua invariant di atas lulus dengan selisih kurang dari Rp0,01.

### 3. Perbaikan rumus yang sudah terverifikasi

- Reject tidak lagi masuk saleable loin, rendemen resmi, kemasan per kg, atau dasar kargo.
- Gross cut output tetap tersedia untuk menunjukkan A+B+C+Reject secara terpisah.
- By-product mempunyai input UI dan dikreditkan satu kali terhadap cost pool; laba batch tetap dihitung sebagai total revenue dikurangi gross cost pool.
- Harga Rp0 dipertahankan melalui nullish coalescing dan tidak diganti default.
- HPP per grade sekarang berasal dari biaya ikan aktual yang ditelusuri, bukan dari harga beli grade output.
- Total alokasi grade mempunyai status rekonsiliasi eksplisit.
- Istilah `Laba Kotor Batch` sekarang sesuai dengan substansi rumus; istilah `Laba Bersih` yang menyesatkan sudah dihilangkan.

## Catatan Penting tentang Test Otomatis

`bun test` lulus **5/5 test dengan 29 assertion**. Ini kemajuan besar dibanding audit awal yang tidak memiliki test akuntansi.

Namun test bernama **“Golden Test: Reconstructs reference batch 861 kg” belum benar-benar merekonstruksi baris workbook secara tepat**:

- workbook memakai 569 kg Grade B dan 292 kg Grade C;
- fixture test memakai 570 kg Grade B dan 291 kg Grade C;
- workbook menjual 480,27 kg Grade B dan 47,61 kg Grade C;
- fixture test membuat Grade A/B/C dengan omzet sekitar Rp69,68 juta;
- assertion omzet hanya `> Rp69 juta`, bukan sama dengan Rp70.549.650;
- assertion HPP memakai toleransi pembulatan ratusan rupiah.

Engine tetap berhasil pada rekonstruksi workbook independen, tetapi golden test perlu diperketat agar regresi angka baseline tidak lolos diam-diam.

## Status 24 Temuan Audit Sebelumnya

| ID | Temuan lama | Status sekarang | Bukti ringkas |
|---|---|---|---|
| F01 | HPP grade tidak tie ke biaya aktual | **Selesai** | `gradeAllocations` tie ke `netCostPool`; 500 property cases lulus |
| F02 | Reject masuk clean loin/rendemen | **Selesai** | `saleableLoinKg` hanya A+B+C; gross yield dipisahkan |
| F03 | By-product tidak memiliki input UI | **Selesai** | Input tetelan/tulang dan harga tersedia dan tersimpan per batch |
| F04 | “Laba Bersih” sebenarnya laba kotor | **Selesai** | Label dan ekspor memakai `Laba Kotor Batch` |
| F05 | Nilai negatif/hasil >100% diterima | **Sebagian** | Berat ikan/loin negatif ditahan; kemasan negatif dan output sampai 105% masih diterima |
| F06 | Accordion pertama terbuka tetapi loin kosong | **Selesai** | `localLoins` diinisialisasi dari ikan pertama |
| F07 | Loin baru kembali ke grade nota lama | **Selesai** | Loin baru memakai `gradePotong || gradeNota` |
| F08 | Batch baru membawa kuantitas kemasan seed | **Selesai** | Default batch tidak lagi mengisi jumlah material tetap |
| F09 | Nomor ikan dan ID batch dapat duplikat | **Sebagian** | Nomor ikan memakai max+1 dan fish ID unik; batch ID masih dapat duplikat |
| F10 | LocalStorage dipakai sebagai ledger | **Belum** | Belum ada server, audit log, locking, versioning, atau backup transaksi |
| F11 | Password HPP plaintext di browser | **Belum** | Default `ktg123` dan password tetap tersimpan di localStorage |
| F12 | Modal/fokus/label input bermasalah | **Sebagian** | Escape selesai; focus management, focus trap, dan 10 label input belum selesai |
| F13 | Tidak ada automated accounting tests | **Sebagian** | Sudah ada 5 test; golden fixture masih longgar dan tidak identik workbook |
| F14 | Tanggal UTC dapat mundur satu hari | **Sebagian** | Helper WIB ada; tombol tambah batch masih memakai `toISOString()` |
| F15 | Nilai nol diganti default oleh `||` | **Selesai** | Harga/biaya inti memakai `??`; test Rp0 lulus |
| F16 | Scope ALL mencampur WIP ke HPP aktual | **Sebagian** | Default kini DONE_ONLY, tetapi kedua scope masih dapat menghasilkan angka interim yang diberi tampilan HPP batch |
| F17 | JSON storage tanpa perlindungan | **Sebagian** | Parse sudah try/catch; belum ada validasi schema/nilai per field |
| F18 | Ekspor menduplikasi/mislabel revenue | **Selesai** | Loin, by-product, total revenue, gross/net cost pool dipisahkan |
| F19 | Type drift/dead financial fields | **Sebagian** | Type utama lebih jelas; field legacy/deprecated masih ada |
| F20 | XLSX membebani initial bundle | **Selesai** | Dynamic import; initial JS turun ke 287,87 kB, XLSX menjadi chunk terpisah |
| F21 | Dua vulnerability tinggi XLSX | **Belum** | `bun audit --production` masih melaporkan dua advisory high |
| F22 | Touch target/motion mobile | **Sebagian** | Bottom nav 52 px; masih banyak kontrol 32–42 px dan tidak ada reduced-motion policy |
| F23 | Font ganda dan favicon hilang | **Selesai** | Satu deklarasi Google Fonts dan `/tuna-icon.svg` tersedia |
| F24 | Script refactor absolut ikut repository | **Selesai** | `refactor.cjs` dan `refactor.py` dihapus |

## Temuan Aktif yang Harus Ditangani

### P1 — Input kemasan negatif dapat menurunkan HPP secara palsu

**Lokasi:** `src/components/BatchPackagingModal.tsx:305-504`, `src/utils/calculations.ts:125-155`  
**Bukti:** input quantity/harga tidak mempunyai `min="0"` dan state tidak di-clamp. Uji langsung dengan `jmlStyrofoamBox: -100` menghasilkan `totalBiayaKemasan < 0`.  
**Dampak:** HPP dan laba bisa dimanipulasi atau salah akibat typo minus. Rekonsiliasi tetap PASS karena biaya negatif ikut menjadi bagian cost pool; jadi badge rekonsiliasi tidak mendeteksi masalah ini.  
**Rekomendasi:** validasi di UI dan domain layer; tolak nilai non-finite/negatif sebelum perhitungan dan sebelum persistence.

### P1 — Batas output 105% masih mengizinkan rendemen fisik di atas 100%

**Lokasi:** `src/components/Step2MejaPotong.tsx:128-136`  
**Dampak:** output 100,01–105% dari berat ikan dapat disimpan, sehingga HPP/kg terlalu rendah.  
**Rekomendasi:** jadikan 100% hard stop, atau dokumentasikan toleransi timbangan sebagai exception dengan approval dan audit reason—bukan penerimaan diam-diam.

### P1 — Scope DONE_ONLY/ALL masih dapat disalahartikan sebagai HPP final

**Lokasi:** `src/components/Step3HitungHpp.tsx:180-203`  
**Dampak:** DONE_ONLY hanya memasukkan pembelian ikan selesai tetapi tetap menyerap armada dan data kemasan batch. ALL memasukkan biaya ikan pending tanpa output lalu mengalokasikannya ke output yang sudah ada. Keduanya dapat direkonsiliasi secara matematis, tetapi bukan HPP final batch ketika proses belum selesai.  
**Rekomendasi:** blok status “final” dan ekspor final sampai seluruh ikan selesai; bila tetap ditampilkan, beri label **Estimasi WIP/Provisional HPP** dan jelaskan basis cost absorption.

### P1 — Batch ID masih dapat duplikat

**Lokasi:** `src/components/SimpleNavbar.tsx:38-59, 132`, `src/context/AppContext.tsx:207-210`  
**Dampak:** dua batch dengan ID sama berbagi fish records; penghapusan satu ID dapat menghapus keduanya beserta ikan terkait. Nomor otomatis berbasis `batches.length + 1` juga dapat berulang setelah penghapusan.  
**Rekomendasi:** ID internal immutable UUID; kode tampilan terpisah dan unique constraint sebelum save.

### P1 — Persistence belum layak menjadi ledger akuntansi

**Lokasi:** `src/context/AppContext.tsx:78-193`  
**Dampak:** pengguna/perangkat dapat mengubah atau menghapus biaya tanpa jejak; tidak ada actor, timestamp perubahan, before/after value, concurrency control, backup, atau approval.  
**Rekomendasi:** backend persistence dengan append-only audit log dan role-based authorization. LocalStorage hanya cache/offline draft.

### P1 — Password HPP bukan kontrol keamanan nyata

**Lokasi:** `src/context/AppContext.tsx:121-159`  
**Dampak:** password default dan password baru dapat dibaca dari browser; data HPP juga sudah berada di sisi klien. Ini hanya UI gate.  
**Rekomendasi:** autentikasi dan otorisasi server-side; jangan kirim data sensitif sebelum akses diverifikasi.

### P1 — Data storage hanya aman dari JSON rusak, bukan data salah

**Lokasi:** `src/context/AppContext.tsx:78-115`  
**Dampak:** JSON valid tetapi berbentuk salah, berisi string/NaN-like values, grade asing, nilai negatif, atau ID duplikat masih dapat masuk ke alur runtime.  
**Rekomendasi:** schema validation dan migration/version check pada seluruh boundary: storage, form submission, import, dan API.

### P1 — Modal belum memenuhi aksesibilitas keyboard

**Lokasi:** `src/components/BatchPackagingModal.tsx:228-650`; pola serupa pada modal navbar dan ubah password  
**Bukti runtime Chrome 320 px:** setelah modal dibuka, fokus tetap pada input berat ikan di belakang modal; menekan Tab berpindah ke radio grade di belakang modal; 10 input modal tidak mempunyai accessible name; Escape sudah berhasil menutup modal.  
**Dampak:** pengguna keyboard/screen reader dapat berinteraksi dengan halaman di belakang dialog dan tidak mengetahui fungsi beberapa input harga.  
**Standar:** WCAG 2.1.1 Keyboard, 2.4.3 Focus Order, 3.3.2 Labels or Instructions.  
**Rekomendasi:** pindahkan fokus ke heading/kontrol pertama, trap focus, restore focus ke pemicu, beri `<label>`/`aria-label` unik untuk setiap input.

### P1 — Dependency XLSX masih memiliki dua vulnerability high

**Lokasi:** `package.json` (`xlsx ^0.18.5`)  
**Bukti:** `bun audit --production` gagal dengan prototype pollution dan ReDoS.  
**Rekomendasi:** evaluasi versi/paket pengganti yang sudah ditambal dan uji kembali jalur ekspor.

### P2 — Golden test tidak identik dengan workbook

**Lokasi:** `src/utils/__tests__/calculations.test.ts:19-97`  
**Dampak:** perubahan omzet ratusan ribu hingga lebih dari satu juta rupiah masih dapat lolos karena assertion hanya `> Rp69 juta`.  
**Rekomendasi:** gunakan fixture 569 kg B + 292 kg C, output 480,27 kg B + 47,61 kg C, dan assert semua angka baseline secara tepat sampai toleransi yang dinyatakan.

### P2 — Tanggal WIB belum dipakai konsisten

**Lokasi:** `src/components/SimpleNavbar.tsx:132`, fallback `src/components/BatchPackagingModal.tsx:19`  
**Dampak:** pada pukul 00:00–06:59 WIB, kode batch dapat memakai tanggal UTC hari sebelumnya.  
**Rekomendasi:** gunakan `getJakartaDateString()` pada semua generator tanggal/kode.

### P2 — Touch target dan reduced motion belum konsisten

**Lokasi:** tombol 32–42 px pada navbar, HPP, kemasan, dan modal; `src/index.css` tidak mempunyai `prefers-reduced-motion`.  
**Dampak:** target kecil lebih sulit disentuh; pengguna sensitif gerakan tidak mendapat alternatif.  
**Rekomendasi:** target utama minimal 44×44 px dan kebijakan reduced-motion yang mempertahankan feedback perubahan state.

### P2 — Type/field legacy masih menambah ambiguitas domain

**Lokasi:** `kreditByProductPerKgLoin`, `biayaKemasanPerKgLoin`, `yieldSimulasi`, `simTotalLoin`, `cuanDowngradeBeli`  
**Dampak:** field yang tidak lagi menjadi sumber perhitungan dapat kembali dipakai secara keliru pada perubahan berikutnya.  
**Rekomendasi:** hapus atau tandai deprecated secara eksplisit, lalu dokumentasikan satu sumber kebenaran untuk cost pool dan yield.

### P3 — Kebersihan diff belum sepenuhnya rapi

**Bukti:** `git diff --check` menemukan trailing whitespace pada 13 baris.  
**Dampak:** tidak memengaruhi runtime, tetapi menambah noise review dan berpotensi menggagalkan quality gate repository.

## Audit UI Teknis

### Implementation Integrity Verdict

**PASS bersyarat.** Produk sekarang mempunyai sistem yang koheren dan spesifik terhadap alur tuna: timbang masuk → meja potong → kemasan → by-product → blended HPP → analisis grade → rekonsiliasi. Detector mekanis tidak menemukan pola implementasi terlarang (`[]`). Kegagalan tersisa berada pada boundary validation, accessibility dialog, security, dan operational finalization.

| # | Dimensi | Skor | Temuan utama |
|---|---:|---:|---|
| 1 | Accessibility | 2/4 | Focus trap/focus entry belum ada; 10 input modal tidak berlabel |
| 2 | Performance | 3/4 | Initial JS turun menjadi 287,87 kB; XLSX dipisah menjadi chunk 429,03 kB |
| 3 | Responsive Design | 3/4 | Tidak ada overflow pada 320 px; beberapa target masih <44 px |
| 4 | Theming | 2/4 | Visual konsisten tetapi warna masih dominan utility/hard-coded dan hanya dark theme |
| 5 | Implementation Integrity | 3/4 | Domain dan rekonsiliasi koheren; boundary validation/security masih lemah |
| **Total** |  | **13/20** | **Acceptable — mendekati Good, tetapi P1 harus ditutup** |

### Hasil runtime mobile

- viewport: 320 × 800;
- `innerWidth = scrollWidth = bodyWidth = 320`: tidak ada horizontal overflow;
- mobile bottom navigation mempunyai target 52 px;
- modal kemasan muat secara scrollable dalam `max-height: 92vh`;
- Escape menutup modal;
- focus entry dan focus trap gagal.

## Hasil Tooling

| Pemeriksaan | Hasil |
|---|---|
| `bun test` | PASS — 5 test, 29 assertion |
| Property audit independen | PASS — 500 batch, 1.501 assertion |
| Rekonstruksi workbook independen | PASS — seluruh angka utama dan rekonsiliasi tepat |
| `bun run build` | PASS — 1.818 modules |
| Initial JS | 287,87 kB; gzip 76,16 kB |
| XLSX async chunk | 429,03 kB; gzip 143,08 kB |
| CSS | 33,19 kB; gzip 6,52 kB |
| Detector UI | PASS — `[]` |
| Runtime viewport 320 px | PASS — tidak overflow |
| Runtime modal keyboard | PARTIAL — Escape pass, fokus/Tab fail |
| `bun audit --production` | FAIL — 2 high vulnerabilities |
| `git diff --check` | FAIL — 13 trailing-whitespace findings |

## Urutan Implementasi yang Disarankan

1. Tambahkan domain validation untuk seluruh angka finansial dan berat; blok nilai negatif/non-finite serta output >100%.
2. Pisahkan status **WIP estimate** dan **Final HPP**; finalisasi hanya ketika seluruh ikan selesai dan batch dikunci.
3. Ganti batch ID dengan UUID internal dan validasi kode tampilan unik.
4. Perketat golden test agar identik dengan workbook dan tambahkan test invalid input, zero-output, 100% reject, duplikasi ID, serta scope WIP.
5. Benahi modal: accessible labels, initial focus, focus trap, restore focus, dan 44 px touch targets.
6. Migrasikan persistence dan kontrol akses ke backend dengan audit log.
7. Ganti/perbarui XLSX setelah menilai compatibility ekspor.
8. Bersihkan type legacy, tanggal UTC tersisa, reduced-motion, dan whitespace.

## Kesimpulan

Perubahan ini berhasil menyelesaikan masalah terbesar audit awal: **blended dan trace-and-allocate sekarang dapat dipakai bersama untuk batch yang sama tanpa membuat dua total biaya berbeda**. Blended menjadi angka HPP resmi rata-rata batch; trace-and-allocate menjadi penjelasan biaya dan profit per grade. Keduanya telah terbukti tie ke satu cost pool dan satu laba batch.

Sebelum dipakai sebagai sistem akuntansi produksi yang berdiri sendiri, proyek masih harus menutup P1 pada validasi input, finalisasi WIP, identitas batch, persistence/audit trail, keamanan akses, accessibility dialog, dan dependency XLSX.
