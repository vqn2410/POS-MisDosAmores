import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Camera, CreditCard, ShoppingBag, ArrowLeft } from 'lucide-react';
import { usePOSStore } from '../store/usePOSStore';
import { BarcodeScannerService } from '../../scanner/services/BarcodeScannerService';

interface QuickSaleViewProps {
  onBack: () => void;
}

export const QuickSaleView: React.FC<QuickSaleViewProps> = ({ onBack }) => {
  const { cart, openPaymentModal } = usePOSStore();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerService = React.useMemo(() => new BarcodeScannerService(), []);

  const lastItem = cart[cart.length - 1];
  const grandTotal = cart.reduce((acc, i) => acc + i.total, 0);
  const totalItems = cart.reduce((acc, i) => acc + (i.saleType === 'WEIGHT' ? 1 : i.quantity), 0);

  React.useEffect(() => {
    if (videoRef.current) {
      scannerService.startScanner(videoRef.current, {
        onDetected: () => {},
      });
    }
    return () => {
      scannerService.stopScanner();
    };
  }, [scannerService]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 128px)', bgcolor: '#000000', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(15, 23, 42, 0.9)', color: '#FFFFFF', zIndex: 10 }}>
        <Button onClick={onBack} startIcon={<ArrowLeft size={20} />} sx={{ color: '#FFFFFF', fontWeight: 800 }}>
          Volver
        </Button>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Camera size={20} color="#3B82F6" /> Venta Rápida Móvil
        </Typography>
      </Box>

      {/* Video Scanner Overlay Stream */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Box
          sx={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 260,
            height: 180,
            borderRadius: 4,
            border: '3px solid #3B82F6',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      </Box>

      {/* Bottom Floating Quick Summary */}
      <Paper elevation={4} sx={{ p: 2.5, bgcolor: '#FFFFFF', color: '#0F172A', borderRadius: '20px 20px 0 0', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1.5, zIndex: 10 }}>
        {lastItem ? (
          <Box sx={{ p: 1.5, bgcolor: '#F0F9FF', borderRadius: 3, border: '1px solid #BAE6FD' }}>
            <Typography variant="caption" sx={{ color: '#0284C7', fontWeight: 800 }}>
              Último producto agregado:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
              {lastItem.product.name} ({lastItem.quantity} × ${lastItem.unitPrice.toLocaleString()})
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', fontWeight: 700 }}>
            Alinee el código de barras frente a la cámara
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>
              {totalItems} artículos en ticket
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#3B82F6', lineHeight: 1 }}>
              ${grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={onBack} startIcon={<ShoppingBag size={18} />} sx={{ borderRadius: 3, height: 48, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
              Ver Ticket
            </Button>
            <Button variant="contained" disabled={cart.length === 0} onClick={openPaymentModal} startIcon={<CreditCard size={20} />} sx={{ borderRadius: 3, height: 48, px: 3, fontWeight: 900, bgcolor: '#2563EB' }}>
              Cobrar
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
