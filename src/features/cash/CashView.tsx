import React from 'react';
import {
  Box, Paper, Typography, Button, Grid, TextField, Divider, Chip, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, CheckCircle2, PlayCircle, History } from 'lucide-react';
import { useCurrentCashSession, useOpenCashSession, useCloseCashSession, useCashMovements, useCreateCashMovement } from '../../hooks/useCashSessions';
import { useSales } from '../../hooks/useSales';
import { useAuthStore } from '../../store/useAuthStore';
import { CashOpeningModal } from './components/CashOpeningModal';
import { CashMovementModal } from './components/CashMovementModal';

export const CashView: React.FC = () => {
  const { data: session, isLoading: sessionLoading } = useCurrentCashSession();
  const { data: sales = [] } = useSales();
  const { data: movements = [] } = useCashMovements(session?.id);
  const closeCashSession = useCloseCashSession();
  const openCashSession = useOpenCashSession();
  const createMovement = useCreateCashMovement();
  const { user, activeBranch, setCashSession } = useAuthStore();

  const [showOpeningModal, setShowOpeningModal] = React.useState(false);
  const [movementType, setMovementType] = React.useState<'INCOME' | 'WITHDRAWAL'>('INCOME');
  const [showMovementModal, setShowMovementModal] = React.useState(false);
  const [closingAmount, setClosingAmount] = React.useState<string>('');

  const sessionSales = sales.filter((s) => s.cashSessionId === session?.id && s.status === 'COMPLETED');

  const kioskSales = sessionSales.reduce((sum, s) => {
    const kioskTotal = s.items
      .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
      .reduce((acc, i) => acc + i.total, 0);
    return sum + kioskTotal;
  }, 0);

  const cigaretteSales = sessionSales.reduce((sum, s) => {
    const cigTotal = s.items
      .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
      .reduce((acc, i) => acc + i.total, 0);
    return sum + cigTotal;
  }, 0);

  const netIncome = movements
    .filter((m) => m.type === 'INCOME')
    .reduce((sum, m) => sum + m.amount, 0);

  const netWithdrawals = movements
    .filter((m) => m.type === 'WITHDRAWAL')
    .reduce((sum, m) => sum + m.amount, 0);

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
    const baseTotal = session.initialKioskAmount + session.initialCigaretteAmount + kioskSales + cigaretteSales;
    const calculated = baseTotal + netIncome - netWithdrawals;
    closeCashSession.mutate({
      id: session.id,
      data: {
        isOpen: false,
        closedAt: new Date().toISOString(),
        finalAmount: parseFloat(closingAmount) || 0,
        calculatedTotal: calculated,
        difference: (parseFloat(closingAmount) || 0) - calculated,
      },
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
                {new Date(session.openedAt).toLocaleTimeString()}
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
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Ventas del turno:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A' }}>+${kioskSales.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#BFDBFE' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF' }}>Total esperado:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF' }}>${(session.initialKioskAmount + kioskSales).toFixed(2)}</Typography>
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
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Ventas del turno:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A' }}>+${cigaretteSales.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: '#FED7AA' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9A3412' }}>Total esperado:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9A3412' }}>${(session.initialCigaretteAmount + cigaretteSales).toFixed(2)}</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2.5, bgcolor: '#F0FDF4', borderRadius: 3, border: '2px solid #86EFAC', textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                EFECTIVO TOTAL ESPERADO EN CAJA:
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#15803D', fontSize: '2.5rem', mt: 0.5 }}>
                ${(session.initialKioskAmount + session.initialCigaretteAmount + kioskSales + cigaretteSales + netIncome - netWithdrawals).toFixed(2)}
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
                  <TableCell sx={{ fontWeight: 800 }}>Hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Sin movimientos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Chip
                          label={m.type === 'INCOME' ? 'Ingreso' : 'Retiro'}
                          color={m.type === 'INCOME' ? 'primary' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 800, minWidth: 80 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: m.type === 'INCOME' ? '#16A34A' : '#DC2626' }}>
                        {m.type === 'INCOME' ? '+' : '-'}${m.amount.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{m.reason}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{m.userName}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{new Date(m.createdAt).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <CashMovementModal
        open={showMovementModal}
        type={movementType}
        onClose={() => setShowMovementModal(false)}
        onConfirm={handleMovement}
        isPending={createMovement.isPending}
      />
    </Box>
  );
};
