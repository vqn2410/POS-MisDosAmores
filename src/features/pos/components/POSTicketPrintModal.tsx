import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider } from '@mui/material';
import { Printer, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Sale } from '../../../types';
import { useCompany } from '../../../hooks/useCompany';
import { getArcaConfig, type ArcaConfig } from '../../../services/arcaApi';

interface POSTicketPrintModalProps {
  sale: Sale | null;
  onClose: () => void;
}

const VOUCHER_LABELS: Record<number, string> = {
  1: 'Factura A',
  2: 'Nota de Débito A',
  3: 'Nota de Crédito A',
  6: 'Factura B',
  7: 'Nota de Débito B',
  8: 'Nota de Crédito B',
  11: 'Factura C',
  12: 'Nota de Débito C',
  13: 'Nota de Crédito C',
  105: 'Tique A',
  109: 'Tique C',
  110: 'Nota de Crédito Tique C',
};

function voucherLabel(voucherType: number): string {
  return VOUCHER_LABELS[voucherType] || `Comprobante ${voucherType}`;
}

function taxConditionLabel(raw: string | null | undefined): string {
  const value = (raw || '').toUpperCase();
  if (value.includes('MONOTRIBUTO')) return 'Responsable Monotributo';
  if (value.includes('EXENTO')) return 'Exento';
  if (value.includes('RESPONSABLE')) return 'Responsable Inscripto';
  return raw || 'Exento';
}

