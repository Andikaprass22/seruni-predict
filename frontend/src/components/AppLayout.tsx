import {
  LayoutDashboard,
  LineChart,
  LogOut,
  Receipt,
  Users,
} from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/transaksi", label: "Transaksi", icon: Receipt },
    { to: "/customer", label: "Customer", icon: Users },
    { to: "/riwayat", label: "Riwayat & Evaluasi", icon: LineChart },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-2">
              <p className="text-lg font-bold">Seruni Predict</p>
              <p className="text-xs text-muted-foreground">Sistem Informasi Penjualan</p>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
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
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{isAdmin ? "Admin" : "Staff"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
              >
                <LogOut />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">Seruni Predict</span>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
