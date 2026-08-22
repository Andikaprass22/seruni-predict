import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { User } from "@/types"

export function useAuth() {
  const queryClient = useQueryClient()

  const login = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const { data } = await api.post("/auth/token/", { username, password })
      localStorage.setItem("access", data.access)
      localStorage.setItem("refresh", data.refresh)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })

  const logout = async () => {
    const refresh = localStorage.getItem("refresh")
    if (refresh) {
      try {
        await api.post("/auth/token/blacklist/", { refresh })
      } catch {
        // blacklist gagal (token sudah invalid) — tetap lanjut logout
      }
    }
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")
    queryClient.clear()
  }

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<User>("/auth/me/")).data,
    enabled: !!localStorage.getItem("access"),
    retry: false,
  })

  // Single Admin: setiap user terautentikasi adalah admin (satu-satunya role)
  const isAdmin = !!me.data
  return { login, logout, me, user: me.data, isAdmin }
}
