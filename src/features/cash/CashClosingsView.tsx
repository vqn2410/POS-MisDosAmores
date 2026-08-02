import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ClipboardList, Download, Eye, Wallet, FileText, BarChart3, Package } from 'lucide-react';
import { useCashSessions, useCashMovements } from '../../hooks/useCashSessions';
import { useSales } from '../../hooks/useSales';
import { useCompany } from '../../hooks/useCompany';
import { generateCashReportPdf } from './utils/generateCashReportPdf';
import type { CashSession, Sale } from '../../types';

function formatDateTime(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function paymentMethodKey(p: { method: string; reference?: string }): string {
  if (p.method === 'QR') {
    return p.reference?.startsWith('CDNI-') ? 'CUENTA_DNI' : 'MERCADOPAGO';
  }
  return p.method;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  MERCADOPAGO: 'Mercado Pago QR',
  CUENTA_DNI: 'Cuenta DNI',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito Cliente',
};

function sessionSalesOf(sales: Sale[], sessionId: string | undefined): Sale[] {
  return sales.filter((s) => s.cashSessionId === sessionId && s.status === 'COMPLETED');
}

const DetailDialog: React.FC<{ session: CashSession | null; onClose: () => void }> = ({ session, onClose }) => {
  const { data: sales = [] } = useSales();
  const { data: movements = [] } = useCashMovements(session?.id);
  const { data: company } = useCompany();

  if (!session) return null;

  const sessionSales = sessionSalesOf(sales, session.id);

  const cashOf = (s: Sale) =>
    (s.payments || []).filter((p) => p.method === 'CASH').reduce((acc, p) => acc + (p.amount - (p.change || 0)), 0);

  const kioskCashSales = sessionSales.reduce((sum, s) => {
    const kioskTotal = s.items
      .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? kioskTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const cigaretteCashSales = sessionSales.reduce((sum, s) => {
    const cigTotal = s.items
      .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? cigTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const netIncome = movements.filter((m) => m.status !== 'CANCELLED' && m.type === 'INCOME').reduce((sum, m) => sum + m.amount, 0);
  const netWithdrawals = movements.filter((m) => m.status !== 'CANCELLED' && m.type === 'WITHDRAWAL').reduce((sum, m) => sum + m.amount, 0);

  const totalCashInDrawer =
    session.initialKioskAmount + session.initialCigaretteAmount + kioskCashSales + cigaretteCashSales + netIncome - netWithdrawals;

  const totalSalesAmount = sessionSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalInvoicedCount = sessionSales.filter((s) => s.fiscalInvoice?.cae).length;

  const totalCollectedAmount = sessionSales.reduce((acc, s) => {
    const paid = (s.payments || []).reduce((a, p) => a + (p.amount - (p.change || 0)), 0);
    return acc + paid;
  }, 0);

  const paymentBreakdown = sessionSales.reduce<Record<string, number>>((acc, sale) => {
    for (const p of sale.payments || []) {
      const key = paymentMethodKey(p);
      acc[key] = (acc[key] || 0) + (p.amount - (p.change || 0));
    }
    return acc;
  }, {});

  const productTotals = sessionSales.reduce<Map<string, { name: string; quantity: number; unit: string; total: number }>>((acc, sale) => {
    for (const item of sale.items) {
      const id = item.product.id;
      const row = acc.get(id) || { name: item.product.name, quantity: 0, unit: item.product.unit, total: 0 };
      row.quantity += item.quantity;
      row.total += item.total;
      acc.set(id, row);
    }
    return acc;
  }, new Map());

  const difference = (session.finalAmount ?? 0) - (session.calculatedTotal ?? 0);

  const handleDownload = () => {
    generateCashReportPdf({
      company,
      session,
      sales: sessionSales,
      movements,
      closingAmount: session.finalAmount ?? 0,
      calculatedTotal: session.calculatedTotal ?? 0,
      difference,
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileText size={24} color="#2563EB" /> Detalle de Cierre · {formatDateTime(session.closedAt)}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>CAJERO</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>{session.userName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>APERTURA</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>{formatDateTime(session.openedAt)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>CIERRE</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>{formatDateTime(session.closedAt)}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
          <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 3, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Ventas</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>{sessionSales.length}</Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: '#FFF7ED', borderRadius: 3, textAlign: 'center', border: '1px solid #FED7AA' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>Facturas ARCA</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#9A3412' }}>{totalInvoicedCount}</Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 3, textAlign: 'center', border: '1px solid #BBF7D0' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Total vendido</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803D' }}>${totalSalesAmount.toFixed(2)}</Typography>
          </Paper>
        </Box>

        <Box sx={{ p: 2, bgcolor: '#EFF6FF', borderRadius: 3, border: '2px solid #BFDBFE', mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontWeight: 900, color: '#1E40AF' }}>🏪 Caja Kiosco</Typography>
            <Typography sx={{ fontWeight: 800, color: '#1E40AF' }}>${(session.initialKioskAmount + kioskCashSales).toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontWeight: 900, color: '#9A3412' }}>🚬 Caja Cigarrillos</Typography>
            <Typography sx={{ fontWeight: 800, color: '#9A3412' }}>${(session.initialCigaretteAmount + cigaretteCashSales).toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: '#BFDBFE' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 900, color: '#1E40AF' }}>Efectivo esperado</Typography>
            <Typography sx={{ fontWeight: 900, color: '#1E40AF' }}>${totalCashInDrawer.toFixed(2)}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>CONTADO</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>${(session.finalAmount ?? 0).toFixed(2)}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>CALCULADO</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>${(session.calculatedTotal ?? 0).toFixed(2)}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #E2E8F0', textAlign: 'center', bgcolor: difference !== 0 ? '#FEF2F2' : '#F0FDF4' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>DIFERENCIA</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: difference !== 0 ? '#DC2626' : '#16A34A' }}>
              {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart3 size={20} color="#2563EB" /> Totales por medio de pago
        </Typography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableBody>
            {Object.entries(paymentBreakdown).map(([key, total]) => (
              <TableRow key={key}>
                <TableCell sx={{ fontWeight: 700 }}>{PAYMENT_LABELS[key] || key}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900 }}>${total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#F0FDF4' }}>
              <TableCell sx={{ fontWeight: 900, color: '#166534' }}>TOTAL COBRADO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, color: '#15803D' }}>${totalCollectedAmount.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={20} color="#2563EB" /> Productos vendidos
        </Typography>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Producto</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Cantidad</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...productTotals.values()].sort((a, b) => b.total - a.total).slice(0, 30).map((p) => (
              <TableRow key={p.name} hover>
                <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{p.quantity} {p.unit}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>${p.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {productTotals.size === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#64748B', fontWeight: 600 }}>
                  Sin productos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, fontWeight: 700 }}>
          Cerrar
        </Button>
        <Button
          onClick={handleDownload}
          variant="contained"
          color="primary"
          startIcon={<Download size={20} />}
          sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 800 }}
        >
          Descargar reporte PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const CashClosingsView: React.FC = () => {
  const { data: sessions = [], isLoading } = useCashSessions();
  const { data: sales = [] } = useSales();
  const [selected, setSelected] = React.useState<CashSession | null>(null);

  const closedSessions = sessions.filter((s) => !s.isOpen);

  const statsBySession = React.useMemo(() => {
    const map = new Map<string, { count: number; totalCollected: number; totalSales: number }>();
    for (const s of sales) {
      if (s.status !== 'COMPLETED' || !s.cashSessionId) continue;
      const row = map.get(s.cashSessionId) || { count: 0, totalCollected: 0, totalSales: 0 };
      row.count += 1;
      row.totalSales += s.grandTotal;
      row.totalCollected += (s.payments || []).reduce((a, p) => a + (p.amount - (p.change || 0)), 0);
      map.set(s.cashSessionId, row);
    }
    return map;
  }, [sales]);

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
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClipboardList size={30} color="#2563EB" /> Cierres de Caja
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Historial de cierres, arqueos y reportes por sesión
          </Typography>
        </Box>
        <Chip icon={<Wallet size={16} />} label={`${closedSessions.length} cierres`} color="primary" sx={{ fontWeight: 800, py: 2, px: 1, borderRadius: 3 }} />
      </Box>

      {closedSessions.length === 0 ? (
        <Paper elevation={1} sx={{ p: 6, borderRadius: 4, textAlign: 'center', border: '2px solid #E2E8F0' }}>
          <ClipboardList size={64} color="#94A3B8" />
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 2, mb: 1 }}>
            Todavía no hay cierres de caja
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569' }}>
            Cuando se cierre una sesión de caja, el cierre quedará registrado acá para poder consultarlo y descargar su reporte PDF.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid #E2E8F0' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Fecha de cierre</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Cajero</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Apertura</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Ventas</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Total cobrado</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Total calculado</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Diferencia</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {closedSessions.map((s) => {
                const stats = statsBySession.get(s.id) || { count: 0, totalCollected: 0, totalSales: 0 };
                const difference = (s.finalAmount ?? 0) - (s.calculatedTotal ?? 0);
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 900, color: '#0F172A' }}>{formatDateTime(s.closedAt)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.userName}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#475569' }}>{formatDateTime(s.openedAt)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>{stats.count}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: '#15803D' }}>${stats.totalCollected.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>${(s.calculatedTotal ?? 0).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`}
                        size="small"
                        sx={{ fontWeight: 900, bgcolor: difference !== 0 ? '#FEE2E2' : '#DCFCE7', color: difference !== 0 ? '#B91C1C' : '#15803D' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => setSelected(s)} sx={{ color: '#2563EB' }}>
                          <Eye size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar PDF">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const sessionSales = sessionSalesOf(sales, s.id);
                            generateCashReportPdf({
                              company: null,
                              session: s,
                              sales: sessionSales,
                              movements: [],
                              closingAmount: s.finalAmount ?? 0,
                              calculatedTotal: s.calculatedTotal ?? 0,
                              difference,
                            });
                          }}
                          sx={{ color: '#DC2626' }}
                        >
                          <Download size={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <DetailDialog session={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};
