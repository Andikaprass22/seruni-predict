# Seruni Predict — Design Document (Spec)

**Tanggal:** 2026-08-14
**Status:** Draft untuk review
**Repo:** `C:\CODE\seruni-predict`

---

## 1. Ringkasan

Seruni Predict adalah **sistem informasi penjualan** berbasis web dengan fitur **prediksi penjualan bulan berikutnya**. Prediksi dihasilkan oleh model Random Forest yang sudah dilatih pada penelitian (`test/prediksi_penjualan.ipynb`, `model_rf_terbaik.joblib` — R² 0.9564, MAPE 1.5%).

Web menyediakan:
- Manajemen data transaksi & customer (CRUD)
- Dashboard prediksi revenue bulan depan + rentang confidence
- Top 5 produk terlaris bulan depan (dengan disclaimer akurasi rendah)
- Grafik aktual vs prediksi
- Riwayat prediksi & evaluasi (MAPE bulan berjalan)
- Login dengan role admin/staff
- Retrain model dari data terkini di database

**Keputusan yang sudah disetujui:**
1. Prediksi dihitung ulang **otomatis saat data berubah** + tersedia **tombol manual**.
2. **Hyperparameter model tetap** (300 tree, max_depth=None, max_features=0.6, min_samples_leaf=2, random_state=42, recency_weight=2.0) — retrain hanya melatih ulang dengan konfigurasi yang sama, tidak ada pencarian hyperparameter lagi.

---

## 2. Arsitektur

Monorepo dua bagian: `backend/` (Django + Django REST Framework) dan `frontend/` (React + Vite + TypeScript).

```
seruni-predict/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/          # user & role, auth JWT
│   │   ├── sales/             # transaksi & customer CRUD
│   │   └── prediction/        # prediksi, riwayat, retrain
│   ├── predictor/             # ENGINE ML (independen dari web)
│   │   ├── __init__.py
│   │   ├── engine.py          # load model + predict
│   │   ├── features.py        # agregasi bulanan + 16 fitur
│   │   ├── trainer.py         # retrain pipeline
│   │   └── models/
│   │       ├── model_rf_terbaik.joblib
│   │       ├── produk_terlaris.joblib   # classifier (dibuat saat retrain)
│   │       └── model_metadata.json      # disalin dari test/ agar FEATURE_COLS stabil
│   ├── scripts/
│   │   ├── seed_data.py       # import CSV 2022-2025 + 2026-01
│   │   └── retrain_cli.py     # retrain via CLI
│   └── db.sqlite3             # (auto dibuat)
├── frontend/
│   ├── src/
│   │   ├── components/ui/     # shadcn/ui
│   │   ├── components/        # layout, sidebar, cards
│   │   ├── pages/             # Login, Dashboard, Transaksi, Customer, Riwayat
│   │   ├── lib/               # api client (axios), utils
│   │   ├── hooks/             # useAuth, usePrediksi
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # router + providers
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── scripts/                   # (opsional: helper deploy/dev)
├── docs/
│   └── superpowers/specs/     # dokumen ini
└── test/                      # folder penelitian — TIDAK DIUBAH
```

**Prinsip desain:** `predictor/` berdiri sendiri sebagai unit ML murni — tidak tahu apa-apa tentang web. `apps/prediction/` memanggil `predictor.engine.predict()`. Ini memungkinkan engine diuji terpisah dan dipakai ulang (CLI, FastAPI, dsb).

**Batas unit (interface):**
- `predictor/` hanya menerima/mengembalikan **data polos** (pandas DataFrame, dict, list) — **tidak pernah** menyentuh tipe Django ORM.
- `apps/prediction/` bertindak sebagai **adapter**: mengambil data dari DB → membentuk DataFrame → memanggil `predictor/` → memetakan hasil dict/DataFrame kembali ke objek ORM (`Prediction`, `HistoryPoint`, `TopProduct`).
- `apps/sales/` memanggil `predictor/` hanya lewat `apps/prediction` (via signal), tidak langsung.

---

## 3. Stack & versi

