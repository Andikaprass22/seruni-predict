import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { CurrentPrediction, HistoryRow } from "@/types"

export function usePrediksi() {
  const queryClient = useQueryClient()

  const current = useQuery({
    queryKey: ["prediksi"],
    queryFn: async () => (await api.get<CurrentPrediction>("/predictions/current/")).data,
  })

  const history = useQuery({
    queryKey: ["history"],
    queryFn: async () => (await api.get<HistoryRow[]>("/predictions/history/")).data,
  })

  const refresh = useMutation({
    mutationFn: () => api.post("/predictions/refresh/"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediksi"] })
      queryClient.invalidateQueries({ queryKey: ["history"] })
    },
  })

  const retrain = useMutation({
    mutationFn: () => api.post("/predictions/retrain/"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediksi"] })
      queryClient.invalidateQueries({ queryKey: ["history"] })
    },
  })

  return { current, history, refresh, retrain }
}
