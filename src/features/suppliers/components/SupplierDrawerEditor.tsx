import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  Paper,
} from '@mui/material';
import { X as CloseIcon, Save, Building2 } from 'lucide-react';
import type { Supplier } from '../../../types';
import { useCreateSupplier, useUpdateSupplier } from '../../../hooks/useSuppliers';

interface SupplierDrawerEditorProps {
  supplier: Supplier | null;
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

export const SupplierDrawerEditor: React.FC<SupplierDrawerEditorProps> = ({ supplier, open, onClose }) => {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const [formData, setFormData] = React.useState<Partial<Supplier>>({});

  React.useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({
        taxId: '',
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        productCount: 0,
      });
    }
  }, [supplier, open]);

  const handleChange = (field: keyof Supplier, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prepared: Omit<Supplier, 'id'> = {
      taxId: formData.taxId?.trim() || '',
      name: formData.name?.trim() || 'Proveedor Sin Nombre',
      contactName: formData.contactName?.trim() || '',
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      address: formData.address?.trim() || '',
      productCount: Number(formData.productCount) || 0,
    };
    if (supplier?.id) {
      updateSupplier.mutate({ id: supplier.id, data: prepared }, { onSuccess: onClose });
    } else {
      createSupplier.mutate(prepared as Omit<Supplier, 'id'>, { onSuccess: onClose });
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
          {supplier ? `Editar Proveedor: ${supplier.name}` : 'Crear Nuevo Proveedor'}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#FFFFFF' }}>
          <CloseIcon size={20} />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Building2 size={20} /> Información del Proveedor
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Razón Social / Empresa *"
                placeholder="Ej. Distribuidora del Norte SA"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="RFC / CUIT"
                placeholder="Ej. DIST-850101-XXX"
                value={formData.taxId || ''}
                onChange={(e) => handleChange('taxId', e.target.value)}
                slotProps={{ input: { ...inputSlotProps, startAdornment: null }, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Contacto Principal"
                placeholder="Ej. Juan Pérez"
                value={formData.contactName || ''}
                onChange={(e) => handleChange('contactName', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Teléfono"
                placeholder="Ej. 55 1234 5678"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Correo Electrónico"
                placeholder="Ej. contacto@distribuidora.com"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Dirección de Almacén"
                placeholder="Ej. Av. Principal #123, Col. Centro"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, px: 3, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
          Cancelar
        </Button>
        <Button onClick={() => handleSubmit()} variant="contained" startIcon={<Save size={18} />} sx={{ borderRadius: 3, px: 4, fontWeight: 900, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}>
          Guardar Cambios
        </Button>
      </Box>
    </Drawer>
  );
};
