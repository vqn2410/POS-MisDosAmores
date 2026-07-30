import React from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { Barcode, PackageMinus, PackagePlus } from 'lucide-react';
import type { KardexMovement, Product } from '../../../types';
import { useCreateKardexMovement } from '../../../hooks/useKardex';
import { useAuthStore } from '../../../store/useAuthStore';

interface POSStockEntryModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
  mode: 'IN' | 'OUT';
}

export const POSStockEntryModal: React.FC<POSStockEntryModalProps> = ({ open, onClose, products, initialProduct = null, mode }) => {
  const barcodeRef = React.useRef<HTMLInputElement>(null);
  const createKardex = useCreateKardexMovement();
  const { user, activeBranch } = useAuthStore();
  const [barcode, setBarcode] = React.useState('');
  const [product, setProduct] = React.useState<Product | null>(null);
  const [quantity, setQuantity] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setBarcode(initialProduct?.barcode || initialProduct?.sku || '');
      setProduct(initialProduct);
      setQuantity('');
      setError('');
      window.setTimeout(() => barcodeRef.current?.focus(), 50);
    }
  }, [open, initialProduct]);

  const findProduct = () => {
    const code = barcode.trim();
    if (!code) return;
    const matched = products.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase());
    if (!matched) {
      setProduct(null);
      setError(`No existe un producto con el código "${code}".`);
      return;
    }
    setProduct(matched);
    setError('');
    window.setTimeout(() => document.getElementById('pos-stock-quantity')?.focus(), 50);
  };

  const parsedQuantity = Number(quantity.replace(',', '.'));
  const isValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const hasEnoughStock = !product || parsedQuantity <= product.stock;
  const isEntry = mode === 'IN';

  const handleAdjustStock = () => {
    if (!product || !isValidQuantity || (!isEntry && !hasEnoughStock)) return;
    const movement: Omit<KardexMovement, 'id'> = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      branchId: activeBranch?.id || 'br-01',
      branchName: activeBranch?.name || 'Sucursal Principal',
      type: isEntry ? 'IN_PURCHASE' : 'OUT_ADJUSTMENT',
      quantity: parsedQuantity,
      previousStock: product.stock,
      newStock: isEntry ? product.stock + parsedQuantity : product.stock - parsedQuantity,
      unitCost: product.costPrice,
      reference: `POS-${isEntry ? 'INGRESO' : 'SALIDA'}-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: `${isEntry ? 'Ingreso' : 'Salida'} de stock desde POS`,
      createdAt: new Date().toISOString(),
      userName: user?.fullName || 'Sistema',
    };
    createKardex.mutate(movement, { onSuccess: onClose, onError: () => setError(`No se pudo registrar la ${isEntry ? 'entrada' : 'salida'} de stock.`) });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        {isEntry ? <PackagePlus color="#15803D" /> : <PackageMinus color="#B91C1C" />} {isEntry ? 'Agregar' : 'Quitar'} stock desde POS
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Escaneá el código de barras del producto para registrar una {isEntry ? 'entrada' : 'salida'} de mercadería.</Typography>
        <Box component="form" onSubmit={(event) => { event.preventDefault(); findProduct(); }} sx={{ display: 'flex', gap: 1 }}>
          <TextField inputRef={barcodeRef} fullWidth label="Código de barras" value={barcode} onChange={(event) => setBarcode(event.target.value)} slotProps={{ input: { startAdornment: <Barcode size={20} />, sx: { minHeight: 56, fontSize: '1.1rem', fontWeight: 800 } } }} />
          <Button type="submit" variant="outlined" sx={{ minWidth: 105, fontWeight: 800 }}>Buscar</Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {product && (
          <Box sx={{ mt: 2.5, p: 2.5, bgcolor: isEntry ? '#F0FDF4' : '#FEF2F2', border: '1px solid', borderColor: isEntry ? '#86EFAC' : '#FCA5A5', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: isEntry ? '#14532D' : '#7F1D1D' }}>{product.name}</Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700, color: isEntry ? '#166534' : '#B91C1C' }}>Stock actual: {product.stock} {product.unit}</Typography>
            <TextField id="pos-stock-quantity" autoFocus fullWidth type="number" label={`Cantidad a ${isEntry ? 'agregar' : 'quitar'}`} value={quantity} onChange={(event) => setQuantity(event.target.value)} sx={{ mt: 2.5, bgcolor: '#FFFFFF' }} slotProps={{ htmlInput: { min: 0.001, step: 0.001 }, input: { sx: { minHeight: 56, fontSize: '1.1rem', fontWeight: 800 } } }} />
            {!isEntry && isValidQuantity && !hasEnoughStock && <Alert severity="warning" sx={{ mt: 1.5 }}>La cantidad supera el stock disponible.</Alert>}
            {isValidQuantity && hasEnoughStock && <Typography sx={{ mt: 1.5, fontWeight: 900, color: isEntry ? '#166534' : '#B91C1C' }}>Nuevo stock: {isEntry ? product.stock + parsedQuantity : product.stock - parsedQuantity} {product.unit}</Typography>}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={createKardex.isPending}>Cancelar</Button>
        <Button variant="contained" color={isEntry ? 'success' : 'error'} startIcon={isEntry ? <PackagePlus size={18} /> : <PackageMinus size={18} />} onClick={handleAdjustStock} disabled={!product || !isValidQuantity || (!isEntry && !hasEnoughStock) || createKardex.isPending}>
          {createKardex.isPending ? 'Guardando...' : `Confirmar ${isEntry ? 'ingreso' : 'salida'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
