import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { usePrediksi } from "@/hooks/usePrediksi"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

function formatRp(v: number | null | undefined) {
  if (v === null || v === undefined) return "-"
  return `${Math.round(v).toLocaleString("id-ID")} ribu Rp`
}

export default function Dashboard() {
  const { current, history, refresh } = usePrediksi()
  const { isAdmin } = useAuth()

  const pred = current.data?.prediksi
  const top = current.data?.top_products ?? []
  const status = current.data?.model_status

  const labels = (history.data ?? [])
    .filter((h) => h.prediksi !== null)
    .map((h) => h.periode)
  const actuals = (history.data ?? []).filter((h) => h.prediksi !== null).map((h) => h.actual)
  const preds = (history.data ?? []).filter((h) => h.prediksi !== null).map((h) => h.prediksi)

  const chartData = {
    labels,
    datasets: [
      {
        label: "Aktual",
        data: actuals,
        borderColor: "oklch(0.625 0.19 250)",
        backgroundColor: "oklch(0.625 0.19 250 / 0.1)",
        fill: false,
        tension: 0.3,
      },
      {
        label: "Prediksi",
        data: preds,
        borderColor: "oklch(0.769 0.188 70.08)",
        backgroundColor: "oklch(0.769 0.188 70.08 / 0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan prediksi penjualan bulan berikutnya</p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => {
              refresh.mutate(undefined, {
                onSuccess: () => toast.success("Prediksi diperbarui"),
                onError: () => toast.error("Gagal memperbarui prediksi"),
              })
            }}
            disabled={refresh.isPending}
          >
            <RefreshCw className={refresh.isPending ? "animate-spin" : ""} />
            Refresh Prediksi
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Prediksi Revenue</CardTitle>
            <CardDescription>Bulan {pred?.periode ?? "-"}</CardDescription>
          </CardHeader>
          <CardContent>
            {current.isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <p className="text-3xl font-bold">{formatRp(pred?.prediksi)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rentang: {formatRp(pred?.lower)} - {formatRp(pred?.upper)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akurasi Model</CardTitle>
            <CardDescription>Evaluasi test set terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {current.isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold">
                  {status?.r2_test !== null && status?.r2_test !== undefined
                    ? `${(status.r2_test * 100).toFixed(1)}%`
                    : "-"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MAPE: {status?.mape_test !== null && status?.mape_test !== undefined ? `${status.mape_test.toFixed(2)}%` : "-"} · R²
                </p>
                <p className="text-xs text-muted-foreground">Trained s/d {status?.trained_until ?? "-"}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produk</CardTitle>
            <CardDescription>Bulan {pred?.periode ?? "-"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {current.data?.top_products_status === "not_trained" ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Jalankan retrain untuk menghasilkan top produk." : "Top produk belum tersedia."}
              </p>
            ) : (
              top.map((t) => (
                <div key={t.rank} className="flex items-center justify-between text-sm">
                  <span>{t.tipe_produk}</span>
                  <Badge variant="secondary">{(t.probabilitas * 100).toFixed(1)}%</Badge>
                </div>
              ))
            )}
            <p className="pt-1 text-xs text-muted-foreground">
              *Prediksi kasar, akurasi model produk rendah (~25%).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Penjualan Bulanan: Aktual vs Prediksi</CardTitle>
          <CardDescription>Nilai dalam ribuan rupiah</CardDescription>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: false } },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
