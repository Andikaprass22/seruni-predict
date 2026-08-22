import { useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from "@/lib/api"
import { formatPeriode, formatRupiah } from "@/lib/format"
import { usePrediksi } from "@/hooks/usePrediksi"

export default function Riwayat() {
  const { history, retrain } = usePrediksi()
  const [confirmRetrain, setConfirmRetrain] = useState(false)
  const [exporting, setExporting] = useState(false)

  const rows = history.data ?? []
  const withActual = rows.filter((h) => h.actual !== null)
  const avgMape =
    withActual.length > 0
      ? withActual.reduce((acc, h) => acc + (h.mape ?? 0), 0) / withActual.length
      : null

  const doRetrain = async () => {
    setConfirmRetrain(false)
    retrain.mutate(undefined, {
      onSuccess: () => toast.success("Model berhasil dilatih ulang"),
      onError: () => toast.error("Gagal retrain"),
    })
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      // Download through the axios client so the JWT bearer token is attached.
      const { data } = await api.get<Blob>("/predictions/export/", {
        responseType: "blob",
      })
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = "prediksi-seruni.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Gagal mengekspor CSV")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Riwayat & Evaluasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {withActual.length > 0 && avgMape !== null
              ? `MAPE rata-rata (${withActual.length} bulan): ${avgMape.toFixed(2)}%`
              : "Belum ada data aktual untuk evaluasi"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={exportCsv} disabled={exporting}>
            <Download /> {exporting ? "Mengekspor..." : "Export CSV"}
          </Button>
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setConfirmRetrain(true)}>
            <RefreshCw /> Retrain Model
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Prediksi vs Aktual per Bulan</CardTitle></CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Aktual</TableHead>
                  <TableHead>Prediksi</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>MAPE</TableHead>
                  <TableHead>Split</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((h) => (
                  <TableRow key={h.periode}>
                    <TableCell className="font-mono text-xs">{formatPeriode(h.periode)}</TableCell>
                    <TableCell>{h.actual !== null ? formatRupiah(h.actual) : "-"}</TableCell>
                    <TableCell>{h.prediksi !== null ? formatRupiah(h.prediksi) : "-"}</TableCell>
                    <TableCell>{h.error !== null ? formatRupiah(h.error) : "-"}</TableCell>
                    <TableCell>{h.mape !== null ? `${h.mape.toFixed(2)}%` : "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.split === "test"
                            ? "default"
                            : h.split === "train"
                              ? "secondary"
                              : h.split === "future"
                                ? "outline"
                                : "outline"
                        }
                        className={
                          h.split === "actual"
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : h.split === "future"
                              ? "border-dashed"
                              : ""
                        }
                      >
                        {h.split}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada data riwayat
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmRetrain} onOpenChange={setConfirmRetrain}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retrain model?</DialogTitle>
            <DialogDescription>
              Model dilatih ulang dari seluruh data transaksi di database dengan hyperparameter tetap. Proses bisa memakan waktu beberapa detik.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRetrain(false)}>Batal</Button>
            <Button variant="secondary" onClick={doRetrain} disabled={retrain.isPending}>
              {retrain.isPending ? "Melatih..." : "Ya, Retrain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
