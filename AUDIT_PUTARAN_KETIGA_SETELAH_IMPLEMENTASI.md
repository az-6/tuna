# Audit Putaran Ketiga KTG Tuna Operations

**Tanggal audit:** 23 Agustus 2026  
**Baseline pembanding:** `AUDIT_ULANG_SETELAH_IMPLEMENTASI.md`  
**Cakupan:** logika bisnis, blended HPP, trace-and-allocate, laba, invalid input, WIP/final, storage, security, automated tests, build, dependency, aksesibilitas, dan mobile-first.

## Keputusan Rilis

**Engine HPP utama PASS untuk data valid.** Rekonstruksi workbook, satu cost pool per batch, blended HPP, alokasi biaya per grade, laba batch, Reject, dan by-product tetap konsisten.

Status aplikasi meningkat menjadi **GO untuk pilot terkontrol**, tetapi masih **NO-GO sebagai satu-satunya ledger akuntansi atau sumber HPP final tanpa review**. Penyebab utama saat ini:

1. scope default `DONE_ONLY` dapat salah menandai batch yang masih mempunyai ikan pending sebagai **HPP Final Resmi**;
2. label “terkunci otomatis” belum didukung mekanisme penguncian data;
3. kredit by-product dapat membuat HPP negatif;
4. JSON valid dengan schema `customMaterials` yang salah masih dapat membuat engine crash;
5. persistence dan password masih sepenuhnya berada di browser.

## Perkembangan dari 24 Temuan Awal

| Status | Jumlah | Keterangan |
|---|---:|---|
| Selesai | 18 | Termasuk rumus HPP, Reject, by-product UI, input negatif, 100% yield cap, batch ID, modal, golden test, WIB, XLSX, dan whitespace |
| Selesai sebagian | 4 | Scope WIP/final, schema validation, legacy field, dan touch target |
| Belum selesai | 2 | Ledger/audit trail dan keamanan password sisi klien |

## Verifikasi Akuntansi

### Baseline workbook

Test resmi sekarang menggunakan fixture yang sama dengan baris referensi workbook:

| Komponen | Nilai yang diverifikasi |
|---|---:|
| Ikan masuk | 569 kg Grade B + 292 kg Grade C = 861 kg |
| Loin jual | 480,27 kg Grade B + 47,61 kg Grade C = 527,88 kg |
| Pembelian ikan | Rp38.730.000 |
| Armada | Rp300.000 |
| Kemasan | Rp2.642.889 |
| Kargo | Rp16.364.280 |
| Gross cost pool | Rp58.037.169 |
| Revenue | Rp70.549.650 |
| Laba kotor batch | Rp12.512.481 |
| Blended landed HPP | Rp109.943,8679/kg |
| Selisih rekonsiliasi grade | < Rp0,01 |

Seluruh angka di atas diuji dengan equality atau toleransi numerik yang ketat. Kelemahan golden test pada audit sebelumnya sudah selesai.

### Property testing independen

Audit menjalankan kembali **500 variasi batch acak** dengan **1.504 assertion**:

```text
Σ allocated cost Grade A/B/C = net cost pool
Σ gross profit Grade A/B/C = gross profit batch
blended landed HPP × saleable kg = net cost pool
```

Semua invariant lulus dengan selisih kurang dari Rp0,01.

### Perbaikan yang terkonfirmasi

- Quantity, harga kemasan, custom material, berat, harga beli, kargo, dan harga jual negatif sekarang di-clamp di UI serta domain layer.
- `NaN` dan `Infinity` ditangani oleh `safeNonNegative()`.
- Total loin di atas berat ikan sekarang ditolak pada batas 100%, bukan 105%.
- Duplicate batch ID ditangani pada UI dan context layer.
- Golden test identik dengan workbook.
- Batch mempunyai metadata `FINAL`/`WIP` dan UI mempunyai banner provisional.
- SheetJS sudah memakai 0.20.3 dan audit dependency bersih.

## Temuan Aktif

### [P1] Scope DONE_ONLY salah menandai batch WIP sebagai FINAL

