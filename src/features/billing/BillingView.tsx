import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
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
  CircularProgress,
  TextField,
  MenuItem,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Download, CheckCircle2, Receipt, XCircle, Printer, ArrowLeft, Search, FilterX, ClipboardPaste, AlertTriangle, PartyPopper } from 'lucide-react';
import {
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useSales, useUpdateSale } from '../../hooks/useSales';
import { useRegisterBulkKardex } from '../../hooks/useKardex';
import { POSTicketPrintModal } from '../pos/components/POSTicketPrintModal';
import { createArcaInvoice } from '../../services/arcaApi';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { Sale, FiscalInvoice } from '../../types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { paymentMethodKey, paymentMethodLabel } from '../pos/utils/paymentLabels';

const CREDIT_NOTE_TYPES: Record<number, number> = { 1: 3, 3: 1, 6: 8, 8: 6, 11: 13, 13: 11, 2: 5, 5: 2, 109: 110, 110: 109 };

const PAYMENT_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos los medios' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CREDIT', label: 'Crédito Cliente' },
  { value: 'MERCADOPAGO', label: 'Mercado Pago' },
  { value: 'CUENTA_DNI', label: 'Cuenta DNI' },
];

function toDate(value: unknown): Date {
  const firestoreTimestamp = value as { toDate?: () => Date } | null;
  const date = firestoreTimestamp?.toDate?.() ?? new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

interface ArcaReportRow {
  salesPoint: number;
  number: number;
  voucherType: number;
  amount: number;
}

function parseArAmount(raw: string): number {
  const clean = raw.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(clean);
  return Number.isNaN(n) ? 0 : n;
}

function parseArcaReportLines(text: string): ArcaReportRow[] {
  const dates = [...text.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => m.index);
  if (dates.length === 0) return [];
  const rows: ArcaReportRow[] = [];
  for (let i = 0; i < dates.length; i++) {
    const seg = text.slice(dates[i], i + 1 < dates.length ? dates[i + 1] : undefined);
    const voucher = seg.match(/(\d{3,5})-(\d{8})/);
    const type = seg.match(/^\d{2}\/\d{2}\/\d{4}\s+(\d{1,3})\b/);
    const amount = seg.match(/\$\s*([\d.,]+)/);
    if (!voucher || !amount) continue;
    rows.push({
      salesPoint: parseInt(voucher[1], 10),
      number: parseInt(voucher[2], 10),
      voucherType: type ? parseInt(type[1], 10) : 11,
      amount: parseArAmount(amount[1]),
    });
  }
  rows.sort((a, b) => a.number - b.number);
  return rows;
}

function formatIssuedAt(value: unknown): string {
  const firestoreTimestamp = value as { toDate?: () => Date } | null;
  const date = firestoreTimestamp?.toDate?.() ?? new Date(value as string);

  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 1, borderBottom: '1px solid', borderColor: '#F1F5F9' }}>
    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
    <Box sx={{ textAlign: 'right', minWidth: 0 }}>{children}</Box>
  </Box>
);

