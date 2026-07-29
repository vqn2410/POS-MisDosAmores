import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { PackagePlus } from 'lucide-react';
import type { KardexMovement, Product } from '../../../types';
import { useCreateKardexMovement } from '../../../hooks/useKardex';
import { useAuthStore } from '../../../store/useAuthStore';

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
}

export const StockEntryDialog: React.FC<StockEntryDialogProps> = ({ open, onClose, products, initialProduct }) => {
  const createKardex = useCreateKardexMovement();
  const { user, activeBranch } = useAuthStore();
  const [productId, setProductId] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [notes, setNotes] = React.useState('Ingreso de mercadería');

  React.useEffect(() => {
    if (open) {
      setProductId(initialProduct?.id || '');
      setQuantity('');
      setNotes('Ingreso de mercadería');
    }
  }, [open, initialProduct]);

  const selectedProduct = products.find((product) => product.id === productId);
  const parsedQuantity = Number(quantity.replace(',', '.'));
  const isValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  const handleAddStock = () => {
    if (!selectedProduct || !isValidQuantity) return;
    const movement: Omit<KardexMovement, 'id'> = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSku: selectedProduct.sku,
      branchId: activeBranch?.id || 'br-01',
      branchName: activeBranch?.name || 'Sucursal Principal',
      type: 'IN_PURCHASE',
      quantity: parsedQuantity,
      previousStock: selectedProduct.stock,
      newStock: selectedProduct.stock + parsedQuantity,
      unitCost: selectedProduct.costPrice,
      reference: `INGRESO-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: notes.trim() || 'Ingreso de mercadería',
      createdAt: new Date().toISOString(),
      userName: user?.fullName || 'Sistema',
    };

    createKardex.mutate(movement, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PackagePlus color="#15803D" /> Agregar stock
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField select fullWidth label="Producto" value={productId} onChange={(event) => setProductId(event.target.value)} sx={{ mb: 2 }} slotProps={{ input: { sx: { minHeight: 56, fontSize: '1.05rem', fontWeight: 700 } } }}>
          {products.map((product) => (
            <MenuItem key={product.id} value={product.id} sx={{ fontWeight: 700 }}>
              {product.name} · Stock actual: {product.stock} {product.unit}
            </MenuItem>
          ))}
        </TextField>
        <TextField autoFocus fullWidth type="number" label="Cantidad a agregar" value={quantity} onChange={(event) => setQuantity(event.target.value)} slotProps={{ htmlInput: { min: 0.001, step: 0.001 }, input: { sx: { minHeight: 56, fontSize: '1.1rem', fontWeight: 800 } } }} />
        <TextField fullWidth label="Motivo u observación" value={notes} onChange={(event) => setNotes(event.target.value)} sx={{ mt: 2 }} slotProps={{ input: { sx: { minHeight: 56, fontSize: '1rem' } } }} />
        {selectedProduct && <Typography sx={{ mt: 2, fontWeight: 800, color: '#166534' }}>Nuevo stock: {selectedProduct.stock + (isValidQuantity ? parsedQuantity : 0)} {selectedProduct.unit}</Typography>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={createKardex.isPending}>Cancelar</Button>
        <Button variant="contained" color="success" startIcon={<PackagePlus size={18} />} onClick={handleAddStock} disabled={!selectedProduct || !isValidQuantity || createKardex.isPending}>
          {createKardex.isPending ? 'Agregando...' : 'Agregar stock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