**Lokasi:** `src/components/Step3HitungHpp.tsx:203-237`, `src/utils/calculations.ts:53-117`  
**Kategori:** Business Logic / Accounting Integrity  
**Akar masalah:** `calculateExactHpp()` menerima `targetFishList` yang sudah difilter. Pada scope default `DONE_ONLY`, ikan pending tidak ikut dikirim sehingga `pendingIkanCount` menjadi nol dan `batchStatus` menjadi `FINAL`.

**Bukti runtime:** batch dengan 1 ikan selesai dan 1 ikan pending, pada scope default, menampilkan:

```text
Status Batch: Selesai & Terverifikasi (HPP Final Resmi)
```

Test `WIP vs Final Batch Status Scope` saat ini bahkan mengharapkan daftar berisi ikan selesai saja menjadi `FINAL`, sehingga belum menangkap konteks batch aslinya.

**Dampak:** angka interim dapat diekspor, dicetak, atau dipakai sebagai quotation final walaupun produksi belum selesai.

**Rekomendasi:** status batch harus berasal dari `activeBatchFish` lengkap, terpisah dari daftar ikan yang dipakai untuk kalkulasi. Tambahkan parameter metadata seperti `totalBatchFishCount` dan `pendingBatchFishCount`, atau hitung status di orchestration layer.

### [P1] Status “terkunci otomatis” belum benar-benar mengunci data

**Lokasi:** `src/components/Step3HitungHpp.tsx:566-588` dan seluruh mutation pada `AppContext`  
**Kategori:** Business Logic / Auditability  
**Masalah:** banner menyatakan HPP final akan “terkunci otomatis”, tetapi batch, loin, kemasan, harga, kargo, dan by-product masih dapat diubah. Tidak ada `finalizedAt`, `finalizedBy`, immutable snapshot, reopen reason, atau approval.

Kasus 100% Reject juga ditandai `FINAL` karena semua ikan berstatus done, meskipun `reconciliation.isReconciled === false`. UI tetap menyebutnya “Selesai & Terverifikasi”.

**Dampak:** angka yang pernah disebut final dapat berubah tanpa jejak dan batch gagal rekonsiliasi dapat terlihat terverifikasi.

**Rekomendasi:** pisahkan `processingComplete`, `reconciled`, dan `finalized`. Finalisasi hanya boleh terjadi jika:

```text
semua ikan selesai
AND saleable output/cost treatment sudah valid
AND reconciliation pass
AND pengguna berwenang mengonfirmasi finalisasi
```

### [P1] Kredit by-product dapat menghasilkan HPP negatif

**Lokasi:** `src/utils/calculations.ts:136-142, 185-193`  
**Kategori:** Accounting Policy  
**Bukti:** input tetelan yang besar dapat membuat `totalByProductRevenue > grossCostPool`; akibatnya `netCostPool` dan blended HPP menjadi negatif, sementara rekonsiliasi tetap PASS.

**Dampak:** HPP negatif dan margin per grade di atas 100% tidak mempunyai makna operasional sebagai harga pokok, walaupun total laba aritmetis tetap benar.

**Rekomendasi:** tetapkan kebijakan akuntansi eksplisit. Pilihan yang aman:

- kredit by-product terhadap joint cost dibatasi maksimal gross cost pool dan selisih dicatat sebagai pendapatan lain; atau
- pertahankan seluruh revenue sebagai pendapatan tetapi tampilkan HPP minimal nol dan rekonsiliasi tambahan untuk excess by-product income.

Tambahkan juga mass-balance validation agar berat by-product tidak melampaui berat input yang tersedia setelah memperhitungkan loin dan Reject.

### [P1] `customMaterials` dengan schema salah masih dapat membuat engine crash

**Lokasi:** `src/context/AppContext.tsx:79-117, 192-207`, `src/utils/calculations.ts:170-178`  
**Kategori:** Data Integrity / Reliability  
**Bukti:** JSON valid seperti berikut lolos object spread pada batch tetapi gagal saat engine memanggil `.map()`:

```json
{"customMaterials": {"name": "bukan-array"}}
```

