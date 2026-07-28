import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { User } from '../types';

const COL = 'users';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fs.getAllOrdered<User>(COL, 'createdAt'),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<User, 'id'>) => fs.create<User>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => fs.update<User>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fs.remove(COL, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
