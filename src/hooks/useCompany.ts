import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Company } from '../types';

const COL = 'companies';

export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await fs.getAll<Company>(COL);
      return companies[0] || null;
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => fs.update<Company>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
}
