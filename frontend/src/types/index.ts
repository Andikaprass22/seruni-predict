export interface User {
  id: number
  username: string
  email: string
  role: "admin" | "staff"
  first_name: string
  last_name: string
}

export interface PredictionPayload {
  periode: string | null
  prediksi: number | null
  lower: number | null
  upper: number | null
  metode: string | null
}

export interface TopProduct {
  rank: number
  tipe_produk: string
  probabilitas: number
}

export interface ModelStatus {
  trained_until: string | null
  last_retrain_at: string | null
  r2_test: number | null
  mae_test: number | null
  mape_test: number | null
  n_train: number | null
  n_test: number | null
}

export interface CurrentPrediction {
  prediksi: PredictionPayload | null
  top_products: TopProduct[]
  top_products_status: "available" | "not_trained"
  model_status: ModelStatus | null
}

export interface HistoryRow {
  periode: string
  actual: number | null
  prediksi: number | null
  error: number | null
  abs_error: number | null
  mape: number | null
  split: string
}

export interface Transaction {
  id: string
  tanggal: string
  customer: string
  keterangan: string
  qty: number
  satuan: string
  harga: number
  total: number
  bulan: string
  tahun: number
  tipe_customer: string
  tipe_produk: string
}

export interface Customer {
  id: string
  nama: string
  tipe: string
  join: string
  total_transaksi: number
  total_revenue: number
}
