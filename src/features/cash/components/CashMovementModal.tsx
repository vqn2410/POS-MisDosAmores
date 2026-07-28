import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
} from '@mui/material';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface CashMovementModalProps {
  open: boolean;
  type: 'INCOME' | 'WITHDRAWAL';
  onClose: () => void;
  onConfirm: (amount: number, reason: string) => void;
  isPending: boolean;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({ open, type, onClose, onConfirm, isPending }) => {
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
    }
  }, [open]);

  const isIncome = type === 'INCOME';
  const title = isIncome ? 'Ingreso a Caja' : 'Retiro de Efectivo';
  const icon = isIncome ? <ArrowDownCircle size={24} color="#2563EB" /> : <ArrowUpCircle size={24} color="#D97706" />;
  const color = isIncome ? '#2563EB' : '#D97706';

  const reasonOptions = isIncome
    ? ['Pago de proveedor', 'Devolución de cliente', 'Préstamo', 'Otro']
    : ['Pago a proveedor', 'Gasto operativo', 'Compra de mercadería', 'Pago de servicios', 'Otro'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon} {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', mb: 3 }}>
          {isIncome
            ? 'Registra un ingreso de dinero adicional a la caja.'
            : 'Registra un retiro de efectivo de la caja.'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            autoFocus
            fullWidth
            label="Monto ($)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.1rem', color }}>$</Typography>,
                sx: { borderRadius: 2.5, fontSize: '1.2rem', fontWeight: 900, height: 52 },
              },
            }}
          />
          <TextField
            select
            fullWidth
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            slotProps={{
              input: {
                sx: { borderRadius: 2.5, fontWeight: 700, height: 52 },
              },
            }}
          >
            {reasonOptions.map((opt) => (
              <MenuItem key={opt} value={opt} sx={{ fontWeight: 700 }}>{opt}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, fontWeight: 800 }}>
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirm(parseFloat(amount) || 0, reason)}
          variant="contained"
          color={isIncome ? 'primary' : 'warning'}
          disabled={isPending || !amount || parseFloat(amount) <= 0 || !reason}
          sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}
        >
          {isPending ? 'Guardando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
