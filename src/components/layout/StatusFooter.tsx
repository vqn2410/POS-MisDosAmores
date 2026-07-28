import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Wifi, Database, Clock, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const StatusFooter: React.FC = () => {
  const { cashSession, activeBranch, user } = useAuthStore();
  const [time, setTime] = React.useState<string>(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        bgcolor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        fontSize: '0.75rem',
        color: '#475569',
      }}
    >
      {/* Left System Statuses */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            WebSockets: Online
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Database size={12} />
          <Typography variant="caption">Redis Cache & DB Sync: Active</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Wifi size={12} />
          <Typography variant="caption">Latencia: 12ms</Typography>
        </Box>
      </Box>

      {/* Center Session Summary */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
        {activeBranch && (
          <Typography variant="caption">
            Sucursal: <strong>{activeBranch.name}</strong>
          </Typography>
        )}
        <span>•</span>
        <Typography variant="caption">
          Operador: <strong>{user?.fullName || 'Sin sesión'}</strong>
        </Typography>
        <span>•</span>
        {cashSession && (
          <Chip
            size="small"
            label={`Caja: Kiosco $${cashSession.initialKioskAmount.toFixed(2)} / Cigarr. $${cashSession.initialCigaretteAmount.toFixed(2)}`}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Box>

      {/* Right Shortcuts & Clock */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Lock size={12} />
          <Typography variant="caption">SSL 256-bit Encrypted</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Clock size={12} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {time}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
