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
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { loginWithUsername } from '../services/firebaseAuthService';
import { useAuthStore } from '../../../store/useAuthStore';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Query Firestore for username -> 2. Check active -> 3. Firebase Auth via email
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
          Autenticación Firebase
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Inicia sesión con tu Nombre de Usuario
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
            placeholder="ej: admin, cajero1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <UserIcon size={18} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5 },
              },
            }}
          />

          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={18} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5 },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
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
