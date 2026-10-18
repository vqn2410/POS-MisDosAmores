import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { CashSession, CashMovement } from '../types';

const COL = 'cash_sessions';
const MOV_COL = 'cash_movements';

export function useCashSessions() {
  return useQuery({
    queryKey: ['cash_sessions'],
    queryFn: () => fs.getAllOrdered<CashSession>(COL, 'openedAt'),
  });
}

export function useCurrentCashSession() {
  return useQuery({
    queryKey: ['cash_sessions', 'current'],
    queryFn: async () => {
      const sessions = await fs.getWhere<CashSession>(COL, 'isOpen', '==', true);
      const ordered = [...sessions].sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''));
      return ordered.length > 0 ? ordered[0] : null;
    },
  });
}

export function useOpenCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CashSession, 'id'>) => fs.create<CashSession>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_sessions'] }),
  });
}

export function useCloseCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CashSession> }) => fs.update<CashSession>(COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_sessions'] }),
  });
}

export function useCashMovements(cashSessionId: string | undefined) {
  return useQuery({
    queryKey: ['cash_movements', cashSessionId],
    queryFn: () => fs.getWhere<CashMovement>(MOV_COL, 'cashSessionId', '==', cashSessionId!),
    enabled: !!cashSessionId,
  });
}

export function useCreateCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CashMovement, 'id'>) => fs.create<CashMovement>(MOV_COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_movements'] }),
  });
}

export function useCancelCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CashMovement> }) => fs.update<CashMovement>(MOV_COL, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash_movements'] }),
  });
}
