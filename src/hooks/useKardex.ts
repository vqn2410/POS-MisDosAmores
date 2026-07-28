import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { KardexMovement } from '../types';

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
    mutationFn: (data: Omit<KardexMovement, 'id'>) => fs.create<KardexMovement>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kardex_movements'] }),
  });
}
