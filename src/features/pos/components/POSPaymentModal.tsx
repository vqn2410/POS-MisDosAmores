import React from 'react';
import { keyframes } from '@emotion/react';
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
  MenuItem,
} from '@mui/material';
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  UserCheck,
  Printer,
  Clock,
  CheckCheck,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { FiscalInvoice, PaymentMethodType, Sale } from '../../../types';
import { QRCodeSVG } from 'qrcode.react';
import { usePOSStore } from '../store/usePOSStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useCreateSale, useUpdateSale } from '../../../hooks/useSales';
import { useRegisterBulkKardex } from '../../../hooks/useKardex';
import { getNextTicketNumber } from '../../../services/ticketCounterService';
import { CuentaDniPaymentProvider, type CuentaDniPaymentResult } from '../../payments/providers/CuentaDniPaymentProvider';
import { FiscalRulesEngine } from '../../billing/services/FiscalRulesEngine';
import { MercadoPagoLogo } from '../../../components/common/MercadoPagoLogo';
import { CuentaDniLogo } from '../../../components/common/CuentaDniLogo';
import { calculateCartTotals } from '../utils/calculateCartTotals';
import { createMercadoPagoQr, cancelMercadoPagoQr, getMercadoPagoQrStatus, getMercadoPagoStaticQr, listMercadoPagoPointDevices, createMercadoPagoPointOrder, getMercadoPagoPointOrderStatus, cancelMercadoPagoPointOrder } from '../../../services/mercadoPagoQrApi';
import { paymentMethodLabel } from '../utils/paymentLabels';

const computeSurcharge = (amount: number, ratePercent: number) => {
  const rate = ratePercent / 100;
  return Math.round(amount * (rate / (1 + rate)) * 100) / 100;
};

const accreditedPop = keyframes`
  0% { opacity: 0; transform: scale(0.6); }
  60% { transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
`;

const submitPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;

function playPaymentSuccessSound() {
  if (typeof AudioContext === 'undefined') return;
  try {
    const audio = new AudioContext();
    const master = audio.createGain();
    master.gain.value = 0.12;
    master.connect(audio.destination);
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = audio.currentTime + i * 0.11;
      const end = start + 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    });
    window.setTimeout(() => void audio.close(), 700);
  } catch {}
}

interface POSPaymentModalProps {
  onPrintTicket: (sale: Sale) => void;
}

