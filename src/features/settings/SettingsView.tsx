import React from 'react';
import { Box, Paper, Typography, Button, Grid, TextField, Divider, MenuItem, CircularProgress } from '@mui/material';
import { Save, Building, Globe } from 'lucide-react';
import { useCompany, useUpdateCompany } from '../../hooks/useCompany';

export const SettingsView: React.FC = () => {
  const { data: companyData, isLoading } = useCompany();
  const updateCompany = useUpdateCompany();
  const [company, setCompany] = React.useState(companyData || null);

  React.useEffect(() => {
    if (companyData) setCompany(companyData);
  }, [companyData]);

  const handleSave = () => {
    if (!company?.id) return;
    updateCompany.mutate({
      id: company.id,
      data: {
        name: company.name,
        taxId: company.taxId,
        address: company.address,
        phone: company.phone,
        email: company.email,
        currencySymbol: company.currencySymbol,
        currencyCode: company.currencyCode,
      },
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!company) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">No se encontró configuración de empresa. Ejecuta el seed primero.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            ⚙️ Configuración Global de la Empresa
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Datos fiscales, sucursales, moneda principal e impresoras de tickets
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Save size={22} />} onClick={handleSave} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}>
          💾 Guardar Cambios
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Company Data */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, bgcolor: '#FFFFFF', border: '2px solid #E2E8F0' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Building size={26} color="#2563EB" /> Datos de la Empresa
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Nombre o Razón Social"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              />

              <TextField
                fullWidth
                label="RFC / CUIT / Identificación Fiscal"
                value={company.taxId}
                onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              />

              <TextField
                fullWidth
                label="Dirección Fiscal Completa"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Teléfono de Contacto"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Correo Electrónico"
                    value={company.email}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Currency & Regional Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, bgcolor: '#FFFFFF', border: '2px solid #E2E8F0' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Globe size={26} color="#16A34A" /> Moneda & Ajustes Regionales
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                select
                fullWidth
                label="Moneda Base"
                value={company.currencyCode}
                onChange={(e) => setCompany({ ...company, currencyCode: e.target.value })}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              >
                <MenuItem value="USD">USD ($) - Dólar Estadounidense</MenuItem>
                <MenuItem value="ARS">ARS ($) - Peso Argentino</MenuItem>
                <MenuItem value="MXN">MXN ($) - Peso Mexicano</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Símbolo Moneda"
                value={company.currencySymbol}
                onChange={(e) => setCompany({ ...company, currencySymbol: e.target.value })}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              />

              <TextField
                select
                fullWidth
                label="Zona Horaria Predeterminada"
                defaultValue="America/Mexico_City"
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              >
                <MenuItem value="America/Mexico_City">America/Mexico_City (GMT-6)</MenuItem>
                <MenuItem value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (GMT-3)</MenuItem>
              </TextField>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
