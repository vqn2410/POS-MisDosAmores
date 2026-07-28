import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  Typography,
  IconButton,
  Box,
  Divider,
} from '@mui/material';
import { RotateCcw, Trash2, Clock } from 'lucide-react';
import { usePOSStore } from '../store/usePOSStore';

interface POSSuspendedModalProps {
  open: boolean;
  onClose: () => void;
}

export const POSSuspendedModal: React.FC<POSSuspendedModalProps> = ({ open, onClose }) => {
  const { suspendedSales, restoreSale, removeSuspendedSale } = usePOSStore();

  const handleRestore = (id: string) => {
    restoreSale(id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock size={20} color="#F59E0B" />
        Ventas Pausadas / Retenidas
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ py: 2 }}>
        {suspendedSales.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay ventas suspendidas en este momento.
          </Typography>
        ) : (
          <List disablePadding>
            {suspendedSales.map((s) => {
              const totalItems = s.items.reduce((acc, item) => acc + item.quantity, 0);
              const totalAmount = s.items.reduce((acc, item) => acc + item.total, 0);

              return (
                <ListItem
                  key={s.id}
                  sx={{
                    mb: 1.5,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Cliente: {s.customer.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Pausada a las {s.savedAt} • {totalItems} productos
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>
                      Total: ${totalAmount.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<RotateCcw size={16} />}
                      onClick={() => handleRestore(s.id)}
                      sx={{ borderRadius: 2 }}
                    >
                      Recuperar
                    </Button>
                    <IconButton size="small" color="error" onClick={() => removeSuspendedSale(s.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
