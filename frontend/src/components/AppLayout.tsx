import {
  Banknote,
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
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = [
    { to: "/", label: "Dashboard", sub: "Ringkasan & prediksi", icon: LayoutDashboard, end: true },
    { to: "/transaksi", label: "Transaksi", sub: "Input & kelola data", icon: Receipt },
    { to: "/customer", label: "Customer", sub: "Data pelanggan", icon: Users },
    { to: "/riwayat", label: "Riwayat & Evaluasi", sub: "Akurasi model", icon: LineChart },
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
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader>
            <div className="flex items-center gap-3 px-3 py-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-data-[collapsible=icon]:size-8">
                <Banknote className="size-5" />
              </div>
              <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold tracking-tight">Seruni Predict</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">Sistem Informasi Penjualan</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
                Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        tooltip={item.label}
                        className="h-12 rounded-lg px-3 py-2 transition-colors duration-150 group-data-[collapsible=icon]:justify-center"
                      >
                        <NavLink to={item.to} end={item.end}>
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={cn(
                                  "size-[18px] shrink-0 transition-colors",
                                  isActive ? "text-primary" : "text-muted-foreground"
                                )}
                              />
                              <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-sm font-medium leading-tight">
                                  {item.label}
                                </span>
                                <span className="truncate text-xs leading-tight text-muted-foreground">
                                  {item.sub}
                                </span>
                              </span>
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-tight">{user?.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isAdmin ? "Admin" : "Staff"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground group-data-[collapsible=icon]:hidden"
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
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur md:px-6">
            <SidebarTrigger />
            <span className="truncate text-sm font-medium">{current}</span>
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-8">
            <div key={location.pathname} className="page-enter">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
