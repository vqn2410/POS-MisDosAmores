import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fs from '../services/firestoreService';
import type { Product } from '../types';
import { useNotificationStore } from '../store/useNotificationStore';

const COL = 'products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fs.getAllOrdered<Product>(COL, 'updatedAt'),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { addNotification } = useNotificationStore();
  return useMutation({
    mutationFn: async (data: Omit<Product, 'id'>) => ({ id: await fs.create<Product>(COL, data), data }),
    onSuccess: ({ id, data }) => {
      qc.setQueryData<Product[]>(['products'], (current = []) => [{ ...data, id }, ...current.filter((product) => product.id !== id)]);
      qc.invalidateQueries({ queryKey: ['products'], refetchType: 'none' });
      addNotification({
        title: 'Éxito',
        message: 'Producto creado exitosamente',
        type: 'success',
      });
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
      addNotification({
        title: 'Error de Firebase',
        message: `No se pudo guardar el producto: ${error.message}`,
        type: 'error',
      });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { addNotification } = useNotificationStore();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      await fs.update<Product>(COL, id, data);
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      qc.setQueryData<Product[]>(['products'], (current = []) => current.map((product) => product.id === id ? { ...product, ...data, updatedAt: new Date().toISOString() } : product));
      qc.invalidateQueries({ queryKey: ['products'], refetchType: 'none' });
      addNotification({
        title: 'Éxito',
        message: 'Producto actualizado exitosamente',
        type: 'success',
      });
    },
    onError: (error: any) => {
      console.error('Error updating product:', error);
      addNotification({
        title: 'Error de Firebase',
        message: `No se pudo actualizar el producto: ${error.message}`,
        type: 'error',
      });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { addNotification } = useNotificationStore();
  return useMutation({
    mutationFn: (id: string) => fs.remove(COL, id),
    onSuccess: (_, id) => {
      qc.setQueryData<Product[]>(['products'], (current = []) => current.filter((product) => product.id !== id));
      qc.invalidateQueries({ queryKey: ['products'], refetchType: 'none' });
      addNotification({
        title: 'Éxito',
        message: 'Producto eliminado',
        type: 'success',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting product:', error);
      addNotification({
        title: 'Error de Firebase',
        message: `No se pudo eliminar el producto: ${error.message}`,
        type: 'error',
      });
    },
  });
}
