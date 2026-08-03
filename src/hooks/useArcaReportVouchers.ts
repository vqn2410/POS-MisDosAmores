import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { ArcaReportVoucher } from '../types';

const COL = 'arcaReportVouchers';

export function useArcaReportVouchers() {
  return useQuery({ queryKey: ['arcaReportVouchers'], queryFn: () => fs.getAll<ArcaReportVoucher>(COL) });
}

export function useImportArcaReportVouchers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vouchers: Omit<ArcaReportVoucher, 'id'>[]) => fs.upsertMany<ArcaReportVoucher>(COL, vouchers.map((voucher) => ({
      id: `${voucher.voucherType}-${voucher.salesPoint}-${voucher.voucherNumber}`,
      data: voucher,
    }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arcaReportVouchers'] }),
  });
}
