import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { User as UserIcon, Lock, ShieldCheck } from 'lucide-react';
import { loginWithUsername } from '../services/firebaseAuthService';
import { useAuthStore } from '../../../store/useAuthStore';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const { setUser } = useAuthStore();
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Ingresá tu usuario y clave de acceso.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authenticatedUser = await loginWithUsername(username, password);
      setUser(authenticatedUser);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}>
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
          }}
        >
          <ShieldCheck size={28} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Ingreso al POS
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Ingresá tu usuario para comenzar
        </Typography>
      </DialogTitle>

      <DialogContent>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Usuario"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                passwordRef.current?.focus();
              }
            }}
            disabled={loading}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><UserIcon size={18} /></InputAdornment>,
                sx: { borderRadius: 2.5 },
              },
            }}
          />

          <TextField
            inputRef={passwordRef}
            fullWidth
            label="Clave de acceso"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Lock size={18} /></InputAdornment>,
                sx: { borderRadius: 2.5 },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !username || !password}
            sx={{ py: 1.5, mt: 1, borderRadius: 3, fontWeight: 800, fontSize: '1rem' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'INICIAR SESIÓN'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button size="small" color="inherit" onClick={onClose}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