**Dampak:** aplikasi dapat gagal merender halaman HPP hanya karena localStorage valid secara sintaks tetapi salah schema.

**Rekomendasi:** validasi `Array.isArray(customMaterials)` pada batch dan packaging template; sanitasi setiap elemen (`id`, `name`, `unit`, `quantity`, `pricePerUnit`) sebelum masuk state. Engine tetap perlu defensive fallback ke array kosong.

### [P1] LocalStorage belum dapat berfungsi sebagai ledger akuntansi

**Lokasi:** `src/context/AppContext.tsx:179-288`  
**Kategori:** Architecture / Auditability  
**Dampak:** nilai dapat diubah melalui DevTools atau hilang bersama browser storage; tidak ada revision, actor, timestamp, approval, concurrency control, backup, atau immutable history.

**Rekomendasi:** gunakan backend transaction store dan append-only audit log. LocalStorage hanya untuk offline draft/cache.

### [P1] Password HPP masih merupakan UI gate, bukan security boundary

**Lokasi:** `src/context/AppContext.tsx:216-253`  
**Kategori:** Security  
**Masalah:** password default `ktg123` dan password pengguna disimpan plaintext di localStorage; data HPP telah berada di client sebelum password diverifikasi.

**Dampak:** siapa pun yang memiliki akses browser dapat membaca password dan data HPP.

**Rekomendasi:** autentikasi dan role authorization server-side; data sensitif hanya dikirim setelah otorisasi berhasil.

### [P2] Beberapa touch target masih di bawah 44 px

**Lokasi:** `src/components/Step3HitungHpp.tsx:423`, `src/components/Step2MejaPotong.tsx:532`  
**Kategori:** Responsive / Accessibility  
**Dampak:** kontrol show-password 32×32 px dan beberapa kontrol grade 40 px lebih sulit disentuh di lapangan.

**Rekomendasi:** naikkan menjadi minimal 44×44 px atau perluas invisible hit area tanpa mengubah ukuran ikon.

### [P2] Field legacy masih berada di kontrak domain

**Lokasi:** `src/types/index.ts:76-80, 138-139, 213-214, 249-255`  
**Kategori:** Implementation Integrity  
**Perkembangan:** field sudah diberi anotasi `@deprecated`, sehingga risiko pemakaian tidak sengaja berkurang.

**Dampak:** field tetap dapat dipakai kembali dan menimbulkan dua sumber kebenaran.

**Rekomendasi:** lakukan migration terkontrol dan hapus setelah seluruh consumer lama tidak lagi bergantung padanya.

### [P2] Theming masih bergantung pada utility color langsung

**Lokasi:** seluruh komponen UI dan `src/index.css`  
**Kategori:** Theming / Maintainability  
**Dampak:** perubahan tema atau penyesuaian contrast membutuhkan edit lintas banyak komponen; belum ada semantic token seperti surface, text-muted, success, warning, atau danger.

**Rekomendasi:** ekstrak semantic tokens secara bertahap tanpa mengganti identitas visual yang sudah konsisten.

## Audit UI Teknis

### Implementation Integrity Verdict

**PASS bersyarat.** Alur produk spesifik, koheren, dan tidak generik. Detector mekanis menghasilkan `[]`. Modal dan mobile architecture meningkat nyata. Kekurangan utama UI sekarang bukan layout, melainkan status final yang tidak sesuai state batch sebenarnya.

| Dimensi | Skor | Bukti utama |
|---|---:|---|
| Accessibility | 3/4 | Focus entry/trap/restore dan labels modal lulus; dua target masih <44 px |
| Performance | 3/4 | XLSX tetap async; initial JS 297,84 kB gzip 78,45 kB |
| Responsive Design | 3/4 | Viewport 320 px tanpa overflow; mayoritas target sudah 44–52 px |
| Theming | 2/4 | Visual konsisten, tetapi semantic tokens dan light theme belum tersedia |
| Implementation Integrity | 3/4 | Sistem domain kuat; status final dan boundary schema masih bermasalah |
| **Total** | **14/20** | **Good — tutup temuan P1 sebelum menjadikan HPP final authoritative** |

