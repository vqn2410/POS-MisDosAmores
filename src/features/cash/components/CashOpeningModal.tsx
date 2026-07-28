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
} from '@mui/material';
import { Wallet } from 'lucide-react';

interface CashOpeningModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (kioskAmount: number, cigaretteAmount: number) => void;
  isPending: boolean;
}

export const CashOpeningModal: React.FC<CashOpeningModalProps> = ({ open, onClose, onConfirm, isPending }) => {
  const [kiosk, setKiosk] = React.useState('');
  const [cigarettes, setCigarettes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setKiosk('');
      setCigarettes('');
    }
  }, [open]);

  const kioskNum = parseFloat(kiosk) || 0;
  const cigNum = parseFloat(cigarettes) || 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Wallet size={24} color="#2563EB" /> Apertura de Caja
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', mb: 3 }}>
          Ingresa el dinero inicial de cada caja antes de comenzar a operar.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            autoFocus
            fullWidth
            label="Caja Kiosco ($)"
            type="number"
            value={kiosk}
            onChange={(e) => setKiosk(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.1rem', color: '#0F172A' }}>$</Typography>,
                sx: { borderRadius: 2.5, fontSize: '1.2rem', fontWeight: 900, height: 52 },
              },
            }}
          />
          <TextField
            fullWidth
            label="Caja Cigarrillos ($)"
            type="number"
            value={cigarettes}
            onChange={(e) => setCigarettes(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.1rem', color: '#0F172A' }}>$</Typography>,
                sx: { borderRadius: 2.5, fontSize: '1.2rem', fontWeight: 900, height: 52 },
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, fontWeight: 800 }}>
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirm(kioskNum, cigNum)}
          variant="contained"
          disabled={isPending}
          sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}
        >
          {isPending ? 'Abriendo...' : 'Abrir Caja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
