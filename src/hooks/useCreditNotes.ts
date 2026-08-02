import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { CreditNote } from '../types';

const COL = 'creditNotes';

export function useCreditNotes() {
  return useQuery({
    queryKey: ['creditNotes'],
    queryFn: () => fs.getAllOrdered<CreditNote>(COL, 'createdAt'),
  });
}

export function useCreateCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreditNote, 'id'>) => fs.create<CreditNote>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creditNotes'] }),
  });
}
