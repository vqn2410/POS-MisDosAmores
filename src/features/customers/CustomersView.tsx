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
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Customer } from '../../types';
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers';
import { CustomerDrawerEditor } from './components/CustomerDrawerEditor';

export const CustomersView: React.FC = () => {
  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setSelectedCustomer(c);
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
            Directorio de Clientes & Creditos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administracion de clientes, limites de credito y volumen de compras acumulado
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={22} />} onClick={handleOpenCreate} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}>
          Nuevo Cliente
        </Button>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Nombre / Razon Social</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>RFC / CUIT</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Contacto / Email / Tel</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Limite de Credito</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Deuda Actual</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Total Compras</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} hover sx={{ minHeight: 64 }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{c.name}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.taxId || 'N/A'}</TableCell>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{c.email || 'N/A'}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.phone}</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>${c.creditLimit.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={`$${c.currentCredit.toFixed(2)}`}
                    color={c.currentCredit > 0 ? 'warning' : 'default'}
                    sx={{ fontWeight: 800 }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.1rem' }}>${c.totalPurchases.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar Cliente">
                    <IconButton size="large" onClick={() => handleOpenEdit(c)} sx={{ color: '#2563EB' }}>
                      <Edit2 size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Cliente">
                    <IconButton size="large" color="error" onClick={() => deleteCustomer.mutate(c.id)}>
                      <Trash2 size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <CustomerDrawerEditor customer={selectedCustomer} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </Box>
  );
};
