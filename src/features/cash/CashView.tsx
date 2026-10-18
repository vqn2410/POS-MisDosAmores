import React from 'react';
import {
  Box, Paper, Typography, Button, Grid, TextField, Divider, Chip, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, CheckCircle2, PlayCircle, History, Undo2, BarChart3 } from 'lucide-react';
import { useCurrentCashSession, useOpenCashSession, useCloseCashSession, useCashMovements, useCreateCashMovement, useCancelCashMovement } from '../../hooks/useCashSessions';
import { useSales } from '../../hooks/useSales';
import { useCompany } from '../../hooks/useCompany';
import { generateCashReportPdf } from './utils/generateCashReportPdf';
import { useAuthStore } from '../../store/useAuthStore';
import { CashOpeningModal } from './components/CashOpeningModal';
import { CashMovementModal } from './components/CashMovementModal';
import type { CashMovement } from '../../types';

function formatMovementTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

const PAYMENT_METHOD_META = [
  { key: 'CASH', label: 'Efectivo', icon: '💵', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'MERCADOPAGO', label: 'Mercado Pago QR', icon: '📱', color: '#009EE3', bg: '#E0F2FE', border: '#BAE6FD' },
  { key: 'CUENTA_DNI', label: 'Cuenta DNI', icon: '🏦', color: '#008037', bg: '#DCFCE7', border: '#BBF7D0' },
  { key: 'CARD', label: 'Tarjeta', icon: '💳', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'TRANSFER', label: 'Transferencia', icon: '🔁', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'CREDIT', label: 'Crédito Cliente', icon: '🧾', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
] as const;

function paymentMethodKey(p: { method: string; reference?: string }): string {
  if (p.method === 'QR') {
    return p.reference?.startsWith('CDNI-') ? 'CUENTA_DNI' : 'MERCADOPAGO';
  }
  return p.method;
}

export const CashView: React.FC = () => {
  const { data: session, isLoading: sessionLoading } = useCurrentCashSession();
  const { data: sales = [] } = useSales();
  const { data: movements = [] } = useCashMovements(session?.id);
  const closeCashSession = useCloseCashSession();
  const openCashSession = useOpenCashSession();
  const createMovement = useCreateCashMovement();
  const cancelMovement = useCancelCashMovement();
  const { user, activeBranch, setCashSession } = useAuthStore();
  const { data: company } = useCompany();

  const [showOpeningModal, setShowOpeningModal] = React.useState(false);
  const [movementType, setMovementType] = React.useState<'INCOME' | 'WITHDRAWAL'>('INCOME');
  const [showMovementModal, setShowMovementModal] = React.useState(false);
  const [closingAmount, setClosingAmount] = React.useState<string>('');
  const [cancelTarget, setCancelTarget] = React.useState<CashMovement | null>(null);

  const sessionSales = sales.filter((s) => s.cashSessionId === session?.id && s.status === 'COMPLETED');

  const cashOf = (s: { payments?: { method: string; amount: number; change?: number }[] }) =>
    (s.payments || [])
      .filter((p) => p.method === 'CASH')
      .reduce((acc, p) => acc + (p.amount - (p.change || 0)), 0);

  const itemsTotalOf = (s: { items: { total: number }[] }) =>
    s.items.reduce((acc, i) => acc + i.total, 0);

  const kioskCashSales = sessionSales.reduce((sum, s) => {
    const kioskTotal = s.items
      .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
      .reduce((acc, i) => acc + i.total, 0);
    const itemsTotal = itemsTotalOf(s);
    const share = itemsTotal > 0 ? kioskTotal / itemsTotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const cigaretteCashSales = sessionSales.reduce((sum, s) => {
    const cigTotal = s.items
      .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
      .reduce((acc, i) => acc + i.total, 0);
    const itemsTotal = itemsTotalOf(s);
    const share = itemsTotal > 0 ? cigTotal / itemsTotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const netIncome = movements
    .filter((m) => m.status !== 'CANCELLED' && m.type === 'INCOME')
    .reduce((sum, m) => sum + m.amount, 0);

  const netWithdrawals = movements
    .filter((m) => m.status !== 'CANCELLED' && m.type === 'WITHDRAWAL')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalCashInDrawer = session
    ? session.initialKioskAmount + session.initialCigaretteAmount + kioskCashSales + cigaretteCashSales + netIncome - netWithdrawals
    : 0;

  const paymentBreakdown = sessionSales.reduce<Record<string, { sales: number; total: number }>>((acc, sale) => {
    const seen = new Set<string>();
    for (const p of sale.payments || []) {
      const key = paymentMethodKey(p);
      const row = (acc[key] = acc[key] || { sales: 0, total: 0 });
      if (!seen.has(key)) {
        seen.add(key);
        row.sales += 1;
      }
      row.total += p.amount - (p.change || 0);
    }
    return acc;
  }, {});

  const totalInvoicedCount = sessionSales.filter((s) => s.fiscalInvoice?.cae).length;
  const totalSalesAmount = sessionSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalCollectedAmount = sessionSales.reduce((acc, s) => {
    const paid = (s.payments || [])
      .filter((p) => p.method !== 'CREDIT')
      .reduce((a, p) => a + (p.amount - (p.change || 0)), 0);
    return acc + paid;
  }, 0);

  const handleOpenSession = (kioskAmount: number, cigaretteAmount: number) => {
    if (!user) return;
    const newSession: Omit<import('../../types').CashSession, 'id'> = {
      cashRegisterId: activeBranch?.id || 'cr-01',
      userId: user.id,
      userName: user.fullName,
      openedAt: new Date().toISOString(),
      initialKioskAmount: kioskAmount,
      initialCigaretteAmount: cigaretteAmount,
      isOpen: true,
      notes: '',
    };
    openCashSession.mutate(newSession, {
      onSuccess: (id) => {
        setCashSession({ ...newSession, id } as any);
        setShowOpeningModal(false);
      },
    });
  };

  const handleMovement = (amount: number, reason: string) => {
    if (!session || !user) return;
    createMovement.mutate({
      cashSessionId: session.id,
      type: movementType,
      amount,
      reason,
      userId: user.id,
      userName: user.fullName,
      createdAt: new Date().toISOString(),
    }, {
      onSuccess: () => setShowMovementModal(false),
    });
  };

  const handleCloseSession = () => {
    if (!session) return;
    const calculated = totalCashInDrawer;
    const finalAmount = Number(closingAmount.replace(',', '.')) || 0;
    closeCashSession.mutate({
      id: session.id,
      data: {
        isOpen: false,
        closedAt: new Date().toISOString(),
        finalAmount,
        calculatedTotal: calculated,
        difference: finalAmount - calculated,
        notes: 'Cierre de caja',
      },
    }, {
      onSuccess: () => {
        generateCashReportPdf({
          company,
          session,
          sales: sessionSales,
          movements,
          branchName: activeBranch?.name,
          closingAmount: finalAmount,
          calculatedTotal: calculated,
          difference: finalAmount - calculated,
        });
      },
    });
  };

  const handleCancelMovement = () => {
    if (!cancelTarget || !user) return;
    cancelMovement.mutate({
      id: cancelTarget.id,
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        cancelledByUserId: user.id,
        cancelledByUserName: user.fullName,
      },
    }, {
      onSuccess: () => setCancelTarget(null),
    });
  };

  if (sessionLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
              Gestion de Caja & Arqueo de Turno
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569' }}>
              Control de apertura, ventas en efectivo, retiros parciales y cierre de sesion de caja
            </Typography>
          </Box>
          <Chip
            icon={<CheckCircle2 size={18} />}
            label="Caja Cerrada"
            color="error"
            sx={{ fontWeight: 800, fontSize: '0.95rem', py: 2.5, px: 1, borderRadius: 3 }}
          />
        </Box>

        <Paper elevation={1} sx={{ p: 6, borderRadius: 4, textAlign: 'center', border: '2px solid #E2E8F0' }}>
          <Wallet size={64} color="#94A3B8" />
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 2, mb: 1 }}>
            No hay sesion de caja abierta
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569', mb: 4 }}>
            Para comenzar a operar, realiza la apertura de caja indicando el dinero inicial en cada caja.
          </Typography>
          <Button
            size="large"
            variant="contained"
            color="primary"
            onClick={() => setShowOpeningModal(true)}
            startIcon={<PlayCircle size={24} />}
            sx={{ py: 1.75, px: 5, borderRadius: 3.5, fontWeight: 900, fontSize: '1.15rem' }}
          >
            APERTURA DE CAJA
          </Button>
        </Paper>

        <CashOpeningModal
          open={showOpeningModal}
          onClose={() => setShowOpeningModal(false)}
          onConfirm={handleOpenSession}
          isPending={openCashSession.isPending}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            Gestion de Caja & Arqueo de Turno
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569' }}>
            Control de apertura, ventas en efectivo, retiros parciales y cierre de sesion de caja
          </Typography>
        </Box>
        <Chip
          icon={<CheckCircle2 size={18} />}
          label="Caja #1 - Sesion Abierta"
          color="success"
          sx={{ fontWeight: 800, fontSize: '0.95rem', py: 2.5, px: 1, borderRadius: 3 }}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, bgcolor: '#FFFFFF', border: '2px solid #E2E8F0', height: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Wallet size={26} color="#2563EB" /> Estado Actual del Arqueo
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E2E8F0' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Cajero a cargo:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>{session.userName}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Hora de apertura:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {formatMovementTime(session.openedAt)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Sucursal:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A' }}>{activeBranch?.name || 'N/A'}</Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: '#E2E8F0' }} />

            {/* Kiosko Box */}
            <Box sx={{ p: 2, bgcolor: '#EFF6FF', borderRadius: 3, border: '2px solid #BFDBFE', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1E40AF' }}>
                  🏪 Caja Kiosco
                </Typography>
                <Chip label={`${sessionSales.length} ventas`} size="small" sx={{ fontWeight: 800 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Fondo inicial:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>${session.initialKioskAmount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Ventas en efectivo del turno:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A' }}>+${kioskCashSales.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#BFDBFE' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF' }}>Total esperado:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF' }}>${(session.initialKioskAmount + kioskCashSales).toFixed(2)}</Typography>
              </Box>
            </Box>

            {/* Cigarrillos Box */}
            <Box sx={{ p: 2, bgcolor: '#FFF7ED', borderRadius: 3, border: '2px solid #FED7AA' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#9A3412' }}>
                  🚬 Caja Cigarrillos
                </Typography>
                <Chip label={`${sessionSales.filter(s => s.items.some(i => i.product.cashBoxType === 'CIGARRILLOS')).length} ventas`} size="small" sx={{ fontWeight: 800 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Fondo inicial:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>${session.initialCigaretteAmount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Ventas en efectivo del turno:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A' }}>+${cigaretteCashSales.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#FED7AA' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9A3412' }}>Total esperado:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9A3412' }}>${(session.initialCigaretteAmount + cigaretteCashSales).toFixed(2)}</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2.5, bgcolor: '#F0FDF4', borderRadius: 3, border: '2px solid #86EFAC', textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                EFECTIVO TOTAL ESPERADO EN CAJA:
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#15803D', fontSize: '2.5rem', mt: 0.5 }}>
                ${totalCashInDrawer.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, bgcolor: '#FFFFFF', border: '2px solid #E2E8F0', height: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock size={26} color="#DC2626" /> Cierre & Arqueo de Caja
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E2E8F0' }} />

            <Typography variant="body1" sx={{ mb: 2, color: '#475569' }}>
              Ingresa el efectivo contado fisicamente en cada cajon de dinero:
            </Typography>

            <TextField
              fullWidth
              label="Efectivo contado fisicamente (total)"
              type="number"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              disabled={!session}
              slotProps={{
                input: {
                  startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>$</Typography>,
                  sx: { borderRadius: 3, fontSize: '1.3rem', fontWeight: 900, height: 52, color: '#0F172A', bgcolor: '#FFFFFF' },
                },
              }}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                disabled={!session}
                onClick={() => { setMovementType('INCOME'); setShowMovementModal(true); }}
                startIcon={<ArrowDownCircle size={20} />}
                sx={{ flexGrow: 1, borderRadius: 3, minHeight: 48, fontWeight: 800 }}
              >
                Ingreso Caja
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={!session}
                onClick={() => { setMovementType('WITHDRAWAL'); setShowMovementModal(true); }}
                startIcon={<ArrowUpCircle size={20} />}
                sx={{ flexGrow: 1, borderRadius: 3, minHeight: 48, fontWeight: 800 }}
              >
                Retiro Efectivo
              </Button>
            </Box>

            <Button
              fullWidth
              size="large"
              variant="contained"
              color="error"
              disabled={!session || closeCashSession.isPending}
              onClick={handleCloseSession}
              startIcon={<Lock size={22} />}
              sx={{ py: 1.75, mt: 3, borderRadius: 3.5, fontWeight: 900, fontSize: '1.15rem', minHeight: 52 }}
            >
              {closeCashSession.isPending ? 'Cerrando...' : 'REALIZAR CORTE Y CERRAR CAJA'}
            </Button>
          </Paper>
        </Grid>

        {/* Movements History */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={1} sx={{ borderRadius: 4, border: '2px solid #E2E8F0', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <History size={22} color="#64748B" />
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>
                Movimientos de Caja
              </Typography>
              <Chip label={`${netIncome.toFixed(2)} ingresados / ${netWithdrawals.toFixed(2)} retirados`} size="small" color="default" sx={{ ml: 'auto', fontWeight: 800 }} />
            </Box>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Monto</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Motivo</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Registró</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha y hora</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Sin movimientos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => {
                    const cancelled = m.status === 'CANCELLED';
                    return (
                      <TableRow key={m.id} hover sx={cancelled ? { bgcolor: '#F1F5F9' } : undefined}>
                        <TableCell>
                          <Chip
                            label={cancelled ? 'Anulado' : m.type === 'INCOME' ? 'Ingreso' : 'Retiro'}
                            color={cancelled ? 'default' : m.type === 'INCOME' ? 'primary' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 800, minWidth: 80 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: m.type === 'INCOME' ? '#16A34A' : '#DC2626', textDecoration: cancelled ? 'line-through' : 'none' }}>
                          {m.type === 'INCOME' ? '+' : '-'}${m.amount.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{m.reason}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{m.userName}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{formatMovementTime(m.createdAt)}</TableCell>
                        <TableCell>
                          {cancelled ? (
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8' }}>
                              {m.cancelledByUserName ? `por ${m.cancelledByUserName}` : 'Anulado'}
                            </Typography>
                          ) : (
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              startIcon={<Undo2 size={16} />}
                              onClick={() => setCancelTarget(m)}
                              sx={{ fontWeight: 800, textTransform: 'none' }}
                            >
                              Anular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {/* Ventas del Turno: resumen por medio de pago */}
      <Grid size={{ xs: 12 }}>
        <Paper elevation={1} sx={{ borderRadius: 4, border: '2px solid #E2E8F0', bgcolor: '#FFFFFF', p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChart3 size={24} color="#2563EB" /> Ventas del Turno
          </Typography>
          <Divider sx={{ mb: 2.5, borderColor: '#E2E8F0' }} />

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#F8FAFC', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Cantidad de ventas</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>{sessionSales.length}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#FFF7ED', textAlign: 'center', border: '1px solid #FED7AA' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>Facturas emitidas (ARCA)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#9A3412' }}>{totalInvoicedCount}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#F0FDF4', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Total vendido</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803D' }}>${totalSalesAmount.toFixed(2)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Medio de pago</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>Ventas</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Total cobrado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PAYMENT_METHOD_META.map((m) => {
                const row = paymentBreakdown[m.key];
                return (
                  <TableRow key={m.key} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{m.icon} {m.label}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>{row?.sales || 0}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: m.color }}>${(row?.total || 0).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: '#F0FDF4' }}>
                <TableCell sx={{ fontWeight: 900, color: '#166534' }}>TOTAL COBRADO</TableCell>
                <TableCell align="center" sx={{ fontWeight: 900, color: '#166534' }}>{sessionSales.length}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#15803D' }}>${totalCollectedAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <CashMovementModal
        open={showMovementModal}
        type={movementType}
        onClose={() => setShowMovementModal(false)}
        onConfirm={handleMovement}
        isPending={createMovement.isPending}
      />

      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Anular movimiento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que deseas anular el movimiento de {cancelTarget ? `$${cancelTarget.amount.toFixed(2)}` : ''} por "{cancelTarget?.reason}"? Este importe dejará de tenerse en cuenta en el arqueo.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setCancelTarget(null)} sx={{ borderRadius: 3, fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelMovement}
            disabled={cancelMovement.isPending}
            sx={{ borderRadius: 3, fontWeight: 800 }}
          >
            {cancelMovement.isPending ? 'Anulando...' : 'Anular'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
