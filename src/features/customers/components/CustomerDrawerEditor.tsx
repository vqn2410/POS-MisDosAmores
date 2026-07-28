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
import { X as CloseIcon, Save, User, DollarSign } from 'lucide-react';
import type { Customer } from '../../../types';
import { useCreateCustomer, useUpdateCustomer } from '../../../hooks/useCustomers';

interface CustomerDrawerEditorProps {
  customer: Customer | null;
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

export const CustomerDrawerEditor: React.FC<CustomerDrawerEditorProps> = ({ customer, open, onClose }) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [formData, setFormData] = React.useState<Partial<Customer>>({});

  React.useEffect(() => {
    if (customer) {
      setFormData(customer);
    } else {
      setFormData({
        taxId: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        creditLimit: 0,
        currentCredit: 0,
        totalPurchases: 0,
      });
    }
  }, [customer, open]);

  const handleChange = (field: keyof Customer, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prepared: Omit<Customer, 'id'> = {
      taxId: formData.taxId?.trim() || '',
      name: formData.name?.trim() || 'Cliente Sin Nombre',
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      address: formData.address?.trim() || '',
      creditLimit: Number(formData.creditLimit) || 0,
      currentCredit: customer ? Number(formData.currentCredit) || 0 : 0,
      createdAt: customer?.createdAt || new Date().toISOString(),
      totalPurchases: customer ? Number(formData.totalPurchases) || 0 : 0,
    };
    if (customer?.id) {
      updateCustomer.mutate({ id: customer.id, data: prepared }, { onSuccess: onClose });
    } else {
      createCustomer.mutate(prepared as Omit<Customer, 'id'>, { onSuccess: onClose });
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
          {customer ? `Editar Cliente: ${customer.name}` : 'Crear Nuevo Cliente'}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#FFFFFF' }}>
          <CloseIcon size={20} />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <User size={20} /> Información del Cliente
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Nombre / Razón Social *"
                placeholder="Ej. Carlos Mendoza"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="RFC / CUIT"
                placeholder="Ej. MENA-850101-XXX"
                value={formData.taxId || ''}
                onChange={(e) => handleChange('taxId', e.target.value)}
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
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" label="Correo Electrónico"
                placeholder="Ej. cliente@ejemplo.com"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Dirección"
                placeholder="Ej. Calle #456, Col. Centro"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#D97706', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DollarSign size={20} /> Límite de Crédito
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth size="small" type="number" label="Límite de Crédito ($)"
                placeholder="0.00"
                value={formData.creditLimit ?? ''}
                onChange={(e) => handleChange('creditLimit', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            {customer && (
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth size="small" type="number" label="Deuda Actual ($)"
                  placeholder="0.00"
                  value={formData.currentCredit ?? ''}
                  onChange={(e) => handleChange('currentCredit', e.target.value)}
                  slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
                />
              </Grid>
            )}
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
