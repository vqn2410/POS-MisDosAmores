import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { CartItem, InventoryMovementType, KardexMovement } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const COL = 'kardex_movements';

const stockQty = (item: CartItem) => item.weightKg ?? item.quantity;

const affectsStock = (item: CartItem) => !item.isVariableProduct && item.product.tracksStock !== false;

export function useKardexMovements() {
  return useQuery({
    queryKey: ['kardex_movements'],
    queryFn: () => fs.getAllOrdered<KardexMovement>(COL, 'createdAt'),
  });
}

export function useCreateKardexMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<KardexMovement, 'id'>) => {
      await fs.create<KardexMovement>(COL, data);
      const delta = data.type.startsWith('IN') ? data.quantity : -data.quantity;
      await fs.adjustStock(data.productId, delta);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kardex_movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRegisterBulkKardex() {
  const qc = useQueryClient();
  const { user, activeBranch } = useAuthStore();
  return useMutation({
    mutationFn: async ({ items, type, reference, notes }: { items: CartItem[]; type: InventoryMovementType; reference: string; notes?: string }) => {
      const sign = type.startsWith('IN') ? 1 : -1;
      const movements: Array<Omit<KardexMovement, 'id'>> = items
        .filter(affectsStock)
        .map((item) => {
          const quantity = stockQty(item);
          const previousStock = item.product.stock ?? 0;
          return {
            productId: item.product.id,
            productName: item.product.name,
            productSku: item.product.sku,
            branchId: activeBranch?.id || 'br-01',
            branchName: activeBranch?.name || 'Sucursal Principal',
            type,
            quantity,
            previousStock,
            newStock: previousStock + sign * quantity,
            unitCost: item.product.costPrice ?? 0,
            reference,
            notes,
            createdAt: new Date().toISOString(),
            userName: user?.fullName || 'Sistema',
          };
        });
      for (const movement of movements) {
        await fs.create<KardexMovement>(COL, movement);
        await fs.adjustStock(movement.productId, sign * movement.quantity);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kardex_movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export { stockQty, affectsStock };
