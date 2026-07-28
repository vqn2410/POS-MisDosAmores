import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { X as CloseIcon, Save, User as UserIcon, KeyRound } from 'lucide-react';
import type { User, RoleType } from '../../../types';
import { useUpdateUser } from '../../../hooks/useUsers';
import { useQueryClient } from '@tanstack/react-query';
import { createFirebaseUser } from '../../auth/services/firebaseAuthService';
import { useNotificationStore } from '../../../store/useNotificationStore';

interface UserDrawerEditorProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const inputSlotProps = {
  htmlInput: {
    style: { color: '#0F172A', fontWeight: 800 },
  },
  sx: {
    borderRadius: 2.5,
    bgcolor: '#F8FAFC',
    color: '#0F172A',
    fontWeight: 800,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94A3B8' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563EB', borderWidth: 2 },
  },
};

const labelSlotProps = {
  sx: {
    color: '#475569',
    fontWeight: 800,
    '&.Mui-focused': { color: '#2563EB' },
  },
};

const ROLES: { value: RoleType; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CASHIER', label: 'Cajero' },
  { value: 'INVENTORY_CLERK', label: 'Almacenero' },
];

export const UserDrawerEditor: React.FC<UserDrawerEditorProps> = ({ user, open, onClose }) => {
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [formData, setFormData] = React.useState<Partial<User>>({});
  const [password, setPassword] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({
        username: '',
        email: '',
        fullName: '',
        role: 'CASHIER',
        branchId: '',
        is2FAEnabled: false,
        isActive: true,
      });
      setPassword('');
    }
    setCreateError(null);
  }, [user, open]);

  const handleChange = (field: keyof User, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prepared: Omit<User, 'id'> = {
      username: formData.username?.trim() || '',
      email: formData.email?.trim() || '',
      fullName: formData.fullName?.trim() || 'Usuario Sin Nombre',
      role: (formData.role as RoleType) || 'CASHIER',
      branchId: formData.branchId?.trim() || '',
      avatarUrl: formData.avatarUrl?.trim() || '',
      is2FAEnabled: formData.is2FAEnabled ?? false,
      isActive: formData.isActive ?? true,
    };
    if (user?.id) {
      updateUser.mutate({ id: user.id, data: prepared }, { onSuccess: onClose });
    } else {
      if (!password) {
        setCreateError('Debe ingresar una contraseña para el nuevo usuario.');
        return;
      }
      setCreating(true);
      setCreateError(null);
      try {
        await createFirebaseUser(prepared, password);
        queryClient.invalidateQueries({ queryKey: ['users'] });
        addNotification({
          title: 'Usuario Creado',
          message: `Se creó la cuenta Firebase Auth para "${prepared.username}". Ahora has iniciado sesión como el nuevo usuario.`,
          type: 'success',
        });
        setCreating(false);
        onClose();
      } catch (err: any) {
        setCreating(false);
        setCreateError(err.message || 'Error al crear el usuario en Firebase Auth.');
      }
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 600 },
            bgcolor: '#FFFFFF',
            color: '#0F172A',
            p: 0,
          },
        },
      }}
    >
      <Box sx={{ p: 2.5, bgcolor: '#2563EB', color: '#FFFFFF', borderBottom: '3px solid #1D4ED8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF' }}>
          {user ? `Editar Usuario: ${user.fullName}` : 'Crear Nuevo Usuario'}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#FFFFFF' }}>
          <CloseIcon size={20} />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {createError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{createError}</Alert>
        )}
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserIcon size={20} /> Información del Usuario
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Nombre Completo *"
                placeholder="Ej. Juan Pérez"
                value={formData.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Nombre de Usuario"
                placeholder="Ej. juan.perez"
                value={formData.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            {!user && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth size="small" label="Contraseña *"
                  type="password"
                  placeholder="Contraseña para Firebase Auth"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    input: { ...inputSlotProps, startAdornment: <KeyRound size={18} style={{ marginRight: 8, color: '#94A3B8' }} /> },
                    inputLabel: labelSlotProps,
                  }}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Correo Electrónico"
                placeholder="Se usará {usuario}@pos.local si se deja vacío"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
                helperText={!formData.email ? `Se usará: ${formData.username || '{usuario}'}@pos.local` : ''}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select fullWidth size="small" label="Rol RBAC"
                value={formData.role || 'CASHIER'}
                onChange={(e) => handleChange('role', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value} sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Sucursal (ID)"
                placeholder="Ej. branch-01"
                value={formData.branchId || ''}
                onChange={(e) => handleChange('branchId', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControlLabel
                control={<Switch checked={formData.isActive ?? true} onChange={(e) => handleChange('isActive', e.target.checked)} color="primary" />}
                label={<Typography sx={{ fontWeight: 800, color: '#0F172A' }}>Cuenta Activa</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControlLabel
                control={<Switch checked={formData.is2FAEnabled ?? false} onChange={(e) => handleChange('is2FAEnabled', e.target.checked)} color="primary" />}
                label={<Typography sx={{ fontWeight: 800, color: '#0F172A' }}>2FA Habilitado</Typography>}
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, px: 3, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
          Cancelar
        </Button>
        <Button onClick={() => handleSubmit()} variant="contained" disabled={creating} startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />} sx={{ borderRadius: 3, px: 4, fontWeight: 900, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}>
          {creating ? 'Creando...' : 'Guardar Cambios'}
        </Button>
      </Box>
    </Drawer>
  );
};
