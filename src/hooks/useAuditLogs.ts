import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { AuditLog } from '../types';

const COL = 'audit_logs';

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: () => fs.getAllOrdered<AuditLog>(COL, 'createdAt'),
  });
}

export function useCreateAuditLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AuditLog, 'id'>) => fs.create<AuditLog>(COL, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit_logs'] }),
  });
}
