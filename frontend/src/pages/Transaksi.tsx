import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatId, formatRupiah, formatTanggal } from "@/lib/format"
import { useAuth } from "@/hooks/useAuth"
import { useCustomer, useTransaksi } from "@/hooks/useData"
import type { Transaction } from "@/types"

const PAGE_SIZE = 10
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
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

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

  const custOptions = customers.list.data ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const data = list.data ?? []
    if (!q) return data
    return data.filter((t) =>
      [t.id, t.customer, t.tipe_produk, t.keterangan, t.bulan, String(t.tahun)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [list.data, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ ...EMPTY }); setOpen(true) }}>
          <Plus /> Tambah Transaksi
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Daftar Transaksi</CardTitle>
          <div className="relative w-full max-w-60">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Cari transaksi..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              aria-label="Cari transaksi"
            />
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((t: Transaction) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{formatId(t.id)}</TableCell>
                      <TableCell>{formatTanggal(t.tanggal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.customer}</Badge>
                      </TableCell>
                      <TableCell>{t.tipe_produk}</TableCell>
                      <TableCell>{t.qty} {t.satuan}</TableCell>
                      <TableCell className="tabular-nums">{formatRupiah(t.total)}</TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit transaksi ${t.id}`}
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
                              </TooltipTrigger>
                              <TooltipContent>Edit transaksi</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Hapus transaksi ${t.id}`}
                                  onClick={() => setDeleteId(t.id)}
                                >
                                  <Trash2 className="text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Hapus transaksi</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {filtered.length === 0 ? "Belum ada transaksi" : "Tidak ditemukan transaksi yang cocok"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
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
                <Label>Harga (Rp)</Label>
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
