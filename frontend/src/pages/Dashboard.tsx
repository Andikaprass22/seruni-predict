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
import { chartColor, formatPeriode, formatRupiah } from "@/lib/format"
import { useAuth } from "@/hooks/useAuth"
import { usePrediksi } from "@/hooks/usePrediksi"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const { current, history, refresh } = usePrediksi()
  const { isAdmin } = useAuth()

  const pred = current.data?.prediksi
  const top = current.data?.top_products ?? []
  const status = current.data?.model_status

  const labels = (history.data ?? [])
    .filter((h) => h.prediksi !== null)
    .map((h) => formatPeriode(h.periode))
  const actuals = (history.data ?? []).filter((h) => h.prediksi !== null).map((h) => h.actual)
  const preds = (history.data ?? []).filter((h) => h.prediksi !== null).map((h) => h.prediksi)

  const chartData = {
    labels,
    datasets: [
      {
        label: "Aktual",
        data: actuals,
        borderColor: chartColor(0),
        backgroundColor: chartColor(0, 0.08),
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
        tension: 0.3,
      },
      {
        label: "Prediksi",
        data: preds,
        borderColor: chartColor(1),
        backgroundColor: chartColor(1, 0.12),
        pointRadius: 0,
        borderWidth: 2,
        borderDash: [4, 4],
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const mape =
    status?.mape_test !== null && status?.mape_test !== undefined
      ? `${status.mape_test.toFixed(2)}%`
      : "-"
  const r2 =
    status?.r2_test !== null && status?.r2_test !== undefined
      ? `${(status.r2_test * 100).toFixed(1)}%`
      : "-"

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan prediksi penjualan bulan berikutnya
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prediksi Revenue
            </CardTitle>
            <CardDescription>Bulan {pred?.periode ? formatPeriode(pred.periode) : "-"}</CardDescription>
          </CardHeader>
          <CardContent>
            {current.isLoading ? (
              <Skeleton className="h-9 w-44" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatRupiah(pred?.prediksi)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rentang: {formatRupiah(pred?.lower)} - {formatRupiah(pred?.upper)} ribu Rp
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Akurasi Model Revenue
            </CardTitle>
            <CardDescription>Evaluasi test set terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {current.isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  R² {r2}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  MAPE {mape} · trained s/d {status?.trained_until ?? "-"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Produk
            </CardTitle>
            <CardDescription>Bulan {pred?.periode ? formatPeriode(pred.periode) : "-"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {current.data?.top_products_status === "not_trained" ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Jalankan retrain untuk menghasilkan top produk." : "Top produk belum tersedia."}
              </p>
            ) : (
              top.map((t) => (
                <div key={t.rank} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.tipe_produk}</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {(t.probabilitas * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))
            )}
            <p className="pt-1 text-xs text-muted-foreground">
              *Prediksi kasar, akurasi model produk rendah (~25%). Lihat evaluasi di halaman Riwayat.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penjualan Bulanan</CardTitle>
          <CardDescription>Aktual vs prediksi, dalam ribuan rupiah</CardDescription>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { intersect: false, mode: "index" },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { maxTicksLimit: 8 },
                    },
                    y: {
                      beginAtZero: false,
                      grid: { color: "oklch(0.905 0.008 85 / 0.4)" },
                      ticks: { maxTicksLimit: 5 },
                    },
                  },
                  plugins: {
                    legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(Number(ctx.raw))}`,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
