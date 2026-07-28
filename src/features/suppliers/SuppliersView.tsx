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
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Supplier } from '../../types';
import { useSuppliers, useDeleteSupplier } from '../../hooks/useSuppliers';
import { SupplierDrawerEditor } from './components/SupplierDrawerEditor';

export const SuppliersView: React.FC = () => {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setSelectedSupplier(s);
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
            Catalogo de Proveedores
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Registro de distribuidores, ejecutivos de cuenta y surtido de almacen
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={22} />} onClick={handleOpenCreate} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}>
          Nuevo Proveedor
        </Button>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Razon Social / Empresa</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>RFC / CUIT</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Contacto Principal</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Telefono / Email</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Direccion Almacen</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Catalogo Surtido</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id} hover sx={{ minHeight: 64 }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{s.name}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.taxId}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{s.contactName}</TableCell>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{s.email}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.phone}</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{s.address}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>{s.productCount} productos</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar Proveedor">
                    <IconButton size="large" onClick={() => handleOpenEdit(s)} sx={{ color: '#2563EB' }}>
                      <Edit2 size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Proveedor">
                    <IconButton size="large" color="error" onClick={() => deleteSupplier.mutate(s.id)}>
                      <Trash2 size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <SupplierDrawerEditor supplier={selectedSupplier} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </Box>
  );
};