function formatDate(value: string | undefined): string {
  if (!value) return '';
  const iso = value.includes('T') ? value.slice(0, 10) : value;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatCaeExpiration(value: string | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  return value;
}

function buildFiscalQrData(sale: Sale, cuit: string | null | undefined): string | null {
  const fi = sale.fiscalInvoice;
  const cuitDigits = String(cuit || '').replace(/\D/g, '');
  if (!fi || !cuitDigits) return null;

  const data: Record<string, number | string> = {
    ver: 1,
    fecha: (fi.emittedAt || sale.createdAt || '').slice(0, 10),
    cuit: Number(cuitDigits),
    ptoVta: fi.salesPoint,
    tipoCmp: fi.voucherType,
    nroCmp: fi.voucherNumber,
    importe: Number(sale.grandTotal.toFixed(2)),
    moneda: 'PES',
    ctz: 1,
  };
  if (fi.docType && fi.docType !== 99 && fi.docNumber) {
    data.tipoDocRec = fi.docType;
    data.nroDocRec = Number(String(fi.docNumber).replace(/\D/g, ''));
  }
  data.tipoCodAut = 'E';
  data.codAut = Number(fi.cae);

  return `https://www.arca.gob.ar/fe/qr/?p=${btoa(JSON.stringify(data))}`;
}

export const POSTicketPrintModal: React.FC<POSTicketPrintModalProps> = ({ sale, onClose }) => {
  const { data: company } = useCompany();
  const isFiscal = Boolean(sale?.fiscalInvoice) || Boolean(sale?.notes?.includes('CAE'));

  const [arcaConfig, setArcaConfig] = React.useState<ArcaConfig | null>(null);
  React.useEffect(() => {
    let active = true;
    if (!sale || !isFiscal) {
      setArcaConfig(null);
      return () => {
        active = false;
      };
    }
    getArcaConfig()
      .then((config) => {
        if (active) setArcaConfig(config);
      })
      .catch(() => {
        if (active) setArcaConfig(null);
      });
    return () => {
      active = false;
    };
  }, [sale, isFiscal]);

  if (!sale) return null;

  const cuit = arcaConfig?.cuit || company?.taxId || '';
  const taxCondition = taxConditionLabel(arcaConfig?.emitter?.taxCondition);
  const isMonotributo = taxCondition.toLowerCase().includes('monotributo');
  const voucherType = sale.fiscalInvoice?.voucherType;
  const voucherNumber = sale.fiscalInvoice?.voucherNumber;
  const salesPoint = sale.fiscalInvoice?.salesPoint;
  const formattedNumber = voucherNumber ? `${String(salesPoint || 1).padStart(4, '0')}-${String(voucherNumber).padStart(8, '0')}` : '';
  const qrData = buildFiscalQrData(sale, cuit);
  const destinatario = sale.fiscalInvoice?.docType === 99 || !sale.customerName ? 'A Consumidor Final' : sale.customerName;

  const ticketNote = (sale.notes || '')
    .replace(/Factura ARCA #\d+ emitida\. CAE: \S+/g, '')
    .replace(/Comprobante Interno: \S+/g, '')
    .replace(/^Recargo \d+%: \$[\d.]+\.\s*/g, '')
    .trim();

  const handlePrint = () => {
    window.print();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePrint();
    }
    if (event.key === 'Escape') onClose();
  };

  return (
    <Dialog open={Boolean(sale)} onClose={onClose} onKeyDown={handleKeyDown} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}>
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          #printable-ticket, #printable-ticket * { visibility: visible !important; }
           #printable-ticket {
            position: fixed;
            left: 0;
            top: 0;
            width: 54mm !important;
            min-width: 54mm !important;
            margin: 0 !important;
            padding: 1mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-family: "Courier New", monospace !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
            }
           .ticket-print-space { height: 20mm !important; }
        }
      `}</style>
      <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', fontSize: '1.4rem' }}>
        <CheckCircle size={36} color="#16A34A" style={{ margin: '0 auto 8px', display: 'block' }} />
        ¡Venta Completada con Éxito!
      </DialogTitle>

      <DialogContent>
        {/* Thermal Ticket Replica Box */}
        <Box
          id="printable-ticket"
          className="thermal-ticket"
          sx={{
            width: '48mm',
            boxSizing: 'border-box',
            p: '2mm',
            bgcolor: '#FFF',
            color: '#000',
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            borderRadius: 2,
            border: '2px dashed #94A3B8',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          }}
        >
          {/* Datos del emisor */}
          <Box sx={{ textAlign: 'center', mb: 0.5 }}>
            <img src="/logo.png" alt="logo" style={{ width: '30mm', height: '30mm', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
          </Box>
          <Typography className="ticket-company" variant="subtitle2" align="center" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
            {company?.name || 'Nexus POS'}
          </Typography>
          {company?.ownerName && (
            <Typography className="ticket-detail" variant="caption" align="center" sx={{ display: 'block' }}>
              Titular: {company.ownerName}
            </Typography>
          )}
          {company?.address && (
            <Typography className="ticket-address" variant="caption" align="center" sx={{ display: 'block' }}>
              {company.address}
            </Typography>
          )}
          <Typography className="ticket-tax-id" variant="caption" align="center" sx={{ display: 'block' }}>
            CUIT: {cuit}
          </Typography>
          {company?.phone && (
            <Typography className="ticket-phone" variant="caption" align="center" sx={{ display: 'block' }}>
              Tel: {company.phone}
            </Typography>
          )}
          {isFiscal && (
            <>
              <Typography className="ticket-detail" variant="caption" align="center" sx={{ display: 'block' }}>
                Cond. frente al IVA: {taxCondition}
              </Typography>
              {isMonotributo && (
                <Typography className="ticket-detail" variant="caption" align="center" sx={{ display: 'block' }}>
                  Ingresos Brutos: {cuit}
                </Typography>
              )}
            </>
          )}
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          {/* Descripción del comprobante */}
          {isFiscal ? (
            <>
              <Typography className="ticket-voucher" variant="body1" align="center" sx={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.08em' }}>
                {voucherType ? voucherLabel(voucherType).toUpperCase() : 'COMPROBANTE FISCAL'}
              </Typography>
              {formattedNumber && (
                <Typography className="ticket-detail" variant="caption" align="center" sx={{ display: 'block', fontWeight: 700 }}>
                  N° {formattedNumber}
                </Typography>
              )}
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Fecha de emisión: {formatDate(sale.fiscalInvoice?.emittedAt || sale.createdAt)}
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Destinatario: {destinatario}
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Importe total: ${sale.grandTotal.toFixed(2)}
              </Typography>
              <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />
            </>
          ) : (
            <>
              <Typography className="ticket-voucher" variant="body1" align="center" sx={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.08em' }}>
                COMPROBANTE NO FISCAL
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Ticket: {sale.ticketNumber}
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Fecha: {new Date(sale.createdAt).toLocaleString()}
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Cliente: {sale.customerName}
              </Typography>
              <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />
            </>
          )}

          <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
            Atendió: {sale.userName}
          </Typography>
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          <Box sx={{ mb: 1 }}>
            {sale.items.map((item) => (
              <Box className="ticket-item" key={item.product.id} sx={{ my: 0.75 }}>
                <Box className="ticket-item-head" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span className="ticket-item-name">{item.product.name}</span>
                  <span className="ticket-item-price">${item.total.toFixed(2)}</span>
                </Box>
                <Typography className="ticket-item-unit" variant="caption" sx={{ display: 'block', color: '#475569' }}>
                  {item.saleType === 'WEIGHT' && item.weightKg
                    ? `${item.weightKg.toFixed(3)} Kg × $${item.unitPrice.toLocaleString()}/Kg`
                    : item.isVariableProduct
                    ? `${item.quantity} × $${item.unitPrice.toLocaleString()}`
                    : `${item.quantity}x $${item.unitPrice.toFixed(2)}`}
                </Typography>
              </Box>
            ))}
          </Box>
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          <Box className="ticket-total-row" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>${sale.subtotal.toFixed(2)}</span>
          </Box>
          {sale.taxTotal > 0 && (
            <Box className="ticket-total-row" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Impuestos:</span>
              <span>${sale.taxTotal.toFixed(2)}</span>
            </Box>
          )}
          <Box className="ticket-grand-total" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', mt: 1 }}>
            <span>TOTAL:</span>
            <span>${sale.grandTotal.toFixed(2)}</span>
          </Box>
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          {/* Datos fiscales */}
          {isFiscal && (
            <>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                CAE N°: {sale.fiscalInvoice?.cae || '—'}
              </Typography>
              <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
                Venc. CAE: {formatCaeExpiration(sale.fiscalInvoice?.caeExpiration) || '—'}
              </Typography>
              {qrData && (
                <Box sx={{ textAlign: 'center', my: 1.5 }}>
                  <QRCodeSVG value={qrData} size={90} />
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                    Comprobante Autorizado - ARCA
                  </Typography>
                </Box>
              )}
              <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />
            </>
          )}

          {/* Observaciones */}
          {ticketNote && (
            <Box sx={{ my: 0.5 }}>
              <Typography className="ticket-note-label" variant="caption" align="center" sx={{ display: 'block', fontWeight: 800 }}>
                Observaciones:
              </Typography>
              <Typography className="ticket-note" variant="caption" align="center" sx={{ display: 'block', fontStyle: 'italic' }}>
                {ticketNote}
              </Typography>
            </Box>
          )}

          <Typography className="ticket-footer" variant="caption" align="center" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
            Gracias por su compra
          </Typography>
          <Box className="ticket-print-space" sx={{ height: 0 }} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, fontWeight: 700 }}>
          Cerrar (Esc)
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          startIcon={<Printer size={20} />}
          sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 800 }}
        >
          Imprimir Ticket (Enter)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
