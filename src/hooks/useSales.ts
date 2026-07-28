import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Sale } from '../types';

const COL = 'sales';

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: () => fs.getAllOrdered<Sale>(COL, 'createdAt'),
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Sale, 'id'>) => fs.create<Sale>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Sale> }) => fs.update<Sale>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}
