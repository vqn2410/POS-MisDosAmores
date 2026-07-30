import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { User as UserIcon, ShieldCheck } from 'lucide-react';
import { loginWithUsername } from '../services/firebaseAuthService';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUsers } from '../../../hooks/useUsers';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [username, setUsername] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const { setUser } = useAuthStore();
  const { data: users = [] } = useUsers();
  const activeUsers = users.filter((user) => user.isActive);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Seleccioná un usuario para ingresar.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authenticatedUser = await loginWithUsername(username);
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
          Seleccioná tu usuario para comenzar
        </Typography>
      </DialogTitle>

      <DialogContent>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth autoFocus>
            <InputLabel id="pos-user-label">Usuario</InputLabel>
            <Select
              labelId="pos-user-label"
              label="Usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              startAdornment={<UserIcon size={18} style={{ marginLeft: 12, marginRight: 8 }} />}
              sx={{ borderRadius: 2.5 }}
            >
              {activeUsers.map((user) => (
                <MenuItem key={user.id} value={user.username}>
                  {user.fullName || user.username} ({user.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {activeUsers.length === 0 && (
            <Alert severity="warning">No hay usuarios activos disponibles.</Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !username}
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
