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
import { useUsers } from '../../../hooks/useUsers';

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
  const { data: users = [] } = useUsers();
  const activeUsers = users.filter((user) => user.isActive !== false);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Seleccioná un usuario e ingresá su clave de acceso.');
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
              onChange={(event) => {
                setUsername(event.target.value);
                setPassword('');
                setErrorMessage(null);
                setTimeout(() => passwordRef.current?.focus(), 50);
              }}
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

          {username && (
            <TextField
              inputRef={passwordRef}
              autoFocus
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
          )}

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
