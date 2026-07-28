import React from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Paper,
} from '@mui/material';
import { X, Zap, RefreshCw, Scan, ArrowRight } from 'lucide-react';
import { BarcodeScannerService } from '../services/BarcodeScannerService';

interface CameraScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  open,
  onClose,
  onDetected,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerService = React.useMemo(() => new BarcodeScannerService(), []);

  const [manualCode, setManualCode] = React.useState('');
  const [flashlightActive, setFlashlightActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && videoRef.current) {
      setCameraError(null);
      scannerService.startScanner(videoRef.current, {
        onDetected: (code) => {
          onDetected(code);
        },
        onError: () => {
          setCameraError('No se pudo acceder a la cámara trasera. Ingrese el código manualmente.');
        },
      });
    }

    return () => {
      scannerService.stopScanner();
    };
  }, [open, onDetected, scannerService]);

  const handleToggleFlashlight = async () => {
    const nextState = !flashlightActive;
    const success = await scannerService.toggleFlashlight(nextState);
    if (success) {
      setFlashlightActive(nextState);
    }
  };

  const handleSwitchCamera = async () => {
    if (videoRef.current) {
      await scannerService.switchCamera(videoRef.current, {
        onDetected: (code) => onDetected(code),
      });
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed) {
      onDetected(trimmed);
      setManualCode('');
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={onClose} slotProps={{ paper: { sx: { bgcolor: '#000000', color: '#FFFFFF' } } }}>
      <Box sx={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Video Camera Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Top Floating Controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <Paper elevation={3} sx={{ px: 2, py: 1, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Scan size={18} color="#3B82F6" /> Escáner Activo
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleToggleFlashlight} sx={{ bgcolor: 'rgba(15, 23, 42, 0.85)', color: flashlightActive ? '#F59E0B' : '#FFFFFF', p: 1.25 }}>
              <Zap size={22} />
            </IconButton>
            <IconButton onClick={handleSwitchCamera} sx={{ bgcolor: 'rgba(15, 23, 42, 0.85)', color: '#FFFFFF', p: 1.25 }}>
              <RefreshCw size={22} />
            </IconButton>
            <IconButton onClick={onClose} sx={{ bgcolor: 'rgba(220, 38, 38, 0.9)', color: '#FFFFFF', p: 1.25 }}>
              <X size={22} />
            </IconButton>
          </Box>
        </Box>

        {/* Central Reading Target Frame */}
        <Box
          sx={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280,
            height: 200,
            borderRadius: 4,
            border: '3px solid #3B82F6',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.6)', px: 2, py: 0.5, borderRadius: 2 }}>
            Alinee el código dentro del recuadro
          </Typography>
        </Box>

        {cameraError && (
          <Box sx={{ position: 'absolute', top: 90, left: 16, right: 16, zIndex: 12 }}>
            <Paper sx={{ p: 2, bgcolor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{cameraError}</Typography>
            </Paper>
          </Box>
        )}

        {/* Bottom Manual Entry Input Box */}
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2.5,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            zIndex: 10,
          }}
        >
          <Box component="form" onSubmit={handleManualSubmit} sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ingresar código manualmente o expresión (ej. 2x2000)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              slotProps={{
                input: {
                  sx: { borderRadius: 3, bgcolor: '#FFFFFF', color: '#0F172A', height: 48, fontWeight: 700 },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ borderRadius: 3, minWidth: 54, height: 48, bgcolor: '#2563EB' }}
            >
              <ArrowRight size={22} />
            </Button>
          </Box>
        </Paper>
      </Box>
    </Dialog>
  );
};
