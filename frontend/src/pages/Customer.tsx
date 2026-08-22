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
import { formatPeriode, formatRupiah } from "@/lib/format"
import { useCustomer } from "@/hooks/useData"

const PAGE_SIZE = 10
const TIPE = ["ukm", "sekolah", "agri_tech", "enterprise", "personal", "pemerintah", "event"]

export default function Customer() {
  const { list, create, update, remove } = useCustomer()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nama, setNama] = useState("")
  const [tipe, setTipe] = useState("ukm")
  const [join, setJoin] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, payload: { nama, tipe, join } })
        toast.success("Customer diperbarui")
      } else {
        await create.mutateAsync({ nama, tipe, join })
        toast.success("Customer ditambahkan")
      }
      setOpen(false)
      setEditId(null)
      setNama("")
      setJoin("")
      setTipe("ukm")
    } catch {
      toast.error("Gagal menyimpan customer")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const data = list.data ?? []
    if (!q) return data
    return data.filter((c) =>
      [c.id, c.nama, c.tipe, c.join]
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} customer</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditId(null); setNama(""); setTipe("ukm"); setJoin(""); setOpen(true) }}>
          <Plus /> Tambah Customer
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Customer</CardTitle>
          <div className="relative w-full max-w-none sm:max-w-60">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Cari customer..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              aria-label="Cari customer"
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
                    <TableHead>Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Join</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.id}</TableCell>
                      <TableCell>{c.nama}</TableCell>
                      <TableCell><Badge variant="outline">{c.tipe}</Badge></TableCell>
                      <TableCell>{formatPeriode(c.join)}</TableCell>
                      <TableCell>{c.total_transaksi}</TableCell>
                      <TableCell className="tabular-nums">{formatRupiah(c.total_revenue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Edit customer ${c.nama}`} onClick={() => { setEditId(c.id); setNama(c.nama); setTipe(c.tipe); setJoin(c.join); setOpen(true) }}>
                                <Pencil />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit customer</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Hapus customer ${c.nama}`} onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus customer</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {filtered.length === 0 ? "Belum ada customer" : "Tidak ditemukan customer yang cocok"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
                  </p>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Customer" : "Tambah Customer"}</DialogTitle>
            <DialogDescription>{editId ? "Perbarui data customer" : "ID dibuat otomatis"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input required value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={tipe} onValueChange={setTipe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Join (YYYY-MM)</Label>
              <Input required pattern="\d{4}-\d{2}" value={join} onChange={(e) => setJoin(e.target.value)} placeholder="2026-01" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditId(null) }}>Batal</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>{editId ? "Simpan" : "Tambah"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus customer?</DialogTitle>
            <DialogDescription>Transaksi terkait juga ikut terhapus.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteId) return
                await remove.mutateAsync(deleteId)
                toast.success("Customer dihapus")
                setDeleteId(null)
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
