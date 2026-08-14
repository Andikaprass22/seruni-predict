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
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { toast } from "sonner"
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

  const withActual = (history.data ?? []).filter((h) => h.actual !== null)
  const lastActual = withActual.length > 0 ? withActual[withActual.length - 1].actual : null
  const delta =
    pred?.prediksi != null && lastActual != null
      ? ((pred.prediksi - lastActual) / lastActual) * 100
      : null

  const metrics = [
    { label: "R² test", value: r2, desc: "Semakin mendekati 100%, semakin baik" },
    { label: "MAPE", value: mape, desc: "Rata-rata error prediksi bulanan" },
    { label: "Trained s/d", value: formatPeriode(status?.trained_until), desc: "Data terakhir yang melatih model" },
  ]

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
            size="sm"
            className="bg-emerald-600 text-white shadow-none transition-colors hover:bg-emerald-700 focus-visible:ring-emerald-600/40 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-400/40"
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

      {/* Stat band: flat, hairline-divided, type does the hierarchy */}
      <Card className="shadow-none">
        <CardContent className="px-6 py-7 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border">
            <div className="flex flex-col md:pr-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Prediksi Revenue
                </p>
                {pred?.periode && (
                  <p className="text-xs font-medium text-muted-foreground tabular-nums">
                    {formatPeriode(pred.periode)}
                  </p>
                )}
              </div>
              {current.isLoading ? (
                <Skeleton className="mt-3 h-12 w-56" />
              ) : (
                <>
                  <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums lg:text-5xl">
                    {formatRupiah(pred?.prediksi)}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
                    {delta !== null && (
                      <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        {delta >= 0 ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                        {Math.abs(delta).toFixed(1)}% vs bulan lalu
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Rentang {formatRupiah(pred?.lower)} - {formatRupiah(pred?.upper)} ribu Rp
                    </p>
                  </div>
                </>
              )}
            </div>

            {metrics.map((m) => (
              <div key={m.label} className="flex flex-col md:px-8">
                <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                {current.isLoading ? (
                  <Skeleton className="mt-2 h-14 w-36" />
                ) : (
                  <>
                    <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">{m.value}</p>
                    <p className="mt-auto max-w-44 pt-1.5 text-sm leading-snug text-muted-foreground">
                      {m.desc}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
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

        <Card className="shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Top Produk</CardTitle>
            <CardDescription>
              {pred?.periode ? `Periode ${formatPeriode(pred.periode)}` : "Periode berikutnya"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {current.data?.top_products_status === "not_trained" ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {isAdmin ? "Jalankan retrain untuk menghasilkan top produk." : "Top produk belum tersedia."}
              </p>
            ) : (
              top.map((t) => (
                <div key={t.rank} className="space-y-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="w-5 shrink-0 text-muted-foreground tabular-nums">
                      {String(t.rank).padStart(2, "0")}
                    </span>
                    <span className="truncate">{t.tipe_produk}</span>
                    <span className="ml-auto text-muted-foreground tabular-nums">
                      {(t.probabilitas * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="ml-7 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${t.probabilitas * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Prediksi kasar, akurasi model produk rendah (~25%). Lihat evaluasi di halaman Riwayat.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
