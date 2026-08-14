import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/useAuth"
import { useCustomer, useTransaksi } from "@/hooks/useData"
import type { Transaction } from "@/types"

const EMPTY = {
  tanggal: "",
  customer: "",
  keterangan: "",
  qty: 1,
  satuan: "pcs",
  harga: 0,
  tipe_customer: "ukm",
  tipe_produk: "",
}

export default function Transaksi() {
  const { list, create, update, remove } = useTransaksi()
  const customers = useCustomer()
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const total = Number(form.qty) * Number(form.harga)
    const tanggal = new Date(form.tanggal)
    const bulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ][tanggal.getMonth()]
    const payload = { ...form, total, bulan, tahun: tanggal.getFullYear() }
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, payload })
        toast.success("Transaksi diperbarui")
      } else {
        await create.mutateAsync(payload)
        toast.success("Transaksi ditambahkan")
      }
      setOpen(false)
      setForm({ ...EMPTY })
      setEditId(null)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? "Gagal menyimpan transaksi")
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await remove.mutateAsync(deleteId)
      toast.success("Transaksi dihapus")
    } catch {
      toast.error("Gagal menghapus transaksi")
    }
    setDeleteId(null)
  }

  const rows = list.data ?? []
  const custOptions = customers.list.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaksi</h1>
          <p className="text-muted-foreground">{rows.length} transaksi</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ ...EMPTY }); setOpen(true) }}>
          <Plus /> Tambah Transaksi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total (ribu Rp)</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t: Transaction) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>{t.tanggal}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.customer}</Badge>
                    </TableCell>
                    <TableCell>{t.tipe_produk}</TableCell>
                    <TableCell>{t.qty} {t.satuan}</TableCell>
                    <TableCell>{Math.round(t.total).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditId(t.id)
                              setForm({
                                tanggal: t.tanggal,
                                customer: t.customer,
                                keterangan: t.keterangan,
                                qty: t.qty,
                                satuan: t.satuan,
                                harga: t.harga,
                                tipe_customer: t.tipe_customer,
                                tipe_produk: t.tipe_produk,
                              })
                              setOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
            <DialogDescription>Total dihitung otomatis dari qty x harga</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" required value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={form.customer} onValueChange={(v) => set("customer", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih customer" /></SelectTrigger>
                <SelectContent>
                  {custOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.id} - {c.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input required value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input type="number" min={1} required value={form.qty} onChange={(e) => set("qty", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input required value={form.satuan} onChange={(e) => set("satuan", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Harga (ribu Rp)</Label>
                <Input type="number" min={0} required value={form.harga} onChange={(e) => set("harga", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jenis Produk</Label>
              <Input required value={form.tipe_produk} onChange={(e) => set("tipe_produk", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editId ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus transaksi?</DialogTitle>
            <DialogDescription>Tindakan ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
