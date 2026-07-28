import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Plus, Edit2, Trash2, Shield, Lock } from 'lucide-react';
import type { User } from '../../types';
import { useUsers, useDeleteUser } from '../../hooks/useUsers';
import { UserDrawerEditor } from './components/UserDrawerEditor';

export const UsersView: React.FC = () => {
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setIsDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            Usuarios, Roles & Control de Acceso (RBAC)
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administracion de credenciales Firebase Auth, permisos por rol e indicadores 2FA
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={22} />} onClick={handleOpenCreate} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}>
          Nuevo Usuario
        </Button>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Usuario (Username)</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Email Firebase</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Rol RBAC</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado 2FA</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado Cuenta</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover sx={{ minHeight: 64 }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{u.fullName}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{u.username}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{u.email}</TableCell>
                <TableCell>
                  <Chip icon={<Shield size={16} />} label={u.role} color="primary" size="medium" sx={{ fontWeight: 800 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<Lock size={14} />}
                    label={u.is2FAEnabled ? '2FA Activo' : 'Sin 2FA'}
                    color={u.is2FAEnabled ? 'success' : 'default'}
                    size="medium"
                    sx={{ fontWeight: 800 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={u.isActive ? 'Activo' : 'Inactivo'} color={u.isActive ? 'success' : 'error'} size="medium" variant="outlined" sx={{ fontWeight: 800 }} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar Usuario">
                    <IconButton size="large" onClick={() => handleOpenEdit(u)} sx={{ color: '#2563EB' }}>
                      <Edit2 size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Usuario">
                    <IconButton size="large" color="error" onClick={() => deleteUser.mutate(u.id)}>
                      <Trash2 size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <UserDrawerEditor user={selectedUser} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </Box>
  );
};
