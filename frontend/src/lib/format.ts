const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]

/** "2026-08-14" -> "14 Agu 2026" */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${BULAN_PENDEK[m - 1]} ${y}`
}

/** "TRX-202608014" -> "TRX 014" (compact) or "202608-014"; keeps raw ID readable. */
export function formatId(id: string | null | undefined): string {
  if (!id) return "-"
  const trx = id.match(/^TRX-(\d{4})(\d{2})(\d+)$/)
  if (trx) return `TRX ${trx[3]}`
  return id
}

/** "2026-08" -> "Agu 2026" */
export function formatPeriode(periode: string | null | undefined): string {
  if (!periode) return "-"
  const [y, m] = periode.split("-").map(Number)
  if (!y || !m) return periode
  return `${BULAN_PENDEK[m - 1]} ${y}`
}

/** "2026-08-14" -> "14 Agustus 2026" (long) */
export function formatTanggalPanjang(iso: string | null | undefined): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${BULAN[m - 1]} ${y}`
}

/** Format a value stored in thousands of rupiah as full rupiah. */
export function formatRupiah(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-"
  return `Rp ${Math.round(v * 1000).toLocaleString("id-ID")}`
}

/** Build a readable color for a chart series index, in OKLCH. */
export function chartColor(index: number, alpha = 1): string {
  const hues = [27, 160, 250, 330, 45]
  const hue = hues[index % hues.length]
  return `oklch(0.62 0.11 ${hue} / ${alpha})`
}
