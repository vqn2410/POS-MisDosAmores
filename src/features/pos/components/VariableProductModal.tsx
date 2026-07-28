import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import { ShoppingBag, Plus, X } from 'lucide-react';

interface VariableProductModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, unitPrice: number) => void;
}

export const VariableProductModal: React.FC<VariableProductModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [quantityStr, setQuantityStr] = React.useState<string>('');
  const [priceStr, setPriceStr] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const quantityRef = React.useRef<HTMLInputElement>(null);
  const priceRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuantityStr('');
      setPriceStr('');
      setErrorMsg(null);
      setTimeout(() => quantityRef.current?.focus(), 50);
    }
  }, [open]);

  const parsedQty = parseFloat(quantityStr);
  const parsedPrice = parseFloat(priceStr);

  const isValidQty = !isNaN(parsedQty) && parsedQty > 0;
  const isValidPrice = !isNaN(parsedPrice) && parsedPrice > 0;
  const calculatedTotal = isValidQty && isValidPrice ? parsedQty * parsedPrice : 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidQty) {
      setErrorMsg('La cantidad debe ser mayor a cero.');
      return;
    }

    if (!isValidPrice) {
      priceRef.current?.focus();
      setErrorMsg('El precio unitario debe ser mayor a cero.');
      return;
    }

    onConfirm(parsedQty, parsedPrice);
    onClose();
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      priceRef.current?.focus();
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      onKeyDown={handleEscape}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: '#FFFFFF', // Crisp light background
            color: '#0F172A',
            border: '2px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <ShoppingBag size={26} color="#2563EB" />
        Producto Vario
      </DialogTitle>
      <Divider sx={{ borderColor: '#E2E8F0' }} />

      <DialogContent sx={{ pt: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5, fontWeight: 700 }}>
            {errorMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Header Note */}
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
              Venta Ocasional / Producto Vario
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, color: '#64748B' }}>
              No descuenta inventario ni genera movimiento de stock
            </Typography>
          </Box>

          {/* Quantity Field */}
          <TextField
            inputRef={quantityRef}
            fullWidth
            label="Cantidad"
            type="number"
            value={quantityStr}
            onChange={(e) => {
              setQuantityStr(e.target.value);
              setErrorMsg(null);
            }}
            onKeyDown={handleQuantityKeyDown}
            slotProps={{
              htmlInput: { min: '1' },
              input: {
                sx: { borderRadius: 3, fontSize: '1.25rem', fontWeight: 800, height: 52, bgcolor: '#FFFFFF', color: '#0F172A' },
              },
              inputLabel: {
                sx: { fontWeight: 700, color: '#475569' },
              },
            }}
          />

          {/* Unit Price Field */}
          <TextField
            inputRef={priceRef}
            fullWidth
            label="Precio Unitario ($)"
            type="number"
            value={priceStr}
            onChange={(e) => {
              setPriceStr(e.target.value);
              setErrorMsg(null);
            }}
            onKeyDown={handlePriceKeyDown}
            slotProps={{
              htmlInput: { step: '0.01', min: '0.01' },
              input: {
                startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#0F172A' }}>$</Typography></InputAdornment>,
                sx: { borderRadius: 3, fontSize: '1.3rem', fontWeight: 900, height: 52, bgcolor: '#FFFFFF', color: '#0F172A' },
              },
              inputLabel: {
                sx: { fontWeight: 700, color: '#475569' },
              },
            }}
          />

          {/* Calculated Total Display Box */}
          <Box sx={{ p: 2, bgcolor: '#EFF6FF', borderRadius: 3, border: '2px solid #BFDBFE', textAlign: 'center', mt: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL PRODUCTO VARIO:
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#1E3A8A', fontSize: '2.25rem', mt: 0.5 }}>
              ${calculatedTotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<X size={18} />}
          sx={{ borderRadius: 3, minHeight: 48, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1', px: 2.5 }}
        >
          Cancelar (ESC)
        </Button>
        <Button
          onClick={() => handleSubmit()}
          variant="contained"
          color="success"
          startIcon={<Plus size={20} />}
          sx={{ borderRadius: 3, minHeight: 48, px: 3.5, fontWeight: 900, fontSize: '1.05rem', bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
        >
          Agregar (ENTER)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