export type ExtendedPaymentMethod = PaymentMethodType | 'MERCADOPAGO' | 'CUENTA_DNI';

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({ onPrintTicket }) => {
  const { isPaymentModalOpen, closePaymentModal, cart, payments, addPayment, completeSale, customer, discountGlobal } =
    usePOSStore();
  const { addNotification } = useNotificationStore();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const registerBulkKardex = useRegisterBulkKardex();

  const [selectedMethod, setSelectedMethod] = React.useState<ExtendedPaymentMethod>('CASH');
  const [payAmount, setPayAmount] = React.useState<string>('');
  const [cardType, setCardType] = React.useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [cdniPercent, setCdniPercent] = React.useState(5);
  const amountRef = React.useRef<HTMLInputElement>(null);
  const focusAmountInput = () => {
    window.setTimeout(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    }, 50);
  };

  // Anti doble clic: bloquea confirmación/agregado mientras se procesa el cierre.
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [completedSale, setCompletedSale] = React.useState<Sale | null>(null);
  const finalizeAccreditedPaymentRef = React.useRef<() => void>(() => undefined);
  // Banner "PAGO ACREDITADO CON ÉXITO" + sonido al acreditarse un pago.
  const [accredited, setAccredited] = React.useState<{ label: string; amount: number } | null>(null);
  const accreditedTimerRef = React.useRef<number | null>(null);

  // "Otro monto": permite cobrar un monto final distinto al calculado (QR / Tarjeta).
  const [customAmount, setCustomAmount] = React.useState('');
  const [customAmountActive, setCustomAmountActive] = React.useState(false);

  // Mercado Pago dynamic QR approval state
  const [mpStatus, setMpStatus] = React.useState<'IDLE' | 'CREATING' | 'WAITING' | 'APPROVED' | 'ERROR'>('IDLE');
  const [mpTxId, setMpTxId] = React.useState<string | null>(null);
  const [mpReference, setMpReference] = React.useState<string | null>(null);
  const [mpQrData, setMpQrData] = React.useState<string | null>(null);
  const [mpAmount, setMpAmount] = React.useState(0);
  const [mpError, setMpError] = React.useState('');
  const [isVerifyingMpPayment, setIsVerifyingMpPayment] = React.useState(false);
  const [manualValidateOpen, setManualValidateOpen] = React.useState(false);
  const mpRequestRef = React.useRef(0);
  const mpPaymentAddedRef = React.useRef(false);
  const mpPendingRef = React.useRef(false);

  // Cuenta DNI manual confirmation state
  const [cdniPayment, setCdniPayment] = React.useState<CuentaDniPaymentResult | null>(null);
  const cdniRequestRef = React.useRef(0);

  // Point Smart order state
  const [pointStatus, setPointStatus] = React.useState<'IDLE' | 'CREATING' | 'WAITING' | 'APPROVED' | 'ERROR'>('IDLE');
  const [pointOrderId, setPointOrderId] = React.useState<string | null>(null);
  const pointOrderIdRef = React.useRef<string | null>(null);
  pointOrderIdRef.current = pointOrderId;
  const [pointDeviceName, setPointDeviceName] = React.useState<string | null>(null);
  const [pointError, setPointError] = React.useState('');
  const pointPendingRef = React.useRef(false);
  const pointAddedRef = React.useRef(false);
  const mpCustomRef = React.useRef(false);
  const pointCustomRef = React.useRef(false);
  const pointAmountRef = React.useRef(0);

  const cdniProvider = React.useMemo(() => new CuentaDniPaymentProvider(), []);

  const notifyAccredited = (label: string, amount: number) => {
    setAccredited({ label, amount });
    playPaymentSuccessSound();
    if (accreditedTimerRef.current) window.clearTimeout(accreditedTimerRef.current);
    accreditedTimerRef.current = window.setTimeout(() => setAccredited(null), 5000);
  };

  const { grandTotal } = calculateCartTotals(cart, discountGlobal);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const surchargeAmount = payments.reduce((acc, p) => acc + (p.surchargeAmount || 0), 0);
  const basePaid = payments.reduce((acc, p) => acc + (p.amount - (p.surchargeAmount || 0)), 0);
  const pendingBase = Math.max(0, grandTotal - basePaid);
  const defaultCashAmountRef = React.useRef(pendingBase);
  defaultCashAmountRef.current = pendingBase;
  const hasSurcharge = selectedMethod === 'CARD' || selectedMethod === 'MERCADOPAGO' || selectedMethod === 'CUENTA_DNI';
  const surchargePercent = selectedMethod === 'MERCADOPAGO' ? 5 : selectedMethod === 'CARD' ? (cardType === 'CREDIT' ? 10 : 5) : cdniPercent;
  const pendingSurcharge = hasSurcharge ? pendingBase * (surchargePercent / 100) : 0;
  const checkoutTotal = grandTotal + surchargeAmount;
  const totalToCollect = checkoutTotal + pendingSurcharge;
  const totalChange = payments.reduce((acc, p) => acc + (p.change || 0), 0);
  const enteredAmount = Number(payAmount.replace(',', '.')) || 0;
  const changePreview = selectedMethod === 'CASH' ? Math.max(0, totalPaid + enteredAmount - checkoutTotal) : totalChange;
  const amountForMethod = pendingBase + pendingSurcharge;
  const customAmountValue = Number(customAmount.replace(',', '.')) || 0;
  const useCustomAmount = customAmountActive && customAmountValue > 0;
  const chargeAmount = useCustomAmount ? customAmountValue : amountForMethod;

  React.useEffect(() => {
    if (accreditedTimerRef.current) {
      window.clearTimeout(accreditedTimerRef.current);
      accreditedTimerRef.current = null;
    }
    setAccredited(null);
    submittingRef.current = false;
    setIsSubmitting(false);
    if (isPaymentModalOpen) {
      setPayAmount(defaultCashAmountRef.current.toFixed(2));
      setSelectedMethod('CASH');
      setMpStatus('IDLE');
      setMpReference(null);
      setMpQrData(null);
      setMpError('');
      setPointStatus('IDLE');
      setPointOrderId(null);
      setPointDeviceName(null);
      setPointError('');
      setCustomAmount('');
      setCustomAmountActive(false);
      focusAmountInput();
    } else {
      if (mpPendingRef.current) {
        void cancelMercadoPagoQr().catch(() => undefined);
      }
      mpPendingRef.current = false;
      mpRequestRef.current += 1;
      mpPaymentAddedRef.current = false;
      setMpStatus('IDLE');
      setMpReference(null);
      setMpQrData(null);
      setMpError('');
      if (pointPendingRef.current && pointOrderIdRef.current) {
        void cancelMercadoPagoPointOrder(pointOrderIdRef.current).catch(() => undefined);
      }
      pointPendingRef.current = false;
      pointAddedRef.current = false;
      setPointStatus('IDLE');
      setPointOrderId(null);
      setPointDeviceName(null);
      setPointError('');
      setCustomAmount('');
      setCustomAmountActive(false);
    }
  }, [isPaymentModalOpen]);

  const createMercadoPagoQrOrder = async (amount: number) => {
    const requestId = ++mpRequestRef.current;
    const externalReference = `POS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    mpPaymentAddedRef.current = false;
    mpPendingRef.current = true;
    mpCustomRef.current = useCustomAmount;
    setMpStatus('CREATING');
    setMpTxId(null);
    setMpReference(null);
    setMpQrData(null);
    setMpAmount(amount);
    setMpError('');
    try {
      const order = await createMercadoPagoQr({
        externalReference,
        title: 'Venta POS Mis Dos Amores',
        totalAmount: amount,
        // Mercado Pago requires its item total to match the exact outstanding balance, including discounts and surcharges.
        items: [{ title: 'Saldo de venta POS', quantity: 1, unitPrice: amount }],
      });
      if (requestId !== mpRequestRef.current) return;
      const staticQr = await getMercadoPagoStaticQr();
      if (requestId !== mpRequestRef.current) return;
      setMpReference(order.externalReference);
      setMpQrData(staticQr.qrData);
      setMpStatus('WAITING');
    } catch (error) {
      if (requestId !== mpRequestRef.current) return;
      setMpError(error instanceof Error ? error.message : 'No se pudo generar el QR de Mercado Pago.');
      setMpStatus('ERROR');
    }
  };

  React.useEffect(() => {
    if (!isPaymentModalOpen || selectedMethod !== 'MERCADOPAGO' || mpStatus !== 'WAITING' || !mpReference) return;
    let active = true;
    const checkPayment = async () => {
      try {
        const payment = await getMercadoPagoQrStatus(mpReference);
        if (!active) return;
        if (payment.status === 'approved' && payment.paymentId && !mpPaymentAddedRef.current) {
          mpPaymentAddedRef.current = true;
          mpPendingRef.current = false;
          setMpTxId(payment.paymentId);
          setMpStatus('APPROVED');
          addPayment({ method: 'QR', amount: mpAmount, reference: payment.paymentId, change: 0, surchargeAmount: mpCustomRef.current ? 0 : computeSurcharge(mpAmount, 5) });
          finalizeAccreditedPaymentRef.current();
          notifyAccredited('Mercado Pago', mpAmount);
          addNotification({ title: 'Mercado Pago aprobado', message: `Transacción confirmada: ${payment.paymentId}`, type: 'success' });
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          setMpError(payment.detail || 'El pago fue rechazado o cancelado.');
          setMpStatus('ERROR');
        }
      } catch (error) {
        if (!active) return;
        setMpError(error instanceof Error ? error.message : 'No se pudo consultar el estado del pago.');
        setMpStatus('ERROR');
      }
    };
    void checkPayment();
    const interval = window.setInterval(() => void checkPayment(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [addNotification, addPayment, isPaymentModalOpen, mpAmount, mpReference, mpStatus, selectedMethod]);

  const verifyMercadoPagoPayment = async () => {
    if (!mpReference) return;
    setIsVerifyingMpPayment(true);
    try {
      const payment = await getMercadoPagoQrStatus(mpReference);
      if (payment.status === 'approved' && payment.paymentId && !mpPaymentAddedRef.current) {
        mpPaymentAddedRef.current = true;
        mpPendingRef.current = false;
        setMpTxId(payment.paymentId);
        setMpStatus('APPROVED');
        addPayment({ method: 'QR', amount: mpAmount, reference: payment.paymentId, change: 0, surchargeAmount: mpCustomRef.current ? 0 : computeSurcharge(mpAmount, 5) });
        finalizeAccreditedPaymentRef.current();
        notifyAccredited('Mercado Pago', mpAmount);
        addNotification({ title: 'Mercado Pago aprobado', message: `Transacción confirmada: ${payment.paymentId}`, type: 'success' });
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        setMpError(payment.detail || 'El pago fue rechazado o cancelado.');
        setMpStatus('ERROR');
      } else {
        addNotification({ title: 'Pago pendiente', message: 'Todavía no se detecta el pago. Asegurate de que el cliente haya abonado.', type: 'warning' });
      }
    } catch (error) {
      setMpError(error instanceof Error ? error.message : 'No se pudo consultar el estado del pago.');
      setMpStatus('ERROR');
    } finally {
      setIsVerifyingMpPayment(false);
    }
  };

  const confirmManualMpValidation = () => {
    if (mpPaymentAddedRef.current) return;
    mpPaymentAddedRef.current = true;
    mpPendingRef.current = false;
    setMpTxId('MANUAL');
    setMpStatus('APPROVED');
    addPayment({ method: 'QR', amount: mpAmount, reference: `MANUAL-${Date.now()}`, change: 0, surchargeAmount: mpCustomRef.current ? 0 : computeSurcharge(mpAmount, 5) });
    finalizeAccreditedPaymentRef.current();
    notifyAccredited('Mercado Pago', mpAmount);
    addNotification({ title: 'Pago validado manualmente', message: `Se asoció el pago manual de $${mpAmount.toFixed(2)} al ticket.`, type: 'success' });
    setManualValidateOpen(false);
    void cancelMercadoPagoQr().catch(() => undefined);
  };

  const startPointCharge = async () => {
    pointAddedRef.current = false;
    pointPendingRef.current = true;
    pointCustomRef.current = useCustomAmount;
    pointAmountRef.current = chargeAmount;
    setPointStatus('CREATING');
    setPointError('');
    try {
      const { devices } = await listMercadoPagoPointDevices();
      if (!devices.length) throw new Error('No hay dispositivos Point vinculados a esta cuenta de Mercado Pago.');
      const device = devices[0];
      const externalReference = `POS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const order = await createMercadoPagoPointOrder({
        amount: pointAmountRef.current,
        description: 'Venta POS Mis Dos Amores',
        externalReference,
      });
      setPointOrderId(order.orderId);
      setPointDeviceName(device.name || null);
      setPointStatus('WAITING');
    } catch (error) {
      pointPendingRef.current = false;
      setPointError(error instanceof Error ? error.message : 'No se pudo iniciar el cobro con Point.');
      setPointStatus('ERROR');
    }
  };

  const cancelPointCharge = () => {
    const id = pointOrderId;
    if (!id) return;
    pointPendingRef.current = false;
    setPointOrderId(null);
    setPointStatus('IDLE');
    setPointError('');
    void cancelMercadoPagoPointOrder(id).catch(() => undefined);
  };

  const handleClosePaymentModal = () => {
    if (pointPendingRef.current && pointOrderId) {
      void cancelMercadoPagoPointOrder(pointOrderId).catch(() => undefined);
    }
    pointPendingRef.current = false;
    pointAddedRef.current = false;
    setPointStatus('IDLE');
    setPointOrderId(null);
    setPointDeviceName(null);
    setPointError('');
    if (mpPendingRef.current) {
      void cancelMercadoPagoQr().catch(() => undefined);
      mpPendingRef.current = false;
    }
    mpRequestRef.current += 1;
    setMpStatus('IDLE');
    setMpReference(null);
    setMpQrData(null);
    setMpError('');
    closePaymentModal();
  };

  React.useEffect(() => {
    if (!isPaymentModalOpen || selectedMethod !== 'CARD' || pointStatus !== 'WAITING' || !pointOrderId) return;
    let active = true;
    const checkPointPayment = async () => {
      try {
        const order = await getMercadoPagoPointOrderStatus(pointOrderId);
        if (!active) return;
        if (order.status === 'processed' || order.payment?.status === 'approved' || order.payment?.status === 'accredited') {
          if (!pointAddedRef.current) {
            pointAddedRef.current = true;
            pointPendingRef.current = false;
            setPointStatus('APPROVED');
            const reference = order.payment?.id ? `POINT-${order.payment.id}` : `POINT-${pointOrderId}`;
            addPayment({ method: 'CARD', amount: pointAmountRef.current, reference, change: 0, surchargeAmount: pointCustomRef.current ? 0 : pendingSurcharge });
            finalizeAccreditedPaymentRef.current();
            notifyAccredited('Tarjeta Point', pointAmountRef.current);
            addNotification({ title: 'Cobro con Point aprobado', message: `Transacción confirmada: ${reference}`, type: 'success' });
          }
        } else if (['failed', 'canceled', 'expired', 'refunded'].includes(order.status)) {
          pointPendingRef.current = false;
          setPointError(order.payment?.statusDetail || order.statusDetail || 'El cobro fue rechazado o cancelado.');
          setPointStatus('ERROR');
        }
      } catch (error) {
        if (!active) return;
        pointPendingRef.current = false;
        setPointError(error instanceof Error ? error.message : 'No se pudo consultar el estado del cobro con Point.');
        setPointStatus('ERROR');
      }
    };
    void checkPointPayment();
    const interval = window.setInterval(() => void checkPointPayment(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [addNotification, addPayment, amountForMethod, isPaymentModalOpen, pendingSurcharge, pointOrderId, pointStatus, selectedMethod]);

  const handleSelectMethod = (method: ExtendedPaymentMethod) => {
    setSelectedMethod(method);
    setCustomAmount('');
    setCustomAmountActive(false);
    if (pointPendingRef.current && pointOrderId) {
      void cancelMercadoPagoPointOrder(pointOrderId).catch(() => undefined);
    }
    pointPendingRef.current = false;
    pointAddedRef.current = false;
    setPointStatus('IDLE');
    setPointOrderId(null);
    setPointDeviceName(null);
    setPointError('');
    const methodHasSurcharge = method === 'CARD' || method === 'MERCADOPAGO' || method === 'CUENTA_DNI';
    const percent = method === 'MERCADOPAGO' ? 5 : method === 'CARD' ? (cardType === 'CREDIT' ? 10 : 5) : cdniPercent;
    const amount = pendingBase * (methodHasSurcharge ? 1 + percent / 100 : 1);
    setPayAmount(method === 'MERCADOPAGO' || method === 'CUENTA_DNI' ? '' : amount.toFixed(2));

    if (method === 'MERCADOPAGO') {
      void createMercadoPagoQrOrder(amount);
    } else if (method === 'CUENTA_DNI') {
      const requestId = ++cdniRequestRef.current;
      cdniProvider
        .createPayment({
          amount,
          externalReference: `TICK-${Date.now()}`,
        })
        .then((res) => {
          if (requestId === cdniRequestRef.current) setCdniPayment(res);
        })
        .catch((err) => {
          console.error('Error creando pago Cuenta DNI:', err);
          if (requestId === cdniRequestRef.current) {
            addNotification({
              title: 'Cuenta DNI no disponible',
              message: err instanceof Error ? err.message : 'No se pudo iniciar el cobro con Cuenta DNI.',
              type: 'error',
            });
          }
        });
    } else {
      if (mpPendingRef.current) {
        void cancelMercadoPagoQr().catch(() => undefined);
        mpPendingRef.current = false;
      }
      mpRequestRef.current += 1;
      cdniRequestRef.current += 1;
      setMpStatus('IDLE');
      setMpReference(null);
      setMpQrData(null);
      setMpError('');
      setCdniPayment(null);
    }
    if (method !== 'MERCADOPAGO' && method !== 'CUENTA_DNI') {
      focusAmountInput();
    }
  };

  const handleCardTypeChange = (type: 'DEBIT' | 'CREDIT') => {
    setCardType(type);
    if (selectedMethod === 'CARD') {
      setPayAmount((pendingBase * (1 + (type === 'CREDIT' ? 10 : 5) / 100)).toFixed(2));
      focusAmountInput();
    }
  };

  const handleCdniPercentChange = (percent: number) => {
    setCdniPercent(percent);
  };

  const handleConfirmCdni = async () => {
    if (!cdniPayment) return;

    const referenceNumber = `MANUAL-${Date.now()}`;
    const cashier = useAuthStore.getState().user;
    const confirmed = await cdniProvider.manuallyConfirmPayment(cdniPayment.id, {
      referenceNumber,
      confirmedByUserId: cashier?.id || 'usr-unknown',
      confirmedByUserName: cashier?.fullName || 'Usuario',
    });

    setCdniPayment(confirmed);
    const amt = chargeAmount;
    addPayment({
      method: 'QR',
      amount: amt,
      reference: `CDNI-${referenceNumber}`,
      change: 0,
      surchargeAmount: useCustomAmount ? 0 : computeSurcharge(amt, cdniPercent),
    });
    notifyAccredited('Cuenta DNI', amt);

    addNotification({
      title: 'Cuenta DNI Confirmado Manualmente',
      message: 'El pago se asoció al ticket sin comprobación automática.',
      type: 'success',
    });
  };

  const handleAddPayment = () => {
    if (submittingRef.current) return;
    const amt = Number(payAmount.replace(',', '.')) || 0;
    if (isNaN(amt) || amt <= 0) return;

    const cardRate = cardType === 'CREDIT' ? 10 : 5;
    const paymentSurcharge = selectedMethod === 'CARD'
      ? Math.min(computeSurcharge(amt, cardRate), pendingBase * (cardRate / 100))
      : 0;

    addPayment({
      method: selectedMethod === 'MERCADOPAGO' || selectedMethod === 'CUENTA_DNI' ? 'QR' : (selectedMethod as PaymentMethodType),
      amount: amt,
      reference: selectedMethod === 'MERCADOPAGO' ? mpTxId || undefined : cdniPayment?.referenceNumber || undefined,
      change: selectedMethod === 'CASH' && amt > checkoutTotal - totalPaid ? amt - (checkoutTotal - totalPaid) : 0,
      surchargeAmount: paymentSurcharge,
    });
    notifyAccredited(paymentMethodLabel({ method: selectedMethod === 'MERCADOPAGO' || selectedMethod === 'CUENTA_DNI' ? 'QR' : selectedMethod }), amt);
    setPayAmount('');
  };

  const handleConfirmCheckout = async () => {
    if (submittingRef.current) return;
    const currentState = usePOSStore.getState();
    const currentTotals = calculateCartTotals(currentState.cart, currentState.discountGlobal);
    const currentTotalPaid = currentState.payments.reduce((acc, payment) => acc + payment.amount, 0);
    const currentChange = currentState.payments.reduce((acc, payment) => acc + (payment.change || 0), 0);
    const currentSaleTotal = currentTotalPaid - currentChange;
    const currentSurcharge = currentSaleTotal - currentTotals.grandTotal;
    // ARCA factura exactamente lo efectivamente cobrado por QR o tarjeta.
    // Esto conserva el "otro monto" elegido por el cajero y cualquier recargo.
    const fiscalAmount = currentState.payments
      .filter((payment) => payment.method === 'QR' || payment.method === 'CARD')
      .reduce((acc, payment) => acc + payment.amount, 0);
    const internalAmount = Math.max(0, currentTotals.grandTotal + currentSurcharge - fiscalAmount);
    if (currentSaleTotal + 0.01 < currentTotals.grandTotal) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    let saleSaved = false;
    let sale: Sale | null = null;
    try {
      const ticketNumber = await getNextTicketNumber();
      sale = completeSale(ticketNumber, currentSurcharge);
      if (!sale) return;
      sale.fiscalAmount = fiscalAmount;
      sale.internalAmount = internalAmount;
      sale.notes = internalAmount > 0 ? `Ticket #${ticketNumber} · Importe interno: $${internalAmount.toFixed(2)}` : `Ticket #${ticketNumber}`;

      // Persistir la venta ANTES de emitir la factura ARCA para no dejar
      // comprobantes fiscales huérfanos si falla el guardado.
      const { id: _id, ...saleData } = sale;
      const saleId = await createSale.mutateAsync(saleData as any);
      sale.id = saleId;
      saleSaved = true;

      try {
        await registerBulkKardex.mutateAsync({
          items: sale.items,
          type: 'OUT_SALE',
          reference: `VENTA-${ticketNumber}`,
          notes: 'Descuento de stock por venta',
        });
      } catch (err) {
        console.error('Error descontando stock:', err);
      }

      let fiscalEmitted = false;
      let arcaError: string | null = null;
      if (navigator.onLine && fiscalAmount > 0) {
        try {
          const fiscalEvaluation = await FiscalRulesEngine.processFiscalEvaluation('CARD', {
            concept: 1,
            docType: customer.taxId ? 80 : 99,
            docNumber: customer.taxId || '00000000',
            condicionIvaId: 5,
            subtotal: fiscalAmount,
            taxTotal: 0,
            grandTotal: fiscalAmount,
            items: [{ description: 'Productos varios', quantity: 1, unitPrice: fiscalAmount, taxRate: 0, subtotal: fiscalAmount }],
          });
          if (fiscalEvaluation?.fiscalResult) {
            const fr = fiscalEvaluation.fiscalResult;
            const invoice: FiscalInvoice = {
              cae: fr.cae,
              caeExpiration: fr.caeExpiration,
              voucherType: fr.voucherType,
              voucherNumber: fr.voucherNumber,
              salesPoint: fr.salesPoint,
              emittedAt: new Date().toISOString(),
              status: fr.result,
              docType: customer.taxId ? 80 : 99,
              docNumber: customer.taxId || '00000000',
              observations: fr.observations,
              amount: fiscalAmount,
              description: 'Productos varios',
            };
            const notes = `Factura ARCA #${fr.voucherNumber} emitida por $${fiscalAmount.toFixed(2)} (Productos varios). CAE: ${fr.cae}`;
            await updateSale.mutateAsync({ id: saleId, data: { fiscalInvoice: invoice, fiscalAmount, internalAmount, notes } });
            sale.fiscalInvoice = invoice;
            sale.notes = notes;
            fiscalEmitted = true;
          } else if (fiscalEvaluation?.internalReceiptNo) {
            const notes = `Comprobante Interno: ${fiscalEvaluation.internalReceiptNo}`;
            await updateSale.mutateAsync({ id: saleId, data: { notes } });
            sale.notes = notes;
          }
        } catch (err) {
          arcaError = err instanceof Error ? err.message : 'ARCA no pudo emitir la factura.';
        }
      }

      addNotification({
        title: arcaError ? 'Venta sin factura ARCA' : 'Venta Procesada Exitosamente',
        message: arcaError
          ? `Ticket ${sale.ticketNumber} guardado, pero ARCA no emitió factura: ${arcaError}`
          : navigator.onLine
          ? `Ticket ${sale.ticketNumber} - ${fiscalEmitted ? `Factura ARCA #${sale.fiscalInvoice?.voucherNumber} (CAE OK)` : 'Comprobante Interno Emitido'}`
          : `Ticket ${sale.ticketNumber} guardado localmente. Se sincronizará al recuperar conexión.`,
        type: arcaError ? 'warning' : 'success',
      });

      setCompletedSale(sale);
    } catch (err) {
      console.error('Error al finalizar venta:', err);
      addNotification({
        title: saleSaved ? 'Venta guardada con advertencia' : 'Error al finalizar',
        message: saleSaved
          ? 'La venta se registró pero no se pudo completar un paso posterior. Verificá el inventario y la facturación.'
          : 'No se pudo guardar la venta. Intente nuevamente.',
        type: saleSaved ? 'warning' : 'error',
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  finalizeAccreditedPaymentRef.current = () => {
    window.setTimeout(() => void handleConfirmCheckout(), 0);
  };

  const chargeSettled =
    selectedMethod === 'MERCADOPAGO'
      ? mpStatus === 'APPROVED'
      : selectedMethod === 'CUENTA_DNI'
      ? cdniPayment?.status === 'MANUALLY_CONFIRMED'
      : selectedMethod === 'CARD' && pointStatus !== 'IDLE'
      ? pointStatus === 'APPROVED'
      : totalPaid >= checkoutTotal;

  const isCheckoutDisabled = !chargeSettled;

  return (
    <>
    <Dialog open={isPaymentModalOpen} onClose={handleClosePaymentModal} fullScreen slotProps={{ paper: { sx: { bgcolor: '#F8FAFC', color: '#0F172A' } } }}>
      <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0F172A', px: 3, py: 2, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <span>💳 Procesar Cobro (Pago Mixto / Múltiples Medios)</span>
         <Chip label={`TOTAL: $${totalToCollect.toFixed(2)}`} color="primary" sx={{ fontSize: '1.55rem', fontWeight: 900, py: 3, px: 1.5, borderRadius: 3, bgcolor: '#2563EB', color: '#FFFFFF' }} />
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Alert severity="info" icon={<ShieldCheck size={20} />} sx={{ mb: 3, borderRadius: 3, fontSize: '1rem', fontWeight: 700 }}>
          Política Fiscal Centralizada: Comprobante ARCA únicamente emitido si el pago de Mercado Pago, Cuenta DNI o tarjeta está APROBADO.
        </Alert>

        {accredited && (
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: '#DCFCE7',
              border: '3px solid #22C55E',
              boxShadow: '0 0 0 4px rgba(34,197,94,0.25)',
              animation: `${accreditedPop} 0.35s ease-out`,
            }}
          >
            <CheckCheck size={30} color="#16A34A" />
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803D', letterSpacing: '0.03em', lineHeight: 1.15 }}>
                PAGO ACREDITADO CON ÉXITO
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534' }}>
                {accredited.label} · ${accredited.amount.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5, fontSize: '1.1rem', color: '#0F172A' }}>
              Selecciona Medio de Pago Independiente:
            </Typography>

            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {/* 1. Efectivo */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('CASH')}
                  elevation={selectedMethod === 'CASH' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <Banknote size={24} color="#16A34A" style={{ marginBottom: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Efectivo</Typography>
                </Paper>
              </Grid>

              {/* 2. Tarjeta */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('CARD')}
                  elevation={selectedMethod === 'CARD' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <CreditCard size={24} color="#2563EB" style={{ marginBottom: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Tarjeta</Typography>
                </Paper>
              </Grid>

              {/* 3. Transferencia */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('TRANSFER')}
                  elevation={selectedMethod === 'TRANSFER' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <ArrowRightLeft size={24} color="#0284C7" style={{ marginBottom: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Transferencia</Typography>
                </Paper>
              </Grid>

              {/* 4. Mercado Pago (Independiente con Logo) */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('MERCADOPAGO')}
                  elevation={selectedMethod === 'MERCADOPAGO' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <MercadoPagoLogo height={24} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#009EE3', mt: 0.5 }}>Mercado Pago</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Pagar con QR</Typography>
                </Paper>
              </Grid>

              {/* 5. Cuenta DNI (Independiente con Logo) */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('CUENTA_DNI')}
                  elevation={selectedMethod === 'CUENTA_DNI' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <CuentaDniLogo height={24} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#008037', mt: 0.5 }}>Cuenta DNI</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Pagar con QR</Typography>
                </Paper>
              </Grid>

              {/* 6. Crédito Cliente */}
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper
                  onClick={() => handleSelectMethod('CREDIT')}
                  elevation={selectedMethod === 'CREDIT' ? 2 : 0}
                  sx={{
                    p: 1,
                    minHeight: 86,
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
                  <UserCheck size={24} color="#D97706" style={{ marginBottom: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>Crédito Cliente</Typography>
                </Paper>
              </Grid>
            </Grid>

            {hasSurcharge && !useCustomAmount && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#FFF7ED', border: '2px solid #FED7AA' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 900, color: '#9A3412' }}>Recargo por {selectedMethod === 'CARD' ? 'tarjeta' : 'QR'}:</Typography>
                  {selectedMethod === 'MERCADOPAGO' && (
                    <Chip label="5%" size="small" sx={{ fontWeight: 900, bgcolor: '#FFFFFF', border: '1px solid #FED7AA', color: '#9A3412', borderRadius: 2, fontSize: '0.9rem' }} />
                  )}
                  {selectedMethod === 'CARD' && (
                    <TextField
                      select
                      size="small"
                      label="Tipo de tarjeta"
                      value={cardType}
                      onChange={(event) => handleCardTypeChange(event.target.value as 'DEBIT' | 'CREDIT')}
                      sx={{ minWidth: 190, bgcolor: '#FFFFFF' }}
                    >
                      <MenuItem value="DEBIT">Débito (5%)</MenuItem>
                      <MenuItem value="CREDIT">Crédito (10%)</MenuItem>
                    </TextField>
                  )}
                  {selectedMethod === 'CUENTA_DNI' && (
                    <TextField
                      select
                      size="small"
                      label="Porcentaje"
                      value={cdniPercent}
                      onChange={(event) => handleCdniPercentChange(Number(event.target.value))}
                      sx={{ minWidth: 130, bgcolor: '#FFFFFF' }}
                    >
                      {[5, 6, 7, 8, 9, 10].map((percent) => <MenuItem key={percent} value={percent}>{percent}%</MenuItem>)}
                    </TextField>
                  )}
                  <Typography sx={{ fontWeight: 900, color: '#9A3412' }}>+${pendingSurcharge.toFixed(2)}</Typography>
                </Box>
              </Paper>
            )}

            {useCustomAmount && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>
                Monto final: se cobrará exactamente ${chargeAmount.toFixed(2)} (sin recargo adicional).
              </Alert>
            )}

            {/* Mercado Pago standing QR (modelo atendido): the order is attached to the caja's static QR */}
            {selectedMethod === 'MERCADOPAGO' && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3.5, bgcolor: '#F0F9FF', border: '2px solid #BAE6FD', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <MercadoPagoLogo height={28} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0369A1' }}>Cobro QR Mercado Pago</Typography>
                </Box>

                <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #BAE6FD', p: 1.5, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284C7' }}>Monto a pagar</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#075985' }}>${chargeAmount.toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <Button
                    variant={customAmountActive ? 'contained' : 'outlined'}
                    size="small"
                    disabled={mpStatus === 'APPROVED'}
                    onClick={() => setCustomAmountActive((v) => !v)}
                    sx={{ borderRadius: 2.5, fontWeight: 800 }}
                  >
                    Otro monto
                  </Button>
                  {customAmountActive && (
                    <>
                      <TextField
                        type="number"
                        size="small"
                        label="Monto final ($)"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        disabled={mpStatus === 'APPROVED'}
                        slotProps={{ input: { sx: { fontWeight: 800, bgcolor: '#FFFFFF' } } }}
                        sx={{ maxWidth: 150 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        disabled={customAmountValue <= 0 || mpStatus === 'APPROVED'}
                        onClick={() => void createMercadoPagoQrOrder(customAmountValue)}
                        sx={{ borderRadius: 2.5, fontWeight: 800, bgcolor: '#0369A1', '&:hover': { bgcolor: '#075985' } }}
                      >
                        Actualizar QR
                      </Button>
                    </>
                  )}
                </Box>

                {mpQrData ? (
                  <Box sx={{ width: 184, height: 184, display: 'grid', placeItems: 'center', margin: '0 auto 12px', bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #BAE6FD' }}>
                    <QRCodeSVG value={mpQrData} size={160} level="M" />
                  </Box>
                ) : (
                  <CircularProgress size={36} sx={{ my: 2 }} />
                )}

                {mpStatus === 'CREATING' && <Typography sx={{ mb: 1.5, fontWeight: 800, color: '#0369A1' }}>Cargando el monto al QR del mostrador...</Typography>}

                {mpStatus === 'WAITING' && (
                  <>
                    <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 2.5, border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                      <CircularProgress size={20} color="primary" />
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#0369A1' }}>
                        El cliente escanea el QR del mostrador y verá el monto a pagar automáticamente...
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                      <Button
                        variant="contained"
                        onClick={() => void verifyMercadoPagoPayment()}
                        startIcon={isVerifyingMpPayment ? <CircularProgress size={18} color="inherit" /> : <RefreshCw size={18} />}
                        disabled={isVerifyingMpPayment}
                        sx={{ borderRadius: 2.5, fontWeight: 900, bgcolor: '#0369A1', '&:hover': { bgcolor: '#075985' } }}
                      >
                        {isVerifyingMpPayment ? 'Comprobando...' : 'Comprobar pago'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setManualValidateOpen(true)}
                        startIcon={<CheckCheck size={18} />}
                        sx={{ borderRadius: 2.5, fontWeight: 900 }}
                      >
                        Validar pago manualmente
                      </Button>
                    </Box>
                  </>
                )}

                {mpStatus === 'APPROVED' && (
                  <Box sx={{ p: 1.5, bgcolor: '#DCFCE7', borderRadius: 2.5, border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCheck size={24} color="#16A34A" />
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#15803D' }}>
                      ¡Pago Confirmado Mercado Pago! ({mpTxId})
                    </Typography>
                  </Box>
                )}

                {mpStatus === 'ERROR' && (
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <Alert severity="error">{mpError}</Alert>
                    <Button variant="outlined" onClick={() => void createMercadoPagoQrOrder(chargeAmount)} sx={{ borderRadius: 2.5, fontWeight: 800 }}>
                      Generar un nuevo QR
                    </Button>
                  </Box>
                )}
              </Paper>
            )}

            {/* Cuenta DNI Manual Confirmation Flow */}
            {selectedMethod === 'CUENTA_DNI' && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3.5, bgcolor: '#F0FDF4', border: '2px solid #BBF7D0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <CuentaDniLogo height={28} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#166534' }}>Cobro QR Cuenta DNI (Banco Provincia)</Typography>
                </Box>

                <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #BBF7D0', p: 1.5, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803D' }}>Monto a cobrar</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#166534' }}>${chargeAmount.toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <Button
                    variant={customAmountActive ? 'contained' : 'outlined'}
                    size="small"
                    disabled={cdniPayment?.status === 'MANUALLY_CONFIRMED'}
                    onClick={() => setCustomAmountActive((v) => !v)}
                    sx={{ borderRadius: 2.5, fontWeight: 800 }}
                  >
                    Otro monto
                  </Button>
                  {customAmountActive && (
                    <TextField
                      type="number"
                      size="small"
                      label="Monto final ($)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      disabled={cdniPayment?.status === 'MANUALLY_CONFIRMED'}
                      slotProps={{ input: { sx: { fontWeight: 800, bgcolor: '#FFFFFF' } } }}
                      sx={{ maxWidth: 150 }}
                    />
                  )}
                </Box>

                {cdniPayment?.status === 'AWAITING_CONFIRMATION' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                    <Alert severity="warning" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                      Muestre el QR de Cuenta DNI y, cuando el cliente haya abonado, confirme el pago manualmente.
                    </Alert>
                    <Button
                      variant="contained"
                      onClick={handleConfirmCdni}
                      startIcon={<CheckCheck size={18} />}
                      sx={{ borderRadius: 2.5, fontWeight: 900, bgcolor: '#008037', '&:hover': { bgcolor: '#00662C' } }}
                    >
                      Confirmar pago manualmente
                    </Button>
                  </Box>
                )}

                {cdniPayment?.status === 'MANUALLY_CONFIRMED' && (
                  <Box sx={{ p: 1.5, bgcolor: '#DCFCE7', borderRadius: 2.5, border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CheckCheck size={24} color="#16A34A" />
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#15803D' }}>
                      Pago Confirmado Cuenta DNI
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Tarjeta: monto a ingresar en el lector de Mercado Pago */}
            {selectedMethod === 'CARD' && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3.5, bgcolor: '#EFF6FF', border: '2px solid #BFDBFE', textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  💳 Ingresá este monto en el lector de Mercado Pago
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#1D4ED8', fontSize: '3.2rem', lineHeight: 1.2, my: 1 }}>
                  ${chargeAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#64748B' }}>
                  {useCustomAmount
                    ? 'Monto final: se cobra exactamente este importe.'
                    : `Incluye recargo de ${cardType === 'CREDIT' ? 'crédito (10%)' : 'débito (5%)'}.`}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1.5, mt: 1 }}>
                  <Button
                    variant={customAmountActive ? 'contained' : 'outlined'}
                    size="small"
                    disabled={pointStatus === 'CREATING' || pointStatus === 'WAITING'}
                    onClick={() => setCustomAmountActive((v) => !v)}
                    sx={{ borderRadius: 2.5, fontWeight: 800 }}
                  >
                    Otro monto
                  </Button>
                  {customAmountActive && (
                    <TextField
                      type="number"
                      size="small"
                      label="Monto final ($)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      disabled={pointStatus === 'CREATING' || pointStatus === 'WAITING'}
                      slotProps={{ input: { sx: { fontWeight: 800, bgcolor: '#FFFFFF' } } }}
                      sx={{ maxWidth: 150 }}
                    />
                  )}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => void startPointCharge()}
                  disabled={pointStatus === 'CREATING' || pointStatus === 'WAITING'}
                  startIcon={pointStatus === 'CREATING' ? <CircularProgress size={20} color="inherit" /> : <CreditCard size={20} />}
                  sx={{ mt: 1.5, borderRadius: 2.5, fontWeight: 900, py: 1.5, fontSize: '1.05rem', bgcolor: '#009EE3', '&:hover': { bgcolor: '#0286C2' } }}
                >
                  {pointStatus === 'CREATING' ? 'Conectando con el lector...' : 'Cobrar con Point Smart'}
                </Button>

                {pointStatus === 'WAITING' && (
                  <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: 2.5, border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                    <CircularProgress size={20} color="primary" />
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#1E40AF' }}>
                      {pointDeviceName ? `Lector ${pointDeviceName}: ` : ''}el cliente apoya la tarjeta en el lector...
                    </Typography>
                  </Box>
                )}

                {pointStatus === 'APPROVED' && (
                  <Box sx={{ p: 1.5, bgcolor: '#DCFCE7', borderRadius: 2.5, border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCheck size={24} color="#16A34A" />
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#15803D' }}>
                      ¡Cobro con Point confirmado!
                    </Typography>
                  </Box>
                )}

                {pointStatus === 'ERROR' && (
                  <Box sx={{ display: 'grid', gap: 1, mt: 1.5, mb: 1 }}>
                    <Alert severity="error">{pointError}</Alert>
                    <Button variant="outlined" onClick={() => void startPointCharge()} startIcon={<RefreshCw size={18} />} sx={{ borderRadius: 2.5, fontWeight: 800 }}>
                      Volver a intentar con Point
                    </Button>
                  </Box>
                )}

                {pointStatus === 'WAITING' && (
                  <Button variant="outlined" size="small" onClick={cancelPointCharge} sx={{ borderRadius: 2.5, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
                    Cancelar cobro con Point
                  </Button>
                )}

                {pointStatus !== 'WAITING' && (
                  <>
                    <Divider sx={{ my: 1.5, borderColor: '#BFDBFE' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>
                      O ingresá el monto a mano abajo:
                    </Typography>
                  </>
                )}
              </Paper>
            )}

            {/* Standard manual payment amount field */}
            {selectedMethod !== 'MERCADOPAGO' && selectedMethod !== 'CUENTA_DNI' && pointStatus !== 'WAITING' && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <TextField
                  inputRef={amountRef}
                  fullWidth
                  label="Monto a abonar"
                  type="text"
                  inputMode="decimal"
                  value={payAmount}
                  disabled={isSubmitting}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      e.preventDefault();
                      if (totalPaid >= checkoutTotal) {
                        handleConfirmCheckout();
                      } else {
                        handleAddPayment();
                      }
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1, fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>$</Typography>,
                      sx: { borderRadius: 3, fontSize: '1.6rem', fontWeight: 900, height: 60, bgcolor: '#FFFFFF', color: '#0F172A' },
                    },
                    inputLabel: { sx: { fontWeight: 700, color: '#475569' } },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddPayment}
                  disabled={enteredAmount <= 0 || isSubmitting}
                  sx={{ height: 52, px: 3, borderRadius: 3, fontWeight: 900, fontSize: '1rem', minWidth: 120, bgcolor: '#2563EB', color: '#FFFFFF' }}
                >
                  Agregar
                </Button>
              </Box>
            )}
          </Grid>

          {/* Mixed Payment Split Summary Column */}
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, bgcolor: '#F8FAFC', border: '2px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1, fontSize: '1.4rem', color: '#0F172A' }}>
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
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.2rem' }}>
                      {p.method} {p.reference ? `(${p.reference})` : ''}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.2rem' }}>
                      ${p.amount.toFixed(2)}
                    </Typography>
                  </Box>
                ))
              )}

              <Divider sx={{ my: 2, borderColor: '#E2E8F0' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569', fontSize: '1.25rem' }}>Total de Venta:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.25rem' }}>
                  ${checkoutTotal.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569', fontSize: '1.25rem' }}>Monto Asignado:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: '#16A34A', fontSize: '1.25rem' }}>
                  ${totalPaid.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569', fontSize: '1.25rem' }}>Saldo Pendiente:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, color: checkoutTotal > totalPaid ? '#DC2626' : '#0F172A', fontSize: '1.25rem' }}>
                  ${Math.max(0, checkoutTotal - totalPaid).toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 3, border: '2px solid #BBF7D0', textAlign: 'center', mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💵 CAMBIO A ENTREGAR:
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#15803D', fontSize: '2.5rem', mt: 0.5 }}>
                  ${changePreview.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button onClick={handleClosePaymentModal} variant="outlined" disabled={isSubmitting} sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={isCheckoutDisabled || isSubmitting}
          onClick={() => void handleConfirmCheckout()}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : selectedMethod === 'MERCADOPAGO' && mpStatus === 'WAITING' ? (
              <Clock size={22} />
            ) : (
              <CheckCheck size={22} />
            )
          }
          sx={{
            py: 1.75,
            px: 4,
            borderRadius: 3.5,
            fontSize: '1.15rem',
            fontWeight: 900,
            minHeight: 52,
            bgcolor: '#16A34A',
            '&:hover': { bgcolor: '#15803D' },
            animation: isSubmitting ? `${submitPulse} 1.1s ease-in-out infinite` : undefined,
          }}
        >
          {isSubmitting
            ? 'PROCESANDO...'
            : selectedMethod === 'MERCADOPAGO' && mpStatus === 'WAITING'
            ? 'AGUARDANDO PAGO MERCADO PAGO...'
            : 'FINALIZAR VENTA'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={Boolean(completedSale)} onClose={() => setCompletedSale(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: '#15803D' }}>Venta finalizada</DialogTitle>
      <DialogContent>
        <Typography sx={{ textAlign: 'center', fontWeight: 700, color: '#334155' }}>
          El pago fue acreditado y la venta se registró correctamente.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, justifyContent: 'center', gap: 1 }}>
        <Button variant="outlined" onClick={() => setCompletedSale(null)} sx={{ fontWeight: 800 }}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={<Printer size={18} />}
          onClick={() => {
            if (!completedSale) return;
            const sale = completedSale;
            setCompletedSale(null);
            onPrintTicket(sale);
          }}
          sx={{ fontWeight: 900 }}
        >
          Imprimir ticket
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={manualValidateOpen} onClose={() => setManualValidateOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, color: '#0F172A' }}>Validar pago manualmente</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
          ¿Confirmás que el cliente pagó <Box component="span" sx={{ color: '#15803D' }}>${mpAmount.toFixed(2)}</Box> por Mercado Pago?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Usá esta opción solo si verificaste el cobro (por ejemplo, en la Point Smart o en tu celular). El pago se asociará al ticket sin comprobación automática.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={() => setManualValidateOpen(false)} variant="outlined" sx={{ borderRadius: 2.5, fontWeight: 800 }}>
          Cancelar
        </Button>
        <Button onClick={confirmManualMpValidation} variant="contained" color="success" startIcon={<CheckCheck size={18} />} sx={{ borderRadius: 2.5, fontWeight: 900 }}>
          Confirmar pago
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};
