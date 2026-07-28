import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Customer } from '../types';

const COL = 'customers';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => fs.getAllOrdered<Customer>(COL, 'createdAt'),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Customer, 'id'>) => fs.create<Customer>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => fs.update<Customer>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fs.remove(COL, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