### Backend
| Komponen | Pilihan | Alasan |
|---|---|---|
| Bahasa | Python 3.11+ | Model `.joblib` (pickle sklearn) hanya bisa di-load via Python |
| Framework | Django 5.2 LTS | ORM, auth, admin, SQLite built-in |
| REST API | Django REST Framework | ViewSet/router, permission, serializer |
| Auth | djangorestframework-simplejwt | JWT Bearer untuk SPA |
| CORS | django-cors-headers | Allow React dev server (http://localhost:5173) |
| ML | scikit-learn + joblib | Memuat model yang sudah ada |
| Data | pandas, numpy | Feature engineering identik dengan notebook |
| DB | SQLite (bawaan) | Dataset kecil (1200 baris) — lebih dari cukup |

### Frontend
| Komponen | Pilihan |
|---|---|
| Build | Vite + React 19 + TypeScript |
| UI | shadcn/ui (Tailwind CSS v4, dark mode) |
| Grafik | react-chartjs-2 + Chart.js v4 (register CategoryScale, Filler) |
| Routing | React Router v7 (`createBrowserRouter` + `RouterProvider`) |
| Data fetching | TanStack Query v5 (`useQuery`, `useMutation`, `invalidateQueries`) |
| HTTP | Axios (interceptor auto-refresh JWT) |

---

## 4. Model data (Django ORM)

### `accounts.User` (custom user, subclass AbstractUser)
- `role`: `admin` | `staff`
- **Admin**: CRUD penuh (transaksi & customer) + retrain + refresh.
- **Staff**: read-only untuk semua data + **boleh membuat transaksi baru** (input data bulan berjalan), tetapi tidak boleh update/hapus transaksi, tidak boleh menyentuh customer, tidak boleh retrain/refresh prediksi.
- **Login identifier: `username`** (SimpleJWT default). Nilai username diisi alamat email saat provisioning agar login "email/password" tetap intuitif; tidak memakai custom auth backend.

### `sales.Customer`
- `id` (CharField, PK, contoh `CUST-001`), `nama`, `tipe` (ukm/sekolah/agri_tech/enterprise/personal/pemerintah/event), `join` (YYYY-MM), `total_transaksi`, `total_revenue`
- Dua kolom terakhir adalah **aggregate display** — diisi saat seed, dan **dihitung ulang otomatis** setiap kali transaksi berubah (dari transaksi di DB, bukan diinput manual). Frontend tidak mengizinkan edit kolom ini.

### `sales.Transaction`
- `id` (CharField, PK, contoh `TRX-2026001`), `tanggal` (DateField), `customer` (FK → Customer), `keterangan`, `qty` (Float), `satuan`, `harga` (Float), `total` (Float = qty × harga), `bulan` (CharField, contoh `Januari`), `tahun` (Int), `tipe_customer` (CharField), `tipe_produk` (CharField)
- Konsistensi `qty × harga = total`, `bulan`/`tahun` sesuai `tanggal` **divalidasi di serializer**.
- **Generasi ID saat create via UI:**
  - `Transaction.id`: prefix `TRX-{tahun}{bulan2digit}` + `-` + running number 4 digit (contoh `TRX-202601` → `TRX-2026001`); nomor berikutnya dihitung dari maksimum id sebulan tersebut + 1.
  - `Customer.id`: prefix `CUST-` + running number 3 digit (`CUST-041`, `CUST-042`, …); dihitung dari maksimum id yang ada + 1.
  - Bila id sudah ada → 400 (handled di serializer).

### `prediction.Prediction`
- `periode` (CharField `YYYY-MM`), `prediksi` (Float, ribu Rp), `lower` (Float), `upper` (Float), `metode` (CharField: `auto` | `manual`), `created_at`
- **Satu baris per periode (upsert by periode)** — baris untuk periode berikutnya di-update setiap prediksi ulang; `created_at` menyimpan kapan terakhir diperbarui.
- **Rollover:** `HistoryPoint` adalah sumber kebenaran historis. Saat data aktual untuk suatu periode masuk, nilai `actual` periode itu dihitung dari **agregat bulanan DB**, dan nilai `prediksi` periode itu diambil dari **baris `Prediction`** (yang pernah menyimpan angka prediksi saat periode itu masih masa depan) → dicatat ke `HistoryPoint`. Baris `Prediction` untuk periode yang sudah punya aktual tidak lagi dianggap "prediksi berjalan".
- **Catatan bulan terakhir:** `predict_history()` (replikasi cell 19a) hanya menghasilkan prediksi in-sample untuk periode yang punya target (`shift(-1)`), jadi prediksi untuk bulan terakhir yang baru selesai diambil dari baris `Prediction` yang tersimpan — bukan dihitung ulang sebagai in-sample. Keduanya disatukan saat membangun grafik.

### `prediction.HistoryPoint`
- `periode` (unique), `actual` (nullable — null selama periode itu masih "masa depan"), `prediksi`, `error` (= actual − prediksi, null bila actual null), `abs_error`, `mape` (null bila actual null), `split` (train/test)
- Diisi/diperbarui oleh `predict_history()` setiap kali prediksi ulang; periode yang aktualnya sudah ada punya MAPE terhitung, yang belum tidak.

### `prediction.TopProduct`
- `periode`, `rank` (1–5), `tipe_produk`, `probabilitas`
- **Keberadaan classifier** di-ekspos lewat API: respons `/api/predictions/current/` menyertakan field `top_products_status` (`available` | `not_trained`) yang diderivasi dari ada/tidaknya `produk_terlaris.joblib`. Dashboard memakai field ini untuk menampilkan pesan yang sesuai role (admin: "jalankan retrain"; staff: "top produk belum tersedia").

### `prediction.ModelStatus`
- Satu baris singleton: `trained_until` (periode terakhir yang dilatih), `last_retrain_at`, `r2_test`, `mae_test`, `mape_test`, `n_train`, `n_test`

---

## 5. Engine ML (`predictor/`)

Replikasi sel-sel notebook yang relevan, dipisah jadi fungsi murni.

### `features.py`
- `aggregate_monthly(transactions_df) -> DataFrame`
  - Replikasi cell 5a: group by periode → `total_revenue_bulan`, `n_transaksi`, `qty_total`, `n_produk_unik`, `n_customer_unik`, `avg_transaksi`, `tahun`, `bulan_num`
- `build_features(monthly_df) -> DataFrame`
  - Replikasi cell 6a: `lag_1..3`, `ma_3`, `std_3`, `growth`, `diff`, `bulan_sin`, `bulan_cos` → kolom `FEATURE_COLS` (16 fitur, urutan persis metadata)

### `engine.py`
- `load_model()` — `joblib.load('predictor/models/model_rf_terbaik.joblib')` (lazy, cache)
  - **Cache invalidation**: `trainer.py` memanggil `invalidate_model_cache()` setelah menulis `.joblib` baru, sehingga proses berjalan memakai model terbaru tanpa restart.
- `predict_next(monthly_df) -> dict`
  - Bangun features untuk bulan terakhir, buat `X_next`, `lag1_next`
  - `g = model.predict(X_next)`; `prediksi = lag1_next * (1 + g)` (cell 20a)
  - Rentang antar-tree: `[lag1*(1+t.predict(X)) for t in model.estimators_]`, persentil 16 & 84
  - Output: `{periode, prediksi, lower, upper}`
- `predict_history(monthly_df) -> list[HistoryPoint]`
  - Replikasi cell 19a untuk seluruh periode (in-sample) → bahan grafik aktual vs prediksi

### `trainer.py`
- `train_from_transactions(transactions_df, monthly_df) -> (model, metrics, model_status)`
  - Replikasi pipeline: split waktu (4 bulan terakhir = test) → fit RF dengan **FINAL_PARAMS tetap** + sample_weight recency → evaluasi → simpan `model_rf_terbaik.joblib` baru → update `ModelStatus`
- `train_top_products_classifier(monthly_df, transactions_df) -> (clf, top5_df)`
  - Replikasi cell 20b: `RandomForestClassifier(n_estimators=500, max_depth=None, max_features=0.5, min_samples_leaf=2, class_weight='balanced', random_state=42)` → simpan sebagai `predictor/models/produk_terlaris.joblib` → output top 5 + probabilitas
- **Konsistensi fitur**: `FEATURE_COLS` dibaca dari `model_metadata.json` agar tidak drift dengan notebook.
- **Produk terlaris dijalankan saat retrain** (karena classifier perlu dilatih dengan data terbaru).

### `engine.py` — alur prediksi otomatis
`predict_from_db()` (dipanggil signal saat transaksi berubah, dan tombol manual):
1. Ambil semua transaksi dari DB → `aggregate_monthly()` → `build_features()`
2. `predict_next()` (regressor) → update/upsert baris `Prediction` untuk periode berikutnya
3. `predict_history()` (in-sample) → update tabel `HistoryPoint` (aktual/prediksi/error/MAPE)
4. **Load classifier `produk_terlaris.joblib`** (lazy, cache) → `predict_top_products()` → update tabel `TopProduct`
   - Bila classifier belum ada (mis. belum pernah retrain), TopProduct dibiarkan kosong / status `tidak_tersedia` — **tidak** error; dashboard menampilkan pesan "jalankan retrain untuk menghasilkan top produk".

### Classifier lifecycle
- Classifier produk terlaris **disimpan sebagai `.joblib` terpisah** (`produk_terlaris.joblib`), persis seperti regressor.
- Regressor bisa dipakai tanpa classifier (prediksi revenue tetap jalan).
- `load_model()` dan `load_classifier()` keduanya lazy + cache; **cache di-invalidate saat retrain** (hapus dari cache setelah menulis `.joblib` baru).

---

## 6. REST API (DRF)

Semua endpoint di bawah `/api/`, auth JWT Bearer, default permission `IsAuthenticated`.

| Method | Endpoint | Deskripsi | Role |
|---|---|---|---|
| POST | `/api/auth/token/` | Login → access+refresh | publik |
| POST | `/api/auth/token/refresh/` | Refresh access token | publik |
| GET | `/api/auth/me/` | Profil user + role | auth |
| GET/POST | `/api/transactions/` | List / buat transaksi | list: semua; create: semua (staff boleh input) |
| GET/PUT/PATCH/DELETE | `/api/transactions/{id}/` | Detail/update/hapus | get: semua; update/delete: admin |
| GET/POST | `/api/customers/` | List / buat customer | read: semua; write: admin |
| GET/PUT/PATCH/DELETE | `/api/customers/{id}/` | Detail/update/hapus | admin |
| GET | `/api/predictions/current/` | Prediksi bulan depan (baris terbaru) + top 5 produk | auth |
| GET | `/api/predictions/history/` | Riwayat aktual vs prediksi (grafik + tabel) | auth |
| GET | `/api/predictions/model-status/` | Info model: trained_until, metrik | auth |
| POST | `/api/predictions/retrain/` | Retrain model dari DB | admin |
| POST | `/api/predictions/refresh/` | Hitung ulang prediksi (tanpa retrain) | admin |
| GET | `/api/predictions/export/` | Download CSV prediksi & riwayat | auth |

**Trigger prediksi otomatis:** Django `post_save`/`post_delete` signal pada `Transaction` → jadwalkan `predict_from_db()` (debounce sederhana, tidak memblokir request) → update tabel `Prediction`, `HistoryPoint`, `TopProduct`.

---

## 7. Frontend — halaman & komponen

Routing (React Router v7, protected):
- `/login` — halaman login (form username/password → `POST /api/auth/token/` → simpan token)
- `/` — Dashboard
- `/transaksi` — CRUD transaksi
- `/customer` — CRUD customer
- `/riwayat` — riwayat prediksi & evaluasi
- Redirect `/` → `/login` bila belum autentikasi; tombol edit/hapus/retrain hanya tampil untuk `admin`; tombol "Tambah Transaksi" tampil untuk semua role.

### Dashboard
- **Card prediksi revenue bulan depan** — nilai besar (ribu Rp), rentang lower–upper
- **Card top 5 produk** — list dengan probabilitas + badge disclaimer "prediksi kasar (akurasi rendah)"
- **Card metrik model** — R², MAPE, trained_until
- **Line chart** aktual vs prediksi (react-chartjs-2, register CategoryScale + Filler, area fill untuk rentang confidence)
- **Tombol "Refresh Prediksi"** (admin)

### Transaksi & Customer
- Tabel (shadcn Table) + pencarian + pagination (DRF pagination)
- Dialog form create/edit (shadcn Dialog + Form)
- Toast notifikasi sukses/gagal
- `useMutation` → `invalidateQueries(['transactions'])` + `invalidateQueries(['predictions'])`

### Riwayat
- Tabel prediksi vs aktual per bulan + kolom error/MAPE
- Evaluasi bulan berjalan (MAPE rata-rata)

### Layout
- Sidebar (shadcn Sidebar): Dashboard, Transaksi, Customer, Riwayat
- Header dengan user info + logout

---

## 8. Alur data

```
DB (Transaction) ──signal──▶ predictor.engine (auto)
        │                          │
        │                     (hasil disimpan)
        ▼                          ▼
   REST API ◀────────────── Prediction/History/TopProduct
        ▲
        │ GET (axios + JWT)
        ▼
 TanStack Query (cache)
        │
        ▼
 React components → Chart.js / shadcn tables
```

- Mutasi transaksi → `invalidateQueries` → refetch → prediksi terbaru otomatis tampil.
- Retrain → `POST /api/predictions/retrain/` → model baru disimpan → `ModelStatus` terupdate → invalidate semua query prediksi.

---

## 9. Error handling & edge cases

- **API**: DRF serializer validation (total = qty×harga, bulan/tahun konsisten); 400 dengan daftar error field → ditampilkan di form.
- **Auth**: interceptor axios → 401 → coba refresh → gagal → redirect `/login`.
- **Prediksi kosong**: bila data transaksi < 12 bulan (fitur lag tidak cukup), API mengembalikan status `insufficient_data` → UI menampilkan pesan alih-alih angka.
- **Retrain gagal**: response 400/500 + log; `ModelStatus` tidak berubah; model lama tetap dipakai.
- **Unit nilai**: semua nilai revenue dalam **ribu rupiah** (konsisten dengan notebook) — didokumentasikan di UI (label "ribu Rp").
- **Concurrency**: prediksi auto dijalankan **di thread terpisah** via `threading.Timer` (debounce ~2 detik setelah perubahan terakhir) agar tidak memblokir request. Lock sederhana (`threading.Lock`) mencegah double-run. SQLite WAL diaktifkan (`journal_mode=WAL`) untuk menoleransi read saat write prediksi; karena volume kecil (1.200 transaksi), risiko write-lock dapat diabaikan — dicatat agar tidak lupa saat plan.
- **Export CSV**: `/api/predictions/export/` menghasilkan CSV (prediksi berjalan + riwayat). Tombol "Export CSV" di halaman Riwayat (semua role).
- **Tombol Retrain**: ditempatkan di **halaman Riwayat** (bukan dashboard), hanya untuk admin, dengan konfirmasi sebelum eksekusi.

---

## 10. Testing

### Backend (pytest + Django TestCase)
- Unit `features.py`: agregasi & 16 fitur sesuai notebook (snapshot pada data seed)
- Unit `engine.py`: prediksi bulan 2026-01 ≈ 26.905 ribu Rp (parity dengan metadata) ± toleransi kecil
- API: CRUD transaksi/customer (permission admin vs staff), auth JWT, retrain endpoint
- Signal: tambah transaksi → prediksi otomatis ter-update

### Frontend (Vitest + React Testing Library)
- Render halaman Login, Dashboard, Transaksi
- Mock TanStack Query + axios
- Verifikasi peran: staff tidak melihat tombol edit

### Parity check (kunci)
- `trainer.py` menghasilkan metrik yang sama dengan notebook (R² ≈ 0.9564, MAPE ≈ 1.50%) pada dataset yang sama — jadi engine web = hasil penelitian.
- **Parity test dijalankan pada window 2022–2025 saja** (sebelum data 2026-01 di-seed, atau dengan filter yang membuang `transaksi_2026_01.csv`). Ini agar `predict_next` bisa diverifikasi = 2026-01 ≈ 26.905 ribu Rp sesuai metadata. Setelah seed 2026-01, prediksi berikutnya menjadi 2026-02 (tidak diverifikasi ke metadata).

---

## 11. Data seed & provisioning

### Data
`scripts/seed_data.py` mengimpor:
- `test/dataset/transaksi (2).csv` (2022–2025, 1200 baris)
- `test/dataset/customer (2).csv` (40 customer)
- `test/2026/transaksi_2026_01.csv` (data aktual Jan 2026)

Setelah seed → prediksi otomatis → prediksi berikutnya menjadi **Feb 2026**. Model status: trained_until = 2025-12 (sebelum retrain).

### User provisioning
- Satu command management Django `createsuperuser` menghasilkan akun **admin** (role=admin).
- Satu command management `create_staff_user <username>` (atau via Django admin) menghasilkan akun **staff** (role=staff).
- `scripts/seed_data.py` juga membuat user default `admin@seruni.local` (role admin) bila belum ada, dengan password yang dibaca dari `.env` (default tercatat di `.env.example`), agar sistem langsung bisa dipakai setelah seed.

---

## 12. Non-goals (sengaja di luar lingkup v1)

- Aplikasi mobile
- Multi-tenant / organisasi ganda
- Real-time websocket (polling via TanStack Query cukup)
- Pencarian hyperparameter otomatis di web (tetap di notebook/CLI)
- Import Excel (CSV cukup; bisa ditambah nanti)
