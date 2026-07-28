import React from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from '@mui/material';
import { Trash2, CheckCircle2 } from 'lucide-react';
import type { PurchaseItem } from '../../types';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';

const STEPS = ['1. Seleccionar Proveedor', '2. Agregar Productos', '3. Resumen de Compra', '4. Confirmar & Recibir'];

export const PurchasesView: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();

  // Wizard State — safe defaults when no data is loaded yet
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>('');
  const [invoiceNo, setInvoiceNo] = React.useState('');
  const [items] = React.useState<PurchaseItem[]>(
    products.length > 0
      ? [
          {
            productId: products[0].id,
            productName: products[0].name,
            sku: products[0].sku,
            quantity: 10,
            costPrice: products[0].costPrice,
            total: 10 * products[0].costPrice,
          },
        ]
      : []
  );

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const grandTotal = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', mb: 1 }}>
        🛒 Wizard de Órdenes de Compra
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Ingreso asistido de mercadería a almacén en 4 pasos
      </Typography>

      {/* Stepper */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Stepper activeStep={activeStep}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel slotProps={{ label: { sx: { fontSize: '1rem', fontWeight: 700 } } }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Contents */}
      <Paper elevation={1} sx={{ p: 4, borderRadius: 4, minHeight: 380, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        {/* Step 1: Supplier */}
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Seleccionar Proveedor"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              >
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    🚚 {s.name} ({s.taxId})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Número de Factura / Remisión del Proveedor"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}
              />
            </Grid>
          </Grid>
        )}

        {/* Step 2: Add Products */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Productos a Ingresar:
            </Typography>
            <Table sx={{ mb: 2 }}>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Producto / SKU</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Cantidad</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Costo Unitario ($)</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Total ($)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Eliminar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx} hover sx={{ minHeight: 60 }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{item.productName}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{item.quantity}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>${item.costPrice.toFixed(2)}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.1rem' }}>${item.total.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" size="large">
                        <Trash2 size={20} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Step 3: Summary */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
              Resumen Previo a Confirmar
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>Proveedor: <strong>{selectedSupplier?.name}</strong></Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>Factura: <strong>{invoiceNo}</strong></Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#2563EB', mt: 2 }}>
              Total de la Orden: ${grandTotal.toFixed(2)}
            </Typography>
          </Box>
        )}

        {/* Step 4: Confirm */}
        {activeStep === 3 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle2 size={64} color="#16A34A" style={{ margin: '0 auto 16px' }} />
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#0F172A' }}>
              ¡Orden de Compra Confirmada!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              El stock ha sido abonado automáticamente al Kardex del inventario.
            </Typography>
          </Box>
        )}

        {/* Stepper Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '2px solid', borderColor: '#E2E8F0' }}>
          <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 700 }}>
            Anterior
          </Button>

          {activeStep < STEPS.length - 1 ? (
            <Button variant="contained" onClick={handleNext} sx={{ borderRadius: 3, minHeight: 48, px: 4, fontWeight: 800, fontSize: '1.05rem' }}>
              Siguiente Paso
            </Button>
          ) : (
            <Button variant="contained" color="success" onClick={() => setActiveStep(0)} sx={{ borderRadius: 3, minHeight: 48, px: 4, fontWeight: 900, fontSize: '1.1rem' }}>
              Finalizar Wizard
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
