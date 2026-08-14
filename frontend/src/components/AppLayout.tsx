import {
  LayoutDashboard,
  LineChart,
  LogOut,
  Receipt,
  Users,
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/transaksi", label: "Transaksi", icon: Receipt },
    { to: "/customer", label: "Customer", icon: Users },
    { to: "/riwayat", label: "Riwayat & Evaluasi", icon: LineChart },
  ]
  const current =
    nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ??
    "Dashboard"

  const initials = (user?.username ?? "?")
    .split(/[@.]/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-3 py-4">
              <p className="text-sm font-semibold tracking-tight">Seruni Predict</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Sistem Informasi Penjualan</p>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.to} end={item.end}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="border-t px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{user?.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isAdmin ? "Admin" : "Staff"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => {
                    logout()
                    navigate("/login")
                  }}
                >
                  <LogOut />
                  <span className="sr-only">Keluar</span>
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <SidebarTrigger />
            <span className="text-sm font-medium">{current}</span>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div key={location.pathname} className="page-enter">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
