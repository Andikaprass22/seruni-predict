# Seruni Predict

Sistem informasi penjualan dengan prediksi penjualan bulan berikutnya berbasis Random Forest.

## Struktur

- `backend/` — Django 5.2 + DRF + SimpleJWT + SQLite + engine ML (`predictor/`)
- `frontend/` — React 19 + Vite + TypeScript + shadcn/ui + Chart.js
- `test/` — folder penelitian (notebook & model asli, tidak diubah)

## Menjalankan Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          # sesuaikan SECRET_KEY bila perlu
python manage.py migrate
python manage.py seed_data      # import CSV dari folder test + buat admin
python manage.py runserver      # http://localhost:8000
```

Akun default: `admin@seruni.local` / `admin123` (bisa diubah di `.env`).
Sistem menggunakan **Single Admin** — seluruh fitur hanya untuk Admin.

> `create_staff_user` adalah legacy dan tidak disarankan (akan menampilkan warning).

## Menjalankan Frontend

```bash
cd frontend
pnpm install
pnpm dev                        # http://localhost:5173 (proxy /api -> :8000)
```

## Menjalankan Test Backend

```bash
cd backend
.venv\Scripts\python manage.py test prediction
```

## Build Frontend (produksi)

```bash
cd frontend
pnpm build
```
