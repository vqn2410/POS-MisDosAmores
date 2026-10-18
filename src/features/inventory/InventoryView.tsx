import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Pagination,
} from '@mui/material';
import { Boxes, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { KardexMovement, InventoryMovementType } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { useKardexMovements, useCreateKardexMovement } from '../../hooks/useKardex';
import { useAuthStore } from '../../store/useAuthStore';

const PAGE_SIZE = 50;

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

export const InventoryView: React.FC = () => {
  const { data: movements = [], isLoading: movementsLoading } = useKardexMovements();
  const { data: products = [] } = useProducts();
  const createKardex = useCreateKardexMovement();
  const { user, activeBranch } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [selectedProductId, setSelectedProductId] = React.useState<string>('');
  const [movementType, setMovementType] = React.useState<InventoryMovementType>('IN_ADJUSTMENT');
  const [quantity, setQuantity] = React.useState<number>(10);
  const [notes, setNotes] = React.useState<string>('Ajuste de inventario en almacen principal');

  const handleRegisterMovement = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newMov: Omit<KardexMovement, 'id'> = {
      productId: prod.id,
      productName: prod.name,
      productSku: prod.sku,
      branchId: activeBranch?.id || 'br-01',
      branchName: activeBranch?.name || 'Sucursal Principal',
      type: movementType,
      quantity,
      previousStock: prod.stock,
      newStock: movementType.startsWith('IN') ? prod.stock + quantity : prod.stock - quantity,
      unitCost: prod.costPrice,
      reference: `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      notes,
      createdAt: new Date().toISOString(),
      userName: user?.fullName || 'Sistema',
    };

    createKardex.mutate(newMov, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedProductId('');
        setQuantity(10);
        setNotes('Ajuste de inventario en almacen principal');
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedMovements = movements.slice(pageStart, pageStart + PAGE_SIZE);

  if (movementsLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            Kardex & Control de Inventario
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Trazabilidad completa de entradas, salidas, mermas y transferencias de almacen
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Boxes size={22} />}
          onClick={() => setIsModalOpen(true)}
          sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}
        >
          Registrar Movimiento
        </Button>
      </Box>

      {/* Movements Table */}
      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Fecha / Hora</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tipo Movimiento</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Producto (SKU)</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Cantidad</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Stock Previo - Nuevo</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Costo Unitario</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Referencia / Notas</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Usuario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#64748B' }}>
                  No hay movimientos de inventario registrados
                </TableCell>
              </TableRow>
            ) : (
              pagedMovements.map((mov) => {
                const isEntry = mov.type.startsWith('IN');
                return (
                  <TableRow key={mov.id} hover sx={{ minHeight: 64 }}>
                    <TableCell sx={{ fontWeight: 700 }}>{toDate(mov.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        icon={isEntry ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        label={mov.type}
                        color={isEntry ? 'success' : 'error'}
                        size="medium"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                        {mov.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        SKU: {mov.productSku}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                      {isEntry ? `+${mov.quantity}` : `-${mov.quantity}`}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {mov.previousStock} &rarr; <strong style={{ color: '#2563EB' }}>{mov.newStock}</strong>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>${mov.unitCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {mov.reference}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {mov.notes}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{mov.userName}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
            Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, movements.length)} de {movements.length} movimientos
          </Typography>
          <Pagination count={totalPages} page={safePage} onChange={(_event, value) => setPage(value)} color="primary" shape="rounded" siblingCount={1} boundaryCount={1} />
        </Box>
      )}

      {/* Movement Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem' }}>Registrar Movimiento de Inventario</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="Producto" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {p.name} ({p.sku}) - Stock Actual: {p.stock} pzas
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Tipo de Movimiento" value={movementType} onChange={(e) => setMovementType(e.target.value as InventoryMovementType)} slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 600 } } }}>
                <MenuItem value="IN_PURCHASE">Entrada por Compra</MenuItem>
                <MenuItem value="IN_ADJUSTMENT">Entrada por Ajuste</MenuItem>
                <MenuItem value="OUT_ADJUSTMENT">Salida por Ajuste</MenuItem>
                <MenuItem value="OUT_DAMAGE">Salida por Mermas / Dano</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Cantidad" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))} slotProps={{ input: { sx: { height: 48, fontSize: '1rem', fontWeight: 800 } } }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Notas u Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} slotProps={{ input: { sx: { fontSize: '1rem', fontWeight: 600 } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsModalOpen(false)} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button onClick={handleRegisterMovement} variant="contained" color="primary" disabled={!selectedProductId || createKardex.isPending} sx={{ borderRadius: 3, minHeight: 48, px: 4, fontWeight: 900 }}>
            {createKardex.isPending ? 'Registrando...' : 'Registrar Kardex'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
