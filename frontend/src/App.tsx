import { Agentation } from "agentation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { AppLayout } from "@/components/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import Customer from "@/pages/Customer"
import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import Riwayat from "@/pages/Riwayat"
import Transaksi from "@/pages/Transaksi"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function Protected() {
  const { me } = useAuth()
  if (me.isLoading) return <div className="flex min-h-svh items-center justify-center">Memuat...</div>
  if (!me.data) return <Navigate to="/login" replace />
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/customer" element={<Customer />} />
            <Route path="/riwayat" element={<Riwayat />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
      {import.meta.env.DEV && <Agentation />}
    </QueryClientProvider>
  )
}
