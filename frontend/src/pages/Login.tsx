import { useState } from "react"
import { Banknote, Eye, EyeOff, TrendingUp } from "lucide-react"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

const FEATURES = [
  { icon: TrendingUp, title: "Prediksi penjualan bulan berikutnya" },
  { icon: Banknote, title: "Pantau revenue & produk terlaris" },
]

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login.mutateAsync({ username, password })
      toast.success("Login berhasil")
      navigate("/")
    } catch {
      toast.error("Username atau password salah")
    }
  }

  return (
    <div className="flex min-h-svh">
      {/* Left: brand + info */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-12 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_50%)]" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground">
            <Banknote className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">Seruni Predict</p>
            <p className="text-sm text-primary-foreground/80">Sistem Informasi Penjualan</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Prediksi penjualan yang bisa Anda andalkan.
          </h1>
          <p className="text-primary-foreground/85">
            Kelola transaksi dan customer, pantau performa penjualan bulanan, dan dapatkan prediksi
            revenue bulan berikutnya yang akurat.
          </p>

          <div className="space-y-4 pt-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <f.icon className="size-5" />
                </div>
                <p className="text-sm font-medium">{f.title}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} Seruni Predict
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex w-full items-center justify-center bg-background p-4 sm:p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Banknote className="size-6" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">Seruni Predict</p>
              <p className="text-sm text-muted-foreground">Sistem Informasi Penjualan</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan kredensial untuk mengakses dashboard.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Masuk..." : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