### Runtime mobile 320 × 800

| Pemeriksaan | Hasil |
|---|---|
| Horizontal overflow | PASS — `innerWidth = scrollWidth = bodyWidth = 320` |
| Fokus awal modal kemasan | PASS — masuk ke `input-qty-es` |
| Focus trap saat Tab | PASS — tetap di dalam dialog |
| Input modal tanpa accessible name | PASS — 0 input |
| Escape menutup modal | PASS pada implementasi listener |
| Status batch dengan ikan pending pada scope default | **FAIL — ditampilkan FINAL** |

## Hasil Tooling

| Pemeriksaan | Hasil |
|---|---|
| `bun test` | PASS — 8 test, 57 assertion |
| Property audit independen | PASS — 500 batch valid, 1.504 assertion |
| Rekonstruksi workbook | PASS — exact baseline |
| `bun run build` | PASS — 1.818 modules |
| Initial JS | 297,84 kB; gzip 78,45 kB |
| XLSX async chunk | 499,55 kB; gzip 163,12 kB |
| CSS | 33,51 kB; gzip 6,59 kB |
| `bun audit --production` | PASS — no vulnerabilities found |
| UI detector | PASS — `[]` |
| `git diff --check` | PASS |

## Pola Sistemik

- Validasi numerik kini sudah berlapis di UI, persistence, dan engine. Pola ini baik dan perlu diterapkan juga pada array/object schema.
- Rekonsiliasi matematika sudah kuat, tetapi rekonsiliasi tidak sama dengan validitas bisnis. HPP negatif atau batch belum selesai tetap dapat tie secara matematis.
- Konsep finalisasi saat ini masih merupakan label turunan, bukan lifecycle state yang immutable dan auditable.

## Temuan Positif

- Blended dan trace-and-allocate tetap tie ke satu cost pool.
- Golden fixture sekarang benar-benar berasal dari workbook.
- Negative input dan output >100% sudah ditutup.
- Duplicate batch ID sudah ditutup di dua layer.
- Aksesibilitas modal meningkat dari gagal menjadi lulus pada pengujian runtime.
- Seluruh input modal kemasan sekarang mempunyai label.
- Reduced-motion policy sudah tersedia.
- Tanggal WIB sudah konsisten.
- Dependency audit bersih.
- Dynamic XLSX import mempertahankan initial bundle di bawah 300 kB.

## Prioritas Implementasi Berikutnya

1. **[P1] `/impeccable harden`** — pisahkan status seluruh batch dari calculation scope dan buat finalization gate yang memerlukan reconciliation pass.
2. **[P1] `/impeccable harden`** — validasi schema `customMaterials` pada storage dan engine boundary.
3. **[P1] Kebijakan akuntansi** — tentukan perlakuan excess by-product credit dan mass-balance rule.
4. **[P1] Arsitektur backend** — pindahkan ledger, audit trail, authentication, dan authorization dari browser.
5. **[P2] `/impeccable adapt`** — selesaikan dua touch target yang masih di bawah 44 px.
6. **[P2] `/impeccable distill`** — migrasikan dan hapus field legacy setelah consumer lama selesai.
7. **[P3] `/impeccable polish`** — final verification setelah seluruh perbaikan.

> Anda dapat meminta saya menjalankan perbaikan tersebut satu per satu, sekaligus, atau dalam urutan yang Anda pilih.
>
> Jalankan audit ulang setelah perbaikan untuk melihat peningkatan skor.

## Kesimpulan

Implementasi terbaru berhasil menutup sebagian besar temuan sebelumnya. **Rumus HPP bukan lagi risiko utama.** Risiko terbesar sekarang adalah kapan angka boleh disebut final, bagaimana menangani by-product yang melebihi cost pool, ketahanan schema storage, serta ketiadaan ledger dan security boundary di server.

Dengan membetulkan status WIP/final dan boundary `customMaterials`, aplikasi sudah cukup kuat untuk kalkulasi operasional terkontrol. Untuk menjadi sumber akuntansi authoritative, finalization, audit trail, dan server-side authorization tetap wajib.
