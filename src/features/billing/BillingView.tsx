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
} from '@mui/material';
import { Download, CheckCircle2, Receipt, XCircle, Printer, ArrowLeft } from 'lucide-react';
import { useSales, useUpdateSale } from '../../hooks/useSales';
import { useUpdateProduct } from '../../hooks/useProducts';
import { POSTicketPrintModal } from '../pos/components/POSTicketPrintModal';
import { createArcaInvoice } from '../../services/arcaApi';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { Sale, FiscalInvoice } from '../../types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const CREDIT_NOTE_TYPES: Record<number, number> = { 1: 3, 3: 1, 6: 8, 8: 6, 11: 13, 13: 11, 2: 5, 5: 2, 109: 110, 110: 109 };

function formatIssuedAt(value: unknown): string {
  const firestoreTimestamp = value as { toDate?: () => Date } | null;
  const date = firestoreTimestamp?.toDate?.() ?? new Date(value as string);

  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export const BillingView: React.FC = () => {
  const { data: sales = [] } = useSales();
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab);

  const updateSale = useUpdateSale();
  const updateProduct = useUpdateProduct();

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const [invoiceTargetId, setInvoiceTargetId] = React.useState<string | null>(null);
  const [printSale, setPrintSale] = React.useState<Sale | null>(null);

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
          sale.items.forEach((item) => {
            if (item.product.tracksStock !== false && !item.isVariableProduct) {
              updateProduct.mutate({
                id: item.product.id,
                data: { stock: (item.product.stock || 0) + item.quantity },
              });
            }
          });
          setCancelTargetId(null);
        },
      },
    );
  };

  const handleEmitInvoice = async () => {
    const sale = sales.find((s) => s.id === invoiceTargetId);
    if (!sale) return;

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
        },
      );
    } catch (err) {
      addNotification({
        title: 'No se pudo emitir la factura ARCA',
        message: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    }
  };

  const needsInvoice = (id: string): boolean => {
    const s = sales.find((x) => x.id === id);
    return !!s && s.status === 'COMPLETED' && !s.fiscalInvoice && s.payments?.some((p) => p.method === 'QR' || p.method === 'CARD');
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

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ticket</TableCell>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Fecha y hora de emisión</TableCell>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Cliente</TableCell>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tipo</TableCell>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>N° AFIP</TableCell>
               <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Monto</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>CAE / UUID</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comprobantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No hay comprobantes emitidos aún.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              comprobantes.map((c) => (
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
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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
                          startIcon={<Receipt size={16} />}
                          onClick={() => setInvoiceTargetId(c.id)}
                          sx={{ borderRadius: 2.5, fontWeight: 800, minHeight: 36 }}
                        >
                          Facturar
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
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
    </>
  );
};
