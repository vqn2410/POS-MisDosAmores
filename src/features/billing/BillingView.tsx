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
  Grid,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Download, CheckCircle2, Sliders, ShieldCheck, Receipt, XCircle } from 'lucide-react';
import { FiscalRulesEngine, type ReceiptType } from './services/FiscalRulesEngine';
import { useSales, useUpdateSale } from '../../hooks/useSales';
import { useUpdateProduct } from '../../hooks/useProducts';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia Bancaria',
  CREDIT: 'Crédito / Cuenta Corriente',
  MERCADOPAGO_QR: 'QR Mercado Pago',
  MERCADOPAGO_CARD: 'Tarjeta Mercado Pago',
  CARD: 'Otras Tarjetas',
};

export const BillingView: React.FC = () => {
  const [rules, setRules] = React.useState(FiscalRulesEngine.getRules());
  const { data: sales = [] } = useSales();

  const handleRuleChange = (paymentMethod: string, newType: ReceiptType) => {
    FiscalRulesEngine.setRule(paymentMethod, newType);
    setRules(FiscalRulesEngine.getRules());
  };

  const updateSale = useUpdateSale();
  const updateProduct = useUpdateProduct();

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);

  const statusLabel = (s: typeof sales[0]): string => {
    if (s.status === 'COMPLETED') return 'EMITIDO';
    if (s.status === 'CANCELLED') return 'ANULADO';
    return s.status;
  };

  const statusColor = (s: typeof sales[0]): 'success' | 'error' | 'warning' | 'default' => {
    if (s.status === 'COMPLETED') return 'success';
    if (s.status === 'CANCELLED') return 'error';
    return 'warning';
  };

  const handleCancelSale = () => {
    const sale = sales.find((s) => s.id === cancelTargetId);
    if (!sale) return;

    const updates: Partial<typeof sale> = {
      status: 'CANCELLED',
      notes: sale.notes
        ? `${sale.notes} | ANULADO ${new Date().toISOString()}`
        : `ANULADO ${new Date().toISOString()}`,
    };

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

  const comprobantes = sales.map((s) => ({
    id: s.id,
    ticketNumber: s.ticketNumber,
    receiverName: s.customerName || 'Consumidor Final',
    taxId: '',
    total: s.grandTotal,
    type: s.notes?.includes('CAE') ? ('ARCA' as const) : ('INTERNO' as const),
    cae: s.notes?.includes('CAE') ? s.notes.match(/CAE: (\S+)/)?.[1] || '' : '',
    status: statusLabel(s),
    rawStatus: s.status,
    createdAt: s.createdAt,
    hasFiles: false,
  }));

  return (
    <><Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            🧾 Facturación Electrónica ARCA & Reglas Fiscales
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Capa de Abstracción para PACs, ARCA (AFIP) y Motor de Reglas Fiscales por Medio de Pago
          </Typography>
        </Box>
        <Chip
          icon={<CheckCircle2 size={18} />}
          label="ARCA WSAA: Activo & Timbrando"
          color="success"
          sx={{ fontWeight: 800, fontSize: '0.95rem', py: 2.5, px: 1, borderRadius: 3 }}
        />
      </Box>

      <Paper elevation={1} sx={{ p: 3.5, mb: 4, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Sliders size={26} color="#2563EB" />
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>
            Configuración del Motor de Reglas Fiscales (ARCA vs Interno)
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Define qué medios de pago emiten comprobantes fiscales timbrados por ARCA (con CAE) y cuáles generan únicamente comprobante interno.
        </Typography>

        <Grid container spacing={2.5}>
          {Object.entries(rules).map(([method, receiptType]) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={method}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: '#0F172A' }}>
                  {METHOD_LABELS[method] || method}
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={receiptType}
                  onChange={(e) => handleRuleChange(method, e.target.value as ReceiptType)}
                  sx={{ borderRadius: 2.5, bgcolor: '#FFFFFF', fontWeight: 800, fontSize: '1rem', height: 48 }}
                >
                  <MenuItem value="INTERNAL_RECEIPT" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                    🧾 Comprobante Interno
                  </MenuItem>
                  <MenuItem value="FISCAL_INVOICE" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                    📄 Factura Fiscal (ARCA)
                  </MenuItem>
                </Select>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <Receipt size={26} color="#16A34A" /> Historial de Comprobantes Emitidos
      </Typography>

      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ticket</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Monto</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>CAE / UUID</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comprobantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No hay comprobantes emitidos aún.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              comprobantes.map((c) => (
                <TableRow key={c.id} hover sx={{ minHeight: 64 }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.ticketNumber}</TableCell>
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
            Se marcará como ANULADO y se devolverá el stock de los productos. Esta acción no se puede deshacer.
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
    </>
  );
};
