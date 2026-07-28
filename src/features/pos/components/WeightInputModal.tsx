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
import { Scale, Plus, X } from 'lucide-react';
import type { Product } from '../../../types';

interface WeightInputModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (product: Product, weightKg: number) => void;
}

export const WeightInputModal: React.FC<WeightInputModalProps> = ({
  product,
  open,
  onClose,
  onConfirm,
}) => {
  const [weightStr, setWeightStr] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setWeightStr('');
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!product) return null;

  const parsedWeight = parseFloat(weightStr);
  const isValidWeight = !isNaN(parsedWeight) && parsedWeight > 0;
  const calculatedSubtotal = isValidWeight ? product.salePrice * parsedWeight : 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidWeight) {
      setErrorMsg('Por favor ingrese un peso mayor a cero (ej. 0.350, 1.250 Kg).');
      return;
    }

    onConfirm(product, parsedWeight);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      onKeyDown={handleKeyDown}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: '#FFFFFF',
            color: '#0F172A',
            border: '2px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <Scale size={26} color="#2563EB" />
        Ingresar Peso (Kg)
      </DialogTitle>
      <Divider sx={{ borderColor: '#E2E8F0' }} />

      <DialogContent sx={{ pt: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5, fontWeight: 700 }}>
            {errorMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Product Header Info */}
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
              {product.name}
            </Typography>
            <Typography variant="body1" color="primary.main" sx={{ fontWeight: 800, mt: 0.5, color: '#2563EB' }}>
              Precio: ${product.salePrice.toLocaleString()} / Kg
            </Typography>
          </Box>

          {/* Weight Numeric Input */}
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Peso en Kilogramos"
            type="number"
            value={weightStr}
            onChange={(e) => {
              setWeightStr(e.target.value);
              setErrorMsg(null);
            }}
            slotProps={{
              htmlInput: { step: '0.001', min: '0.001' },
              input: {
                endAdornment: <InputAdornment position="end"><Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#0F172A' }}>Kg</Typography></InputAdornment>,
                sx: { borderRadius: 3, fontSize: '1.4rem', fontWeight: 900, height: 56, bgcolor: '#FFFFFF', color: '#0F172A' },
              },
              inputLabel: {
                sx: { fontWeight: 700, color: '#475569' },
              },
            }}
          />

          {/* Quick Preset Weight Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[0.100, 0.250, 0.500, 0.750, 1.000, 1.500].map((preset) => (
              <Button
                key={preset}
                size="small"
                variant="outlined"
                onClick={() => setWeightStr(preset.toString())}
                sx={{ borderRadius: 2, fontWeight: 800, minHeight: 36, borderColor: '#CBD5E1', color: '#334155' }}
              >
                {preset >= 1 ? `${preset} Kg` : `${preset * 1000}g`}
              </Button>
            ))}
          </Box>

          {/* Calculated Subtotal Display */}
          <Box sx={{ p: 2, bgcolor: '#EFF6FF', borderRadius: 3, border: '2px solid #BFDBFE', textAlign: 'center', mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subtotal Calculado:
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#1E3A8A', fontSize: '2.25rem', mt: 0.5 }}>
              ${calculatedSubtotal.toFixed(2)}
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
