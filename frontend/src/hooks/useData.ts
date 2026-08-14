import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Customer, Transaction } from "@/types"

export function useTransaksi() {
  const queryClient = useQueryClient()

  const list = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await api.get<{ results: Transaction[] }>("/transactions/?page_size=100")).data.results,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["prediksi"] })
    queryClient.invalidateQueries({ queryKey: ["history"] })
  }

  const create = useMutation({
    mutationFn: (payload: Partial<Transaction>) => api.post("/transactions/", payload),
    onSuccess: invalidateAll,
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Transaction> }) => api.patch(`/transactions/${id}/`, payload),
    onSuccess: invalidateAll,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}/`),
    onSuccess: invalidateAll,
  })

  return { list, create, update, remove }
}

export function useCustomer() {
  const queryClient = useQueryClient()

  const list = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get<{ results: Customer[] }>("/customers/?page_size=100")).data.results,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] })
  }

  const create = useMutation({
    mutationFn: (payload: Partial<Customer>) => api.post("/customers/", payload),
    onSuccess: invalidateAll,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}/`),
    onSuccess: invalidateAll,
  })

  return { list, create, remove }
}
