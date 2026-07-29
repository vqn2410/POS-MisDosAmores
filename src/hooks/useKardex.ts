import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { KardexMovement, Product } from '../types';

const COL = 'kardex_movements';

export function useKardexMovements() {
  return useQuery({
    queryKey: ['kardex_movements'],
    queryFn: () => fs.getAllOrdered<KardexMovement>(COL, 'createdAt'),
  });
}

export function useCreateKardexMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<KardexMovement, 'id'>) => {
      await fs.create<KardexMovement>(COL, data);
      await fs.update<Product>('products', data.productId, { stock: data.newStock });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kardex_movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
