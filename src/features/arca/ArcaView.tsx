import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { CircleCheck, ClipboardPaste, FileMinus, FileText, Landmark, Search } from 'lucide-react';
import { useArcaReportVouchers, useImportArcaReportVouchers } from '../../hooks/useArcaReportVouchers';
import { useCreditNotes } from '../../hooks/useCreditNotes';
import { useSales } from '../../hooks/useSales';
import { getArcaInvoice, type ArcaComprobante, type ArcaInvoiceDetails } from '../../services/arcaApi';
import type { FiscalInvoice } from '../../types';

const labels: Record<number, string> = { 1: 'Factura A', 3: 'Nota Crédito A', 6: 'Factura B', 8: 'Nota Crédito B', 11: 'Factura C', 13: 'Nota Crédito C' };
const invoiceTypes = new Set([1, 6, 11]);
const creditNoteTypes = new Set([3, 8, 13]);

type Row = ArcaComprobante & { emittedAt: string; source: 'VENTA' | 'NC' | 'AFIP'; associated?: string };
type Filter = 'TODOS' | 'FACTURAS' | 'NC';
const summaryIcons = { FileText, CircleCheck, FileMinus, Landmark };

const money = (value: number) => `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = (row: Row) => `${String(row.salesPoint).padStart(4, '0')}-${String(row.voucherNumber).padStart(8, '0')}`;
const dateOnly = (value: string) => value ? new Date(value).toLocaleDateString('en-CA') : '';

function parseAfipReport(text: string) {
  const dates = [...text.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
  return dates.flatMap((match, index) => {
    const section = text.slice(match.index, dates[index + 1]?.index);
    const voucher = section.match(/(\d{3,5})-(\d{8})/);
    const type = section.match(/^\d{2}\/\d{2}\/\d{4}\s+(\d{1,3})\b/);
    const amount = section.match(/\$\s*([\d.,]+)/);
    if (!voucher || !amount) return [];
    return [{
      voucherType: Number(type?.[1] || 11), salesPoint: Number(voucher[1]), voucherNumber: Number(voucher[2]),
      date: `${match[3]}-${match[2]}-${match[1]}T12:00:00`, amount: Number(amount[1].replace(/\./g, '').replace(',', '.')),
      importedAt: new Date().toISOString(),
    }];
  });
}

export const ArcaView: React.FC = () => {
  const { data: sales = [] } = useSales();
  const { data: creditNotes = [] } = useCreditNotes();
  const { data: reportVouchers = [] } = useArcaReportVouchers();
  const importReport = useImportArcaReportVouchers();
  const [date, setDate] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('TODOS');
  const [checking, setChecking] = React.useState<Row | null>(null);
  const [verified, setVerified] = React.useState<ArcaInvoiceDetails | null>(null);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importError, setImportError] = React.useState<string | null>(null);

  const rows = React.useMemo(() => {
    const seen = new Set<string>();
    const add = (row: Row, list: Row[]) => {
      const key = `${row.voucherType}-${row.salesPoint}-${row.voucherNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(row);
      }
    };
    const list: Row[] = [];
    sales.forEach((sale) => {
      const addFiscal = (fiscal: FiscalInvoice | undefined, source: 'VENTA' | 'NC') => {
        if (!fiscal) return;
        add({ voucherType: fiscal.voucherType, salesPoint: fiscal.salesPoint, voucherNumber: fiscal.voucherNumber, date: fiscal.emittedAt, emittedAt: fiscal.emittedAt, amount: sale.grandTotal, result: fiscal.status, cae: fiscal.cae, source }, list);
      };
      addFiscal(sale.fiscalInvoice, 'VENTA');
      addFiscal(sale.fiscalCreditNote, 'NC');
    });
    creditNotes.forEach((nc) => add({ voucherType: nc.voucherType, salesPoint: nc.salesPoint, voucherNumber: nc.voucherNumber, date: nc.createdAt, emittedAt: nc.createdAt, amount: nc.amount, result: 'A', cae: nc.cae, source: 'NC', associated: `${String(nc.associatedVoucher.salesPoint).padStart(4, '0')}-${String(nc.associatedVoucher.voucherNumber).padStart(8, '0')}` }, list));
    reportVouchers.forEach((voucher) => add({ ...voucher, emittedAt: voucher.date, result: 'A', cae: '', source: 'AFIP' }, list));
    return list.sort((a, b) => new Date(b.emittedAt).getTime() - new Date(a.emittedAt).getTime());
  }, [sales, creditNotes, reportVouchers]);

  const filtered = rows.filter((row) => {
    if (date && dateOnly(row.emittedAt) !== date) return false;
    if (filter === 'FACTURAS') return invoiceTypes.has(row.voucherType);
    if (filter === 'NC') return creditNoteTypes.has(row.voucherType);
    return true;
  });
  const totals = filtered.reduce((acc, row) => ({
    invoices: acc.invoices + Number(invoiceTypes.has(row.voucherType)),
    creditNotes: acc.creditNotes + Number(creditNoteTypes.has(row.voucherType)),
    invoiceAmount: acc.invoiceAmount + (invoiceTypes.has(row.voucherType) ? row.amount : 0),
    creditNoteAmount: acc.creditNoteAmount + (creditNoteTypes.has(row.voucherType) ? row.amount : 0),
  }), { invoices: 0, creditNotes: 0, invoiceAmount: 0, creditNoteAmount: 0 });

  const verify = async (row: Row) => {
    setChecking(row);
    setVerifyError(null);
    setVerified(null);
    try {
      setVerified(await getArcaInvoice(row.voucherType, row.voucherNumber, row.salesPoint));
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(null);
    }
  };

  const saveReport = async () => {
    const vouchers = parseAfipReport(importText);
    if (vouchers.length === 0) {
      setImportError('No se encontraron comprobantes. Pegá el detalle copiado desde ARCA, incluyendo fecha, tipo, número e importe.');
      return;
    }
    setImportError(null);
    await importReport.mutateAsync(vouchers);
    setImportText('');
    setImportOpen(false);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#0F172A', fontWeight: 900 }}><Landmark size={32} color="#2563EB" /> AFIP · Comprobantes emitidos</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Facturas y Notas de Crédito autorizadas por ARCA desde este POS. Cada fila puede verificarse contra AFIP.</Typography>

      <Paper sx={{ p: 2, mb: 3, border: '1px solid #E2E8F0', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <TextField label="Fecha de emisión" type="date" value={date} onChange={(event) => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="outlined" onClick={() => setDate('')} sx={{ fontWeight: 800 }}>Ver todas las fechas</Button>
          <Button variant="contained" onClick={() => setImportOpen(true)} startIcon={<ClipboardPaste size={18} />} sx={{ fontWeight: 800 }}>Importar detalle AFIP</Button>
          {(['TODOS', 'FACTURAS', 'NC'] as Filter[]).map((value) => <Chip key={value} label={value === 'TODOS' ? 'Todos' : value === 'FACTURAS' ? 'Facturas' : 'Notas de Crédito'} onClick={() => setFilter(value)} color={filter === value ? 'primary' : 'default'} sx={{ fontWeight: 800 }} />)}
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Comprobantes', value: String(filtered.length), icon: 'FileText' as const, color: '#2563EB' },
          { label: 'Facturas', value: `${totals.invoices} · ${money(totals.invoiceAmount)}`, icon: 'CircleCheck' as const, color: '#2563EB' },
          { label: 'Notas de Crédito', value: `${totals.creditNotes} · ${money(totals.creditNoteAmount)}`, icon: 'FileMinus' as const, color: '#D97706' },
          { label: 'Faltan en POS', value: String(filtered.filter((row) => row.source === 'AFIP').length), icon: 'Landmark' as const, color: '#475569' },
        ].map((card) => {
          const Icon = summaryIcons[card.icon];
          return <Paper key={card.label} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3 }}><Box sx={{ color: card.color, display: 'flex', gap: 1, alignItems: 'center' }}><Icon size={18} /><Typography variant="caption" sx={{ fontWeight: 800 }}>{card.label}</Typography></Box><Typography sx={{ mt: 1, fontWeight: 900, color: '#0F172A' }}>{card.value}</Typography></Paper>;
        })}
      </Box>

      <Paper sx={{ overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 3 }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead><TableRow sx={{ bgcolor: '#F8FAFC' }}>{['Tipo', 'Comprobante', 'Emisión', 'Importe', 'Estado', 'CAE', 'AFIP'].map((label) => <TableCell key={label} sx={{ fontWeight: 900 }}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>{filtered.map((row) => <TableRow key={`${row.voucherType}-${number(row)}`}>
            <TableCell><Chip size="small" label={labels[row.voucherType] ?? `Tipo ${row.voucherType}`} sx={{ fontWeight: 800, bgcolor: creditNoteTypes.has(row.voucherType) ? '#FEF3C7' : '#EFF6FF', color: creditNoteTypes.has(row.voucherType) ? '#B45309' : '#1D4ED8' }} /></TableCell>
            <TableCell sx={{ fontWeight: 800 }}>{number(row)}{row.associated && <Typography variant="caption" sx={{ display: 'block', color: '#64748B' }}>Vinculada a {row.associated}</Typography>}</TableCell>
            <TableCell>{new Date(row.emittedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
            <TableCell sx={{ color: creditNoteTypes.has(row.voucherType) ? '#B45309' : '#0F172A', fontWeight: 800 }}>{money(row.amount)}</TableCell>
            <TableCell><Chip size="small" label={row.source === 'AFIP' ? 'Falta en POS' : creditNoteTypes.has(row.voucherType) ? 'NC emitida' : 'Registrado'} color={row.source === 'AFIP' ? 'warning' : creditNoteTypes.has(row.voucherType) ? 'success' : 'default'} sx={{ fontWeight: 800 }} /></TableCell>
            <TableCell>{row.cae || '—'}</TableCell>
            <TableCell><Button size="small" variant="outlined" disabled={checking !== null} onClick={() => void verify(row)} startIcon={checking?.voucherNumber === row.voucherNumber ? <CircularProgress size={14} /> : <Search size={15} />}>Verificar</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        {filtered.length === 0 && <Box sx={{ p: 5, textAlign: 'center' }}><Typography sx={{ fontWeight: 800, color: '#64748B' }}>No hay comprobantes fiscales guardados para este filtro.</Typography></Box>}
      </Paper>

      <Dialog open={Boolean(verified || verifyError)} onClose={() => { setVerified(null); setVerifyError(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Verificación en AFIP</DialogTitle>
        <DialogContent>{verifyError ? <Alert severity="error">{verifyError}</Alert> : verified && <Box sx={{ display: 'grid', gap: 1.5, pt: 1 }}><Typography><b>Comprobante:</b> {String(verified.salesPoint).padStart(4, '0')}-{String(verified.voucherNumber).padStart(8, '0')}</Typography><Typography><b>Tipo:</b> {labels[verified.voucherType] ?? verified.voucherType}</Typography><Typography><b>Importe AFIP:</b> {money(verified.grandTotal)}</Typography><Typography><b>CAE:</b> {verified.cae}</Typography><Typography><b>Estado:</b> {verified.status === 'A' ? 'Aprobado' : verified.status}</Typography></Box>}</DialogContent>
        <DialogActions><Button onClick={() => { setVerified(null); setVerifyError(null); }}>Cerrar</Button></DialogActions>
      </Dialog>
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Importar detalle de comprobantes AFIP</DialogTitle>
        <DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Copiá y pegá el detalle de comprobantes de ARCA. Se mostrarán todos, incluso los que no estén registrados en el POS.</Typography><TextField multiline minRows={10} fullWidth value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="01/08/2026 11 ... 00003-00000001 ... $ 9.240,00" />{importError && <Alert severity="warning" sx={{ mt: 2 }}>{importError}</Alert>}</DialogContent>
        <DialogActions><Button onClick={() => setImportOpen(false)}>Cancelar</Button><Button variant="contained" disabled={importReport.isPending} onClick={() => void saveReport()}>{importReport.isPending ? 'Importando...' : 'Guardar comprobantes'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
