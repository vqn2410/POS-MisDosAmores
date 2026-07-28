import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Product } from '../types';

const COL = 'products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fs.getAllOrdered<Product>(COL, 'updatedAt'),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => fs.create<Product>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => fs.update<Product>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fs.remove(COL, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
