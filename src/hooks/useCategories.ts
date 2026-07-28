import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Category } from '../types';

const COL = 'categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fs.getAllOrdered<Category>(COL, 'name'),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Category, 'id'>) => fs.create<Category>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
