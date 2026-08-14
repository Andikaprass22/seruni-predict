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
import { useAuth } from "@/hooks/useAuth"
import { usePrediksi } from "@/hooks/usePrediksi"

export default function Riwayat() {
  const { history, retrain } = usePrediksi()
  const { isAdmin } = useAuth()
  const [confirmRetrain, setConfirmRetrain] = useState(false)

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

  const exportCsv = () => {
    window.location.href = "/api/predictions/export/"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat & Evaluasi</h1>
          <p className="text-muted-foreground">
            {withActual.length > 0 && avgMape !== null
              ? `MAPE rata-rata (${withActual.length} bulan): ${avgMape.toFixed(2)}%`
              : "Belum ada data aktual untuk evaluasi"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Export CSV
          </Button>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setConfirmRetrain(true)}>
              <RefreshCw /> Retrain Model
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Prediksi vs Aktual per Bulan</CardTitle></CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
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
                    <TableCell className="font-mono text-xs">{h.periode}</TableCell>
                    <TableCell>{h.actual !== null ? Math.round(h.actual).toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell>{h.prediksi !== null ? Math.round(h.prediksi).toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell>{h.error !== null ? Math.round(h.error).toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell>{h.mape !== null ? `${h.mape.toFixed(2)}%` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={h.split === "test" ? "default" : "secondary"}>{h.split}</Badge>
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
