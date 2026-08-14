# Seruni Predict — Design Brief

Sumber kebenaran desain untuk repo ini. Dibuat dari `docs/superpowers/specs/2026-08-14-seruni-predict-design.md`, README, dan kode frontend yang ada (2026-08-14).

## Register

**Product.** Ini adalah instrumen kerja harian (sistem informasi penjualan), bukan permukaan brand. Admin dan staff membukanya setiap hari untuk bekerja. Prioritas: kecepatan, konsistensi, dan kepercayaan. Tidak ada hero, tidak ada halaman marketing.

## Produk & Tujuan

Seruni Predict adalah sistem informasi penjualan untuk usaha Seruni (bunga krisan) dengan prediksi penjualan bulan berikutnya berbasis Random Forest.

- Dashboard — prediksi revenue bulan depan + rentang confidence, akurasi model (R², MAPE), top 5 produk, grafik aktual vs prediksi
- Transaksi — CRUD transaksi (staff boleh tambah; hanya admin yang edit/hapus)
- Customer — CRUD customer (hanya admin yang menulis)
- Riwayat & Evaluasi — tabel prediksi vs aktual per bulan (error, MAPE, split), export CSV, retrain model (admin)

**Artefak domain:** transaksi penjualan, customer, prediksi bulanan (angka dalam **ribu rupiah**), riwayat evaluasi. ID seperti `TRX-2026001` dan `CUST-041` adalah artefak nyata — tampil sebagai `font-mono` di tabel.

## User & Konteks

- **Admin** — pemilik/operator yang mengelola data, menjalankan retrain/refresh prediksi. Butuh kontrol penuh + status model.
- **Staff** — operator kasir yang memasukkan transaksi baru setiap hari. Hanya butuh input transaksi dan membaca angka prediksi; tidak melihat tombol edit/hapus/retrain.
- Konteks: layar kerja desktop/sidebar, sesi singkat, angka adalah fokus utama. UI berbahasa Indonesia.

## Pekerjaan Per Layar (komposisi yang benar)

| Layar | Pola kerja dominan | Komposisi |
|---|---|---|
| Dashboard | Decide + Monitor | Kartu metrik kunci (prediksi revenue, akurasi, top produk) lalu grafik deret waktu penuh — angka besar dulu, konteks setelahnya |
| Transaksi | Operate | Tabel padat + pencarian + pagination + dialog form; aksi ikon di baris |
| Customer | Operate | Tabel padat + pencarian + pagination |
| Riwayat | Monitor + Compare | Tabel evaluasi dengan kolom aktual/prediksi/error/MAPE; split sebagai badge; aksi export/retrain di header |
| Login | Decide | Fokus tunggal: satu kartu, satu aksi dominan ("Masuk") |

Kartu memang alat yang tepat di sini (modul self-contained per metrik), bukan refleks. Tidak ada hero, tidak ada card-grid kosmetik.

## Voice

- **Bahasa Indonesia**, sentence case, tanpa tanda seru. Contoh yang sudah ada: "Tambah Transaksi", "Refresh Prediksi", "Retrain Model", "Export CSV", "Tindakan ini tidak bisa dibatalkan."
- Kalimat aksi jelas satu kata kerja per tombol. Toast memakai kata kerja nyata: "Transaksi ditambahkan", "Prediksi diperbarui".
- Nada: tenang, profesional, hangat — operator harus merasa sistemnya bisa dipercaya, bukan ditagih perhatian.
- Angka: `tabular-nums`, format `id-ID` (ribuan dengan titik), satuan "ribu Rp" selalu dilabeli.

## Anti-Referensi (jangan jadi ini)

- Gradien biru-ungu SaaS, CTA ungu/biru generik, "tech hue" tanpa alasan.
- Dashboard generik AI: hero centered, kartu seragam tanpa hierarki, pill-button di mana-mana.
- Salinan marketing/preambel di halaman kerja. Filler ("Selamat datang di...") dilarang.
- Layar yang hanya berfungsi di state idle — setiap tabel butuh state kosong, loading (skeleton), dan error.

## Prinsip Desain

1. **Warna punya makna domain.** Sistem warna yang ada diturunkan dari nama produk: "Seruni" = krisan. Primary hangat emas krisan (oklch hue 27), accent hijau hutan (hue 160), netral di-tint hangat (chroma rendah di hue 85). Pertahankan. Jangan bergeser ke biru/ungu generik.
2. **Hierarki angka.** Nilai prediksi revenue adalah protagonis Dashboard. Skala besar (text-3xl), ketegangan lewat label muted kecil di atasnya.
3. **Konsistensi instrumen.** Tabel, dialog, badge, tombol — gunakan komponen shadcn/ui yang ada; jangan perkenalkan pola visual baru tanpa alasan.
4. **State lengkap.** Loading = skeleton; kosong = kalimat yang mengajari (contoh: "Belum ada transaksi"); error = path pemulihan.
5. **Ringan dan cepat.** Transisi singkat (`page-enter` 320ms, satu kali), tanpa dekorasi yang menunda membaca angka.
6. **Tidak pernah menghapus fitur di layar kecil** — tabel discroll horizontal, bukan disembunyikan.

## Fondasi Visual (sudah ada di `frontend/src/index.css` — hormati)

- Tokens **OKLCH**, radius `0.5rem` (scale 4px), dark mode via `.dark` class, `next-themes`.
- Palet: `primary` oklch(0.55 0.14 45) / `chart-1` hue 27; `chart-2` hijau 160; chart hues `[27, 160, 250, 330, 45]`.
- Netral hangat: `--background` oklch(0.985 0.004 85) light, oklch(0.18 0.01 60) dark.
- `font-mono text-xs` untuk ID (TRX/CUST), `tabular-nums` untuk semua angka.
- `page-enter` + `prefers-reduced-motion` dihormati; fokus ring via `ring`/`outline-ring`.

## Aturan Komponen

- Sidebar (shadcn Sidebar) dengan 4 nav: Dashboard, Transaksi, Customer, Riwayat & Evaluasi. Footer = avatar user + role (Admin/Staff) + logout.
- Header: judul halaman saat ini + tombol aksi sekunder (refresh/export/retrain).
- Aksi destruktif selalu lewat dialog konfirmasi ("Hapus transaksi?" + "Tindakan ini tidak bisa dibatalkan.").
- Tombol edit/hapus/retrain/refresh **hanya untuk admin** — staff tidak boleh melihatnya sama sekali (bukan disabled).
- Badge: `outline` untuk label entitas (customer, tipe), `default`/`secondary` untuk split train/test, `secondary` untuk probabilitas.
- Grafik: Chart.js dengan grid redup, legenda bawah, tooltip format rupiah, `tension 0.3`, prediksi pakai `borderDash`.

## Aksesibilitas & Motion

- Dark mode adalah warga kelas satu — semua warna punya varian gelap yang disetel.
- `prefers-reduced-motion` menonaktifkan animasi (`page-enter` mati, durasi 0.01ms).
- Fokus keyboard terlihat (`outline-ring`), target sentuh ≥ 44px, `sr-only` untuk tombol ikon.
- Angka besar tetap terbaca di kontras muted-foreground (label) vs foreground (nilai).
