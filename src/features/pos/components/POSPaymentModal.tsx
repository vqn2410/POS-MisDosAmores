import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  UserCheck,
  Printer,
  Clock,
  CheckCheck,
  QrCode as QrIcon,
  ShieldCheck,
} from 'lucide-react';
import type { PaymentMethodType, Sale } from '../../../types';
import { usePOSStore } from '../store/usePOSStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useCreateSale } from '../../../hooks/useSales';
import { getNextTicketNumber } from '../../../services/ticketCounterService';
import { MercadoPagoClient } from '../../../mercadoPago/MercadoPagoClient';
import { CuentaDniPaymentProvider, type CuentaDniPaymentResult } from '../../payments/providers/CuentaDniPaymentProvider';
import { FiscalRulesEngine } from '../../billing/services/FiscalRulesEngine';
import { MercadoPagoLogo } from '../../../components/common/MercadoPagoLogo';
import { CuentaDniLogo } from '../../../components/common/CuentaDniLogo';
import { calculateCartTotals } from '../utils/calculateCartTotals';

interface POSPaymentModalProps {
  onPrintTicket: (sale: Sale) => void;
}

export type ExtendedPaymentMethod = PaymentMethodType | 'MERCADOPAGO' | 'CUENTA_DNI';

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({ onPrintTicket }) => {
  const { isPaymentModalOpen, closePaymentModal, cart, payments, addPayment, completeSale, customer, discountGlobal } =
    usePOSStore();
  const { addNotification } = useNotificationStore();
  const createSale = useCreateSale();

  const [selectedMethod, setSelectedMethod] = React.useState<ExtendedPaymentMethod>('CASH');
  const [payAmount, setPayAmount] = React.useState<string>('');
  const amountRef = React.useRef<HTMLInputElement>(null);

  // Mercado Pago QR approval state
  const [mpStatus, setMpStatus] = React.useState<'IDLE' | 'WAITING' | 'APPROVED'>('IDLE');
  const [mpTxId, setMpTxId] = React.useState<string | null>(null);
  const [mpQrUrl, setMpQrUrl] = React.useState<string | null>(null);

  // Cuenta DNI manual reference confirmation state
  const [cdniPayment, setCdniPayment] = React.useState<CuentaDniPaymentResult | null>(null);
  const [cdniRefInput, setCdniRefInput] = React.useState('');

  const mpClient = React.useMemo(() => new MercadoPagoClient(), []);
  const cdniProvider = React.useMemo(() => new CuentaDniPaymentProvider(), []);

  const { grandTotal } = calculateCartTotals(cart, discountGlobal);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = Math.max(0, grandTotal - totalPaid);
  const change = Math.max(0, totalPaid - grandTotal);

  React.useEffect(() => {
    if (isPaymentModalOpen) {
      setPayAmount(pendingAmount.toFixed(2));
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  }, [isPaymentModalOpen, pendingAmount]);

  const handleSelectMethod = (method: ExtendedPaymentMethod) => {
    setSelectedMethod(method);
    setPayAmount(pendingAmount.toFixed(2));

    if (method === 'MERCADOPAGO') {
      setMpStatus('WAITING');
      setMpTxId(null);
      mpClient
        .createDynamicQR({
          externalReference: `TICK-${Date.now()}`,
          title: 'Venta POS Nexus',
          totalAmount: pendingAmount > 0 ? pendingAmount : grandTotal,
          items: cart.map((i) => ({ title: i.product.name, quantity: i.quantity, unitPrice: i.unitPrice })),
        })
        .then((res) => setMpQrUrl(res.qrCode))
        .catch(() => setMpQrUrl(null));
    } else if (method === 'CUENTA_DNI') {
      cdniProvider
        .createPayment({
          amount: pendingAmount > 0 ? pendingAmount : grandTotal,
          externalReference: `TICK-${Date.now()}`,
        })
        .then((res) => {
          setCdniPayment(res);
          setCdniRefInput('');
        });
    } else {
      setMpStatus('IDLE');
      setCdniPayment(null);
    }
  };

  const handleApproveMp = (txId: string) => {
    setMpStatus('APPROVED');
    setMpTxId(txId);
    const amt = pendingAmount > 0 ? pendingAmount : grandTotal;
    addPayment({
      method: 'QR',
      amount: amt,
      reference: txId,
      change: 0,
    });
    addNotification({
      title: 'Mercado Pago Aprobado',
      message: `Transacción confirmada: ${txId}`,
      type: 'success',
    });
  };

  const handleConfirmCdni = async () => {
    if (!cdniPayment || !cdniRefInput.trim()) {
      addNotification({
        title: 'Referencia requerida',
        message: 'Ingrese el número de comprobante o referencia de Cuenta DNI.',
        type: 'warning',
      });
      return;
    }

    const confirmed = await cdniProvider.manuallyConfirmPayment(cdniPayment.id, {
      referenceNumber: cdniRefInput.trim(),
      confirmedByUserId: usePOSStore.getState().customer.id || 'usr-unknown',
      confirmedByUserName: usePOSStore.getState().customer.name || 'Usuario',
    });

    setCdniPayment(confirmed);
    const amt = pendingAmount > 0 ? pendingAmount : grandTotal;
    addPayment({
      method: 'QR',
      amount: amt,
      reference: `CDNI-${confirmed.referenceNumber}`,
      change: 0,
    });

    addNotification({
      title: 'Cuenta DNI Confirmado Manualmente',
      message: `Referencia: ${confirmed.referenceNumber} verificada manualmente`,
      type: 'success',
    });
  };

  const handleAddPayment = () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    addPayment({
      method: selectedMethod === 'MERCADOPAGO' || selectedMethod === 'CUENTA_DNI' ? 'QR' : (selectedMethod as PaymentMethodType),
      amount: amt,
      reference: selectedMethod === 'MERCADOPAGO' ? mpTxId || undefined : cdniPayment?.referenceNumber || undefined,
      change: selectedMethod === 'CASH' && amt > pendingAmount ? amt - pendingAmount : 0,
    });
    setPayAmount('');
  };

  const handleConfirmCheckout = async () => {
    try {
      const ticketNumber = await getNextTicketNumber();
      const primaryMethod = selectedMethod === 'MERCADOPAGO' ? 'MERCADOPAGO_QR' : selectedMethod === 'CUENTA_DNI' ? 'CUENTA_DNI' : selectedMethod;

      let fiscalEvaluation;
      try {
        fiscalEvaluation = await FiscalRulesEngine.processFiscalEvaluation(primaryMethod, {
          salesPoint: 1,
          voucherType: 6,
          concept: 1,
          docType: customer.taxId ? 80 : 99,
          docNumber: customer.taxId || '00000000',
          subtotal: grandTotal,
          taxTotal: 0,
          grandTotal,
        });
      } catch {
        fiscalEvaluation = null;
      }

      const sale = completeSale(ticketNumber);
      if (!sale) return;

      if (fiscalEvaluation?.fiscalResult) {
        sale.notes = `Factura ARCA Emitida. CAE: ${fiscalEvaluation.fiscalResult.cae}`;
      } else if (fiscalEvaluation?.internalReceiptNo) {
        sale.notes = `Comprobante Interno: ${fiscalEvaluation.internalReceiptNo}`;
      } else {
        sale.notes = `Ticket #${ticketNumber}`;
      }

      const { id: _id, ...saleData } = sale;
      createSale.mutate(saleData as any, {
        onError: (err) => {
          console.error('Error guardando venta en Firestore:', err);
        },
      });

      addNotification({
        title: 'Venta Procesada Exitosamente',
        message: `Ticket ${sale.ticketNumber} - ${fiscalEvaluation?.fiscalResult ? 'Factura ARCA Emitida (CAE OK)' : 'Comprobante Interno Emitido'}`,
        type: 'success',
      });

      onPrintTicket(sale);
    } catch (err) {
      console.error('Error al finalizar venta:', err);
      addNotification({
        title: 'Error al finalizar',
        message: 'Ocurrió un error al procesar la venta. Intente nuevamente.',
        type: 'error',
      });
    }
  };

  const isCheckoutDisabled = totalPaid < grandTotal;

  return (
    <Dialog open={isPaymentModalOpen} onClose={closePaymentModal} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 1, bgcolor: '#FFFFFF', color: '#0F172A', border: '2px solid #E2E8F0' } } }}>
      <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0F172A' }}>
        <span>💳 Procesar Cobro (Pago Mixto / Múltiples Medios)</span>
        <Chip label={`TOTAL: $${grandTotal.toFixed(2)}`} color="primary" sx={{ fontSize: '1.25rem', fontWeight: 900, py: 2.5, px: 1, borderRadius: 3, bgcolor: '#2563EB', color: '#FFFFFF' }} />
      </DialogTitle>
      <Divider sx={{ borderColor: '#E2E8F0' }} />

      <DialogContent sx={{ py: 3 }}>
        <Alert severity="info" icon={<ShieldCheck size={20} />} sx={{ mb: 3, borderRadius: 3, fontSize: '1rem', fontWeight: 700 }}>
          Política Fiscal Centralizada: Comprobante ARCA únicamente emitido si el pago de Mercado Pago o Cuenta DNI está APROBADO.
        </Alert>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5, fontSize: '1.1rem', color: '#0F172A' }}>
              Selecciona Medio de Pago Independiente:
            </Typography>

            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {/* 1. Efectivo */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('CASH')}
                  elevation={selectedMethod === 'CASH' ? 2 : 0}
                  sx={{
                    p: 2,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'CASH' ? '#16A34A' : '#CBD5E1',
                    bgcolor: selectedMethod === 'CASH' ? '#F0FDF4' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Banknote size={32} color="#16A34A" style={{ marginBottom: 4 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Efectivo</Typography>
                </Paper>
              </Grid>

              {/* 2. Tarjeta */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('CARD')}
                  elevation={selectedMethod === 'CARD' ? 2 : 0}
                  sx={{
                    p: 2,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'CARD' ? '#2563EB' : '#CBD5E1',
                    bgcolor: selectedMethod === 'CARD' ? '#EFF6FF' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CreditCard size={32} color="#2563EB" style={{ marginBottom: 4 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Tarjeta</Typography>
                </Paper>
              </Grid>

              {/* 3. Transferencia */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('TRANSFER')}
                  elevation={selectedMethod === 'TRANSFER' ? 2 : 0}
                  sx={{
                    p: 2,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'TRANSFER' ? '#0284C7' : '#CBD5E1',
                    bgcolor: selectedMethod === 'TRANSFER' ? '#F0F9FF' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRightLeft size={32} color="#0284C7" style={{ marginBottom: 4 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Transferencia</Typography>
                </Paper>
              </Grid>

              {/* 4. Mercado Pago (Independiente con Logo) */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('MERCADOPAGO')}
                  elevation={selectedMethod === 'MERCADOPAGO' ? 2 : 0}
                  sx={{
                    p: 1.5,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'MERCADOPAGO' ? '#009EE3' : '#CBD5E1',
                    bgcolor: selectedMethod === 'MERCADOPAGO' ? '#E0F2FE' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MercadoPagoLogo height={32} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#009EE3', mt: 0.5 }}>Mercado Pago</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Pagar con QR</Typography>
                </Paper>
              </Grid>

              {/* 5. Cuenta DNI (Independiente con Logo) */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('CUENTA_DNI')}
                  elevation={selectedMethod === 'CUENTA_DNI' ? 2 : 0}
                  sx={{
                    p: 1.5,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'CUENTA_DNI' ? '#008037' : '#CBD5E1',
                    bgcolor: selectedMethod === 'CUENTA_DNI' ? '#DCFCE7' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CuentaDniLogo height={32} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#008037', mt: 0.5 }}>Cuenta DNI</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Pagar con QR</Typography>
                </Paper>
              </Grid>

              {/* 6. Crédito Cliente */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  onClick={() => handleSelectMethod('CREDIT')}
                  elevation={selectedMethod === 'CREDIT' ? 2 : 0}
                  sx={{
                    p: 2,
                    minHeight: 105,
                    borderRadius: 3,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: selectedMethod === 'CREDIT' ? '#D97706' : '#CBD5E1',
                    bgcolor: selectedMethod === 'CREDIT' ? '#FFFBEB' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={32} color="#D97706" style={{ marginBottom: 4 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Crédito Cliente</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Mercado Pago QR Container */}
            {selectedMethod === 'MERCADOPAGO' && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3.5, bgcolor: '#F0F9FF', border: '2px solid #BAE6FD', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <MercadoPagoLogo height={28} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0369A1' }}>Cobro QR Presencial</Typography>
                </Box>

                {mpQrUrl ? (
                  <Box component="img" src={mpQrUrl} alt="QR Mercado Pago" sx={{ width: 160, height: 160, margin: '0 auto 12px', display: 'block', borderRadius: 3, border: '1px solid #BAE6FD' }} />
                ) : (
                  <CircularProgress size={36} sx={{ my: 2 }} />
                )}

                {mpStatus === 'WAITING' && (
                  <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 2.5, border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                    <CircularProgress size={20} color="primary" />
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#0369A1' }}>
                      Aguardando pago del cliente en app Mercado Pago...
                    </Typography>
                  </Box>
                )}

                {mpStatus === 'APPROVED' && (
                  <Box sx={{ p: 1.5, bgcolor: '#DCFCE7', borderRadius: 2.5, border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCheck size={24} color="#16A34A" />
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#15803D' }}>
                      ¡Pago Confirmado Mercado Pago! ({mpTxId})
                    </Typography>
                  </Box>
                )}

                {mpStatus === 'WAITING' && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleApproveMp('MP-TX-' + Math.floor(100000 + Math.random() * 900000))}
                    startIcon={<QrIcon size={16} />}
                    sx={{ borderRadius: 2.5, fontWeight: 800, bgcolor: '#009EE3', textTransform: 'none' }}
                  >
                    Simular Aprobación Instantánea Webhook MP
                  </Button>
                )}
              </Paper>
            )}

            {/* Cuenta DNI Manual Reference Flow */}
            {selectedMethod === 'CUENTA_DNI' && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3.5, bgcolor: '#F0FDF4', border: '2px solid #BBF7D0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <CuentaDniLogo height={28} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#166534' }}>Cobro QR Cuenta DNI (Banco Provincia)</Typography>
                </Box>

                {cdniPayment?.status === 'AWAITING_CONFIRMATION' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                    <Alert severity="warning" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                      Muestre el QR de Cuenta DNI e ingrese la referencia o número de operación recibida.
                    </Alert>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de Operación / Referencia Cuenta DNI"
                      placeholder="Ej. CDNI-982144"
                      value={cdniRefInput}
                      onChange={(e) => setCdniRefInput(e.target.value)}
                      slotProps={{ input: { sx: { borderRadius: 2.5, bgcolor: '#FFFFFF', fontWeight: 800 } } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleConfirmCdni}
                      startIcon={<CheckCheck size={18} />}
                      sx={{ borderRadius: 2.5, fontWeight: 900, bgcolor: '#008037', '&:hover': { bgcolor: '#00662C' } }}
                    >
                      Confirmar Referencia Cuenta DNI (Verificar Pago)
                    </Button>
                  </Box>
                )}

                {cdniPayment?.status === 'MANUALLY_CONFIRMED' && (
                  <Box sx={{ p: 1.5, bgcolor: '#DCFCE7', borderRadius: 2.5, border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CheckCheck size={24} color="#16A34A" />
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#15803D' }}>
                      Pago Confirmado Cuenta DNI (Ref: {cdniPayment.referenceNumber})
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Standard manual payment amount field */}
            {selectedMethod !== 'MERCADOPAGO' && selectedMethod !== 'CUENTA_DNI' && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <TextField
                  inputRef={amountRef}
                  fullWidth
                  label="Monto a abonar"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (totalPaid >= grandTotal) {
                        handleConfirmCheckout();
                      } else {
                        handleAddPayment();
                      }
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>$</Typography>,
                      sx: { borderRadius: 3, fontSize: '1.3rem', fontWeight: 900, height: 52, bgcolor: '#FFFFFF', color: '#0F172A' },
                    },
                    inputLabel: { sx: { fontWeight: 700, color: '#475569' } },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddPayment}
                  disabled={parseFloat(payAmount) <= 0 || isNaN(parseFloat(payAmount))}
                  sx={{ height: 52, px: 3, borderRadius: 3, fontWeight: 900, fontSize: '1rem', minWidth: 120, bgcolor: '#2563EB', color: '#FFFFFF' }}
                >
                  Agregar
                </Button>
              </Box>
            )}
          </Grid>

          {/* Mixed Payment Split Summary Column */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, bgcolor: '#F8FAFC', border: '2px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1, fontSize: '1.1rem', color: '#0F172A' }}>
                Desglose de Pago Mixto
              </Typography>
              <Divider sx={{ mb: 2, borderColor: '#E2E8F0' }} />

              {payments.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontWeight: 600 }}>
                  No se han registrado abonados aún
                </Typography>
              ) : (
                payments.map((p) => (
                  <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {p.method} {p.reference ? `(${p.reference})` : ''}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#2563EB' }}>
                      ${p.amount.toFixed(2)}
                    </Typography>
                  </Box>
                ))
              )}

              <Divider sx={{ my: 2, borderColor: '#E2E8F0' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Total de Venta:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                  ${grandTotal.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Monto Asignado:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: '#16A34A' }}>
                  ${totalPaid.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>Saldo Pendiente:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: pendingAmount > 0 ? '#DC2626' : '#0F172A' }}>
                  ${pendingAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 3, border: '2px solid #BBF7D0', textAlign: 'center', mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💵 CAMBIO A ENTREGAR:
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#15803D', fontSize: '2.5rem', mt: 0.5 }}>
                  ${change.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button onClick={closePaymentModal} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={isCheckoutDisabled}
          onClick={handleConfirmCheckout}
          startIcon={selectedMethod === 'MERCADOPAGO' && mpStatus === 'WAITING' ? <Clock size={22} /> : <Printer size={22} />}
          sx={{ py: 1.75, px: 4, borderRadius: 3.5, fontSize: '1.15rem', fontWeight: 900, minHeight: 52, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
        >
          {selectedMethod === 'MERCADOPAGO' && mpStatus === 'WAITING'
            ? 'AGUARDANDO PAGO MERCADO PAGO...'
            : 'FINALIZAR Y EMITIR COMPROBANTE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
