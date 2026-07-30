import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { User } from '../types';

const COL = 'users';
const USER_LIST_CACHE_KEY = 'pos-user-list-cache';

function readCachedUsers(): User[] | undefined {
  try {
    const cached = localStorage.getItem(USER_LIST_CACHE_KEY);
    return cached ? JSON.parse(cached) as User[] : undefined;
  } catch {
    return undefined;
  }
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await fs.getAll<User>(COL);
      try { localStorage.setItem(USER_LIST_CACHE_KEY, JSON.stringify(users)); } catch {}
      return users;
    },
    initialData: readCachedUsers,
    initialDataUpdatedAt: 0,
    staleTime: 0,
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
