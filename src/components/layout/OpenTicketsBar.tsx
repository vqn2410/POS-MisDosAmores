import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Clock3, RotateCcw } from 'lucide-react';
import { usePOSStore } from '../../features/pos/store/usePOSStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export const OpenTicketsBar: React.FC = () => {
  const { suspendedSales, restoreSale } = usePOSStore();
  const { setActiveTab } = useWorkspaceStore();

  const handleRestore = (id: string) => {
    restoreSale(id);
    setActiveTab('pos');
  };

  return (
    <Box
      sx={{
        minHeight: 38,
        px: 0.75,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: '#D6D6D6',
        borderBottom: '1px solid #8A8A8A',
        overflowX: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.75, borderRight: '1px solid #A3A3A3', whiteSpace: 'nowrap' }}>
        <Clock3 size={16} color="#1E4EBC" />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, color: '#1C1C1C' }}>TICKETS ABIERTOS</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 700 }}>({suspendedSales.length})</Typography>
      </Box>

      {suspendedSales.length === 0 ? (
        <Typography sx={{ fontSize: '0.78rem', color: '#4B5563', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
          No hay tickets pendientes de cobro.
        </Typography>
      ) : (
        suspendedSales.map((sale, index) => {
          const total = sale.items.reduce((sum, item) => sum + item.total, 0);
          return (
            <Button
              key={sale.id}
              size="small"
              variant="outlined"
              startIcon={<RotateCcw size={14} />}
              onClick={() => handleRestore(sale.id)}
              sx={{
                minWidth: 0,
                height: 28,
                px: 1,
                borderRadius: 0.5,
                bgcolor: '#FFFFFF',
                borderColor: '#2F66D0',
                color: '#1C1C1C',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#E7F2FF' },
              }}
            >
              Ticket {index + 1} · {sale.customer.name} · ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Button>
          );
        })
      )}
    </Box>
  );
};