export const BillingView: React.FC = () => {
  const { data: sales = [] } = useSales();
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const updateSale = useUpdateSale();
  const registerBulkKardex = useRegisterBulkKardex();

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const [invoiceTargetId, setInvoiceTargetId] = React.useState<string | null>(null);
  const [printSale, setPrintSale] = React.useState<Sale | null>(null);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [paymentFilter, setPaymentFilter] = React.useState('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPaymentFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  // Anti doble emisión de factura: un mismo comprobante solo se factura UNA vez.
  const emittingRef = React.useRef<Set<string>>(new Set());
  const [emittingIds, setEmittingIds] = React.useState<Set<string>>(new Set());

  // Subsanación de duplicados ARCA (Notas de Crédito).
  const [repairOpen, setRepairOpen] = React.useState(false);
  const [repairText, setRepairText] = React.useState('');
  const [parsedRows, setParsedRows] = React.useState<ArcaReportRow[]>([]);
  const [selectedNums, setSelectedNums] = React.useState<Set<string>>(new Set());
  const [repairBusy, setRepairBusy] = React.useState(false);
  const [repairLog, setRepairLog] = React.useState<{ ok: boolean; message: string }[]>([]);

  const rowKey = (salesPoint: number, number: number) => `${salesPoint}-${number}`;

  const analyzeReport = () => {
    const rows = parseArcaReportLines(repairText);
    setParsedRows(rows);
    const counts = new Map<number, number>();
    rows.forEach((r) => counts.set(r.amount, (counts.get(r.amount) || 0) + 1));
    const selected = new Set<string>();
    const seen = new Map<number, boolean>();
    rows.forEach((r) => {
      if ((counts.get(r.amount) || 0) > 1) {
        if (seen.get(r.amount)) selected.add(rowKey(r.salesPoint, r.number));
        seen.set(r.amount, true);
      }
    });
    setSelectedNums(selected);
    setRepairLog([]);
  };

  const toggleRepairRow = (key: string) => {
    setSelectedNums((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const emitSelectedCreditNotes = async () => {
    if (repairBusy) return;
    setRepairBusy(true);
    setRepairLog([]);
    const log: { ok: boolean; message: string }[] = [];
    for (const row of parsedRows) {
      const key = rowKey(row.salesPoint, row.number);
      if (!selectedNums.has(key)) continue;
      try {
        const { fiscalResult } = await createArcaInvoice({
          voucherType: CREDIT_NOTE_TYPES[row.voucherType] ?? 13,
          concept: 1,
          docType: 99,
          docNumber: '00000000',
          condicionIvaId: 5,
          subtotal: row.amount,
          taxTotal: 0,
          grandTotal: row.amount,
          associatedInvoice: { voucherType: row.voucherType, salesPoint: row.salesPoint, voucherNumber: row.number },
        });
        log.push({
          ok: true,
          message: `NC #${fiscalResult.voucherNumber} (CAE ${fiscalResult.cae}) emitida para anular ${String(row.salesPoint).padStart(4, '0')}-${String(row.number).padStart(8, '0')} ($${row.amount.toFixed(2)})`,
        });
      } catch (err) {
        log.push({
          ok: false,
          message: `Comprobante ${String(row.salesPoint).padStart(4, '0')}-${String(row.number).padStart(8, '0')}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    setRepairLog(log);
    setRepairBusy(false);
    const okCount = log.filter((l) => l.ok).length;
    addNotification({
      title: 'Subsanación de duplicados',
      message: okCount > 0 ? `${okCount} nota(s) de crédito emitida(s) correctamente.` : 'No se pudo emitir ninguna nota de crédito.',
      type: okCount > 0 ? 'success' : 'error',
    });
  };

  const statusLabel = (s: typeof sales[0]): string => {
    if (s.status === 'COMPLETED') return 'EMITIDO';
    if (s.status === 'CANCELLED') return 'ANULADO';
    if (s.status === 'REFUNDED') return 'REINTEGRADO';
    return s.status;
  };

  const statusColor = (s: typeof sales[0]): 'success' | 'error' | 'warning' | 'default' => {
    if (s.status === 'COMPLETED') return 'success';
    if (s.status === 'CANCELLED') return 'error';
    if (s.status === 'REFUNDED') return 'warning';
    return 'warning';
  };

  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleCancelSale = async () => {
    const sale = sales.find((s) => s.id === cancelTargetId);
    if (!sale) return;

    const updates: Partial<Sale> = {
      status: 'CANCELLED',
      notes: sale.notes
        ? `${sale.notes} | ANULADO ${new Date().toISOString()}`
        : `ANULADO ${new Date().toISOString()}`,
    };

    if (sale.fiscalInvoice) {
      const original = sale.fiscalInvoice;
      const creditNoteType = CREDIT_NOTE_TYPES[original.voucherType] ?? 13;
      try {
        const { fiscalResult } = await createArcaInvoice({
          voucherType: creditNoteType,
          concept: 1,
          docType: original.docType ?? 99,
          docNumber: original.docNumber || '00000000',
          condicionIvaId: 5,
          subtotal: sale.grandTotal,
          taxTotal: 0,
          grandTotal: sale.grandTotal,
          associatedInvoice: {
            voucherType: original.voucherType,
            salesPoint: original.salesPoint,
            voucherNumber: original.voucherNumber,
          },
        });

        const creditNote: FiscalInvoice = {
          cae: fiscalResult.cae,
          caeExpiration: fiscalResult.caeExpiration,
          voucherType: fiscalResult.voucherType,
          voucherNumber: fiscalResult.voucherNumber,
          salesPoint: fiscalResult.salesPoint,
          emittedAt: new Date().toISOString(),
          status: fiscalResult.result,
          docType: original.docType ?? 99,
          docNumber: original.docNumber || '00000000',
          observations: fiscalResult.observations,
        };

        updates.status = 'REFUNDED';
        updates.fiscalCreditNote = creditNote;
        updates.notes = `${updates.notes} | NC ARCA #${fiscalResult.voucherNumber} (CAE ${fiscalResult.cae})`;
      } catch (err) {
        addNotification({
          title: 'No se pudo emitir Nota de Crédito',
          message: `El comprobante se anuló, pero ARCA no autorizó la NC del original #${original.voucherNumber}: ${err instanceof Error ? err.message : String(err)}`,
          type: 'warning',
        });
      }
    }

    updateSale.mutate(
      { id: sale.id, data: updates },
      {
        onSuccess: () => {
          registerBulkKardex.mutate({
            items: sale.items,
            type: 'IN_RETURN',
            reference: `REVERSION-${sale.ticketNumber}`,
            notes: 'Reintegro de stock por anulacion / nota de credito',
          });
          setCancelTargetId(null);
        },
      },
    );
  };

  const handleEmitInvoice = async () => {
    const id = invoiceTargetId;
    if (!id) return;
    if (emittingRef.current.has(id)) return;
    emittingRef.current.add(id);
    setEmittingIds(new Set(emittingRef.current));
    const sale = sales.find((s) => s.id === id);
    if (!sale) {
      emittingRef.current.delete(id);
      setEmittingIds(new Set(emittingRef.current));
      return;
    }

    try {
      const { fiscalResult } = await createArcaInvoice({
        concept: 1,
        docType: 99,
        docNumber: '00000000',
        condicionIvaId: 5,
        subtotal: sale.grandTotal,
        taxTotal: 0,
        grandTotal: sale.grandTotal,
      });

      const invoice: FiscalInvoice = {
        cae: fiscalResult.cae,
        caeExpiration: fiscalResult.caeExpiration,
        voucherType: fiscalResult.voucherType,
        voucherNumber: fiscalResult.voucherNumber,
        salesPoint: fiscalResult.salesPoint,
        emittedAt: new Date().toISOString(),
        status: fiscalResult.result,
        docType: 99,
        docNumber: '00000000',
        observations: fiscalResult.observations,
      };

      updateSale.mutate(
        { id: sale.id, data: { fiscalInvoice: invoice, notes: `${sale.notes ? `${sale.notes} | ` : ''}Factura ARCA #${fiscalResult.voucherNumber} emitida. CAE: ${fiscalResult.cae}` } },
        {
          onSuccess: () => {
            addNotification({
              title: 'Factura ARCA emitida',
              message: `Venta #${sale.ticketNumber} facturada. CAE: ${fiscalResult.cae}`,
              type: 'success',
            });
            setInvoiceTargetId(null);
          },
          onError: () => {
            addNotification({
              title: 'Factura emitida pero no guardada',
              message: `El comprobante #${fiscalResult.voucherNumber} ya fue emitido en AFIP (CAE ${fiscalResult.cae}). Recargá la vista; no vuelvas a facturar esta venta para evitar duplicados.`,
              type: 'warning',
            });
            setInvoiceTargetId(null);
          },
        },
      );
    } catch (err) {
      addNotification({
        title: 'No se pudo emitir la factura ARCA',
        message: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      emittingRef.current.delete(id);
      setEmittingIds(new Set(emittingRef.current));
    }
  };

  const needsInvoice = (id: string): boolean => {
    const s = sales.find((x) => x.id === id);
    return !!s && s.status === 'COMPLETED' && !s.fiscalInvoice && !emittingRef.current.has(id) && s.payments?.some((p) => p.method === 'QR' || p.method === 'CARD');
  };

  const comprobantes = sales.map((s) => {
    const notes = typeof s.notes === 'string' ? s.notes : '';
    return {
    id: s.id,
    ticketNumber: s.ticketNumber,
    receiverName: s.customerName || 'Consumidor Final',
    taxId: '',
    total: s.grandTotal,
    type: notes.includes('CAE') ? ('ARCA' as const) : ('INTERNO' as const),
    cae: notes.includes('CAE') ? notes.match(/CAE: (\S+)/)?.[1] || '' : '',
    voucherNumber: s.fiscalInvoice?.voucherNumber ?? (Number(notes.match(/Factura ARCA #(\d+)/)?.[1] || 0) || null),
    status: statusLabel(s),
    rawStatus: s.status,
    createdAt: s.createdAt,
    hasFiles: false,
  };
  });

  const filteredComprobantes = comprobantes.filter((c) => {
    const query = search.trim().toLowerCase();
    if (query) {
      const haystack = `${c.ticketNumber} ${c.receiverName}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (statusFilter !== 'ALL' && c.rawStatus !== statusFilter) return false;
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (paymentFilter !== 'ALL') {
      const methods = sales.find((s) => s.id === c.id)?.payments?.map((p) => paymentMethodKey(p)) ?? [];
      if (!methods.includes(paymentFilter)) return false;
    }
    if (dateFrom || dateTo) {
      const time = toDate(c.createdAt).getTime();
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`).getTime();
        if (time < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`).getTime();
        if (time > to) return false;
      }
    }
    return true;
  });

  const renderActions = (c: (typeof comprobantes)[number], align: 'flex-start' | 'flex-end' = 'flex-end') => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: align, flexWrap: 'wrap' }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Printer size={16} />}
        onClick={() => {
          const sale = sales.find((item) => item.id === c.id);
          if (sale) setPrintSale(sale);
        }}
        sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 36 }}
      >
        Imprimir
      </Button>
      {needsInvoice(c.id) && (
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={emittingIds.has(c.id) ? <CircularProgress size={14} color="inherit" /> : <Receipt size={16} />}
          disabled={emittingIds.has(c.id)}
          onClick={() => setInvoiceTargetId(c.id)}
          sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 36 }}
        >
          {emittingIds.has(c.id) ? 'Emitiendo...' : 'Facturar'}
        </Button>
      )}
      {c.rawStatus === 'COMPLETED' && (
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<XCircle size={16} />}
          onClick={() => setCancelTargetId(c.id)}
          sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 36 }}
        >
          Anular
        </Button>
      )}
      {c.hasFiles ? (
        <Button size="small" variant="outlined" startIcon={<Download size={16} />} sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 36 }}>
          PDF / XML
        </Button>
      ) : null}
    </Box>
  );

  return (
    <><Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
           🧾 Comprobantes Emitidos
          </Typography>
          <Typography variant="body1" color="text.secondary">
           Consulta, impresión y anulación de comprobantes emitidos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<ClipboardPaste size={18} />} onClick={() => setRepairOpen(true)} sx={{ borderRadius: 3, minHeight: 44, fontWeight: 800, color: '#B45309', borderColor: '#FCD34D' }}>
            Reparar duplicados ARCA
          </Button>
          <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => setActiveTab('pos')} sx={{ borderRadius: 3, minHeight: 44, fontWeight: 800 }}>
            Volver al POS
          </Button>
          <Chip
            icon={<CheckCircle2 size={18} />}
            label="ARCA WSAA: Activo & Timbrando"
            color="success"
            sx={{ fontWeight: 800, fontSize: '0.95rem', py: 2.5, px: 1, borderRadius: 3 }}
          />
        </Box>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <Receipt size={26} color="#16A34A" /> Historial de Comprobantes Emitidos
      </Typography>

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '2px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar por ticket o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search size={18} color="#64748B" style={{ marginRight: 6 }} />,
              },
            }}
            sx={{ flex: '1 1 220px', minWidth: 220, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="COMPLETED">Emitido</MenuItem>
            <MenuItem value="CANCELLED">Anulado</MenuItem>
            <MenuItem value="REFUNDED">Reintegrado</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 120, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="ARCA">ARCA</MenuItem>
            <MenuItem value="INTERNO">Interno</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Medio de pago"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            sx={{ minWidth: 170, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          >
            {PAYMENT_FILTERS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="Desde"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <TextField
            type="date"
            size="small"
            label="Hasta"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterX size={18} />}
            onClick={clearFilters}
            sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 40, color: '#475569', borderColor: '#CBD5E1' }}
          >
            Limpiar filtros
          </Button>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', mt: 1.5, display: 'block' }}>
          Mostrando {filteredComprobantes.length} de {comprobantes.length} comprobantes
        </Typography>
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredComprobantes.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', textAlign: 'center', bgcolor: '#FFFFFF' }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                {comprobantes.length === 0 ? 'No hay comprobantes emitidos aún.' : 'No se encontraron comprobantes con los filtros seleccionados.'}
              </Typography>
            </Paper>
          ) : (
            filteredComprobantes.map((c) => {
              const sale = sales.find((s) => s.id === c.id);
              const payments = sale?.payments || [];
              return (
                <Paper key={c.id} elevation={1} sx={{ p: 2.5, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>{c.ticketNumber}</Typography>
                    <Chip label={c.status} color={statusColor(sale!)} size="small" sx={{ fontWeight: 800 }} />
                  </Box>
                  <Field label="Fecha y hora de emisión">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>{formatIssuedAt(c.createdAt)}</Typography>
                  </Field>
                  <Field label="Cliente">
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{c.receiverName}</Typography>
                  </Field>
                  <Field label="Tipo">
                    {c.type === 'ARCA' ? (
                      <Chip label="ARCA" color="primary" size="small" sx={{ fontWeight: 800, borderRadius: 2 }} />
                    ) : (
                      <Chip label="Interno" variant="outlined" color="default" size="small" sx={{ fontWeight: 800, borderRadius: 2, borderColor: '#94A3B8', color: '#475569' }} />
                    )}
                  </Field>
                  <Field label="Medio de pago">
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end' }}>
                      {payments.length === 0 ? (
                        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>—</Typography>
                      ) : (
                        payments.map((p, i) => (
                          <Chip key={i} label={paymentMethodLabel(p)} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                        ))
                      )}
                    </Box>
                  </Field>
                  <Field label="N° AFIP">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                      {c.voucherNumber ? String(c.voucherNumber).padStart(8, '0') : '—'}
                    </Typography>
                  </Field>
                  <Field label="Monto">
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.15rem' }}>${c.total.toFixed(2)}</Typography>
                  </Field>
                  <Field label="CAE / UUID">
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748B', wordBreak: 'break-all' }}>
                      {c.cae || '—'}
                    </Typography>
                  </Field>
                  <Box sx={{ mt: 2 }}>{renderActions(c, 'flex-start')}</Box>
                </Paper>
              );
            })
          )}
        </Box>
      ) : (
        <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ticket</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Fecha y hora de emisión</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Medio de pago</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>N° AFIP</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Monto</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>CAE / UUID</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredComprobantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {comprobantes.length === 0 ? 'No hay comprobantes emitidos aún.' : 'No se encontraron comprobantes con los filtros seleccionados.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredComprobantes.map((c) => (
                  <TableRow key={c.id} hover sx={{ minHeight: 64 }}>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.ticketNumber}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600 }}>
                      {formatIssuedAt(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>{c.receiverName}</Typography>
                    </TableCell>
                    <TableCell>
                      {c.type === 'ARCA' ? (
                        <Chip label="ARCA" color="primary" size="small" sx={{ fontWeight: 800, borderRadius: 2 }} />
                      ) : (
                        <Chip label="Interno" variant="outlined" color="default" size="small" sx={{ fontWeight: 800, borderRadius: 2, borderColor: '#94A3B8', color: '#475569' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(sales.find((s) => s.id === c.id)?.payments || []).map((p, i) => (
                          <Chip key={i} label={paymentMethodLabel(p)} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A' }}>
                        {c.voucherNumber ? String(c.voucherNumber).padStart(8, '0') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.15rem' }}>${c.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={c.status} color={statusColor(sales.find(s => s.id === c.id)!)}
                        size="medium" sx={{ fontWeight: 800 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748B' }}>
                        {c.cae || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {renderActions(c, 'flex-end')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
      </Box>

      <Dialog open={!!cancelTargetId} onClose={() => setCancelTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>¿Anular comprobante?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>
            {cancelTargetId && sales.find((s) => s.id === cancelTargetId)?.fiscalInvoice
              ? 'Se emitirá una Nota de Crédito ARCA vinculada al comprobante original y se devolverá el stock. Esta acción no se puede deshacer.'
              : 'Se marcará como ANULADO y se devolverá el stock de los productos. Esta acción no se puede deshacer.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCancelTargetId(null)} variant="outlined" sx={{ borderRadius: 3, fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleCancelSale}
            variant="contained"
            color="error"
            disabled={updateSale.isPending}
            sx={{ borderRadius: 3, fontWeight: 900 }}
          >
            {updateSale.isPending ? <CircularProgress size={20} /> : 'Sí, anular'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!invoiceTargetId} onClose={() => setInvoiceTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>¿Emitir factura ARCA?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>
            Se emitirá un comprobante electrónico a consumidor final por el total de la venta y quedará vinculado a este ticket. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setInvoiceTargetId(null)} variant="outlined" sx={{ borderRadius: 3, fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleEmitInvoice}
            variant="contained"
            color="primary"
            disabled={updateSale.isPending}
            sx={{ borderRadius: 3, fontWeight: 900 }}
          >
            {updateSale.isPending ? <CircularProgress size={20} /> : 'Emitir factura'}
          </Button>
        </DialogActions>
      </Dialog>
      <POSTicketPrintModal sale={printSale} onClose={() => setPrintSale(null)} />

      <Dialog open={repairOpen} onClose={() => setRepairOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: '#0F172A' }}>🛠️ Subsanar duplicados ARCA</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5, fontWeight: 700 }}>
            Usá esta herramienta SOLO si AFIP muestra más comprobantes que ventas reales (verificá el cierre de caja). Cada duplicado seleccionado emitirá una Nota de Crédito vinculada al comprobante original.
          </Alert>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', mb: 1 }}>
            Pegá el detalle de comprobantes de AFIP (una línea por comprobante) y presioná "Analizar":
          </Typography>
          <TextField
            multiline
            rows={5}
            fullWidth
            value={repairText}
            onChange={(e) => setRepairText(e.target.value)}
            placeholder={"01/08/2026\t11 - Factura C\t00003-00000006\t\t$  9240,00\n01/08/2026\t11 - Factura C\t00003-00000007\t\t$  9240,00"}
            slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem', bgcolor: '#FFFFFF' } } }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5, mb: 2 }}>
            <Button variant="contained" startIcon={<Search size={18} />} onClick={analyzeReport} sx={{ borderRadius: 2.5, fontWeight: 900, bgcolor: '#2563EB' }}>
              Analizar
            </Button>
            {parsedRows.length > 0 && (
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#64748B' }}>
                {parsedRows.length} comprobante(s) analizado(s)
              </Typography>
            )}
          </Box>

          {parsedRows.length > 0 && (
            <>
              <Paper elevation={0} sx={{ borderRadius: 3, border: '2px solid #E2E8F0', bgcolor: '#FFFFFF', overflow: 'hidden', mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Comprobante</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Monto</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Duplicado</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Emitir NC</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedRows.map((row) => {
                      const dupCount = parsedRows.filter((r) => r.amount === row.amount).length;
                      const isDup = dupCount > 1;
                      const key = rowKey(row.salesPoint, row.number);
                      return (
                        <TableRow key={key} hover sx={{ bgcolor: isDup ? '#FFFBEB' : 'inherit' }}>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {String(row.salesPoint).padStart(4, '0')}-{String(row.number).padStart(8, '0')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#475569' }}>
                            {row.voucherType === 11 ? 'Factura C' : `Tipo ${row.voucherType}`}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 900, color: '#2563EB' }}>${row.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {isDup ? (
                              <Chip size="small" icon={<AlertTriangle size={14} />} label={`${dupCount} con mismo monto`} color="warning" sx={{ fontWeight: 800, borderRadius: 2 }} />
                            ) : (
                              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>No</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <FormControlLabel
                              control={<Checkbox checked={selectedNums.has(key)} disabled={repairBusy} onChange={() => toggleRepairRow(key)} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>NC</Typography>}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={repairBusy || selectedNums.size === 0}
                  onClick={() => void emitSelectedCreditNotes()}
                  startIcon={repairBusy ? <CircularProgress size={18} color="inherit" /> : <PartyPopper size={18} />}
                  sx={{ borderRadius: 2.5, fontWeight: 900, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
                >
                  {repairBusy ? 'Emitiendo notas de crédito...' : `Emitir ${selectedNums.size} Nota(s) de Crédito`}
                </Button>
              </Box>
              {repairLog.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {repairLog.map((l, i) => (
                    <Alert key={i} severity={l.ok ? 'success' : 'error'} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                      {l.message}
                    </Alert>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRepairOpen(false)} variant="outlined" sx={{ borderRadius: 3, fontWeight: 800 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
