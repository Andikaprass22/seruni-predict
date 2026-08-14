# Seruni Predict Frontend

Frontend React 19 + Vite + TypeScript + shadcn/ui + Chart.js untuk Seruni Predict.

## Setup

```bash
pnpm install
```

## Menjalankan dev server

```bash
pnpm dev
```

Buka http://localhost:5173 — proxy `/api` mengarah ke backend Django di http://localhost:8000.

## Build produksi

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```

Catatan: gunakan **pnpm** sebagai package manager. `tsc` dipanggil via `node node_modules/typescript/bin/tsc` karena npm 11 di sebagian sistem gagal membuat shim `.bin/tsc`.
