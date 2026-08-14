import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
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
import { useCustomer } from "@/hooks/useData"

const TIPE = ["ukm", "sekolah", "agri_tech", "enterprise", "personal", "pemerintah", "event"]

export default function Customer() {
  const { list, create, remove } = useCustomer()
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [nama, setNama] = useState("")
  const [tipe, setTipe] = useState("ukm")
  const [join, setJoin] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create.mutateAsync({ nama, tipe, join })
      toast.success("Customer ditambahkan")
      setOpen(false)
      setNama("")
      setJoin("")
    } catch {
      toast.error("Gagal menambah customer")
    }
  }

  const rows = list.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer</h1>
          <p className="text-muted-foreground">{rows.length} customer</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <Plus /> Tambah Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Customer</CardTitle></CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Join</TableHead>
                  <TableHead>Transaksi</TableHead>
                  <TableHead>Revenue</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell>{c.nama}</TableCell>
                    <TableCell><Badge variant="outline">{c.tipe}</Badge></TableCell>
                    <TableCell>{c.join}</TableCell>
                    <TableCell>{c.total_transaksi}</TableCell>
                    <TableCell>{Math.round(c.total_revenue).toLocaleString("id-ID")}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada customer
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
            <DialogTitle>Tambah Customer</DialogTitle>
            <DialogDescription>ID dibuat otomatis</DialogDescription>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={create.isPending}>Tambah</Button>
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
