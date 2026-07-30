import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider } from '@mui/material';
import { Printer, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Sale } from '../../../types';
import { useCompany } from '../../../hooks/useCompany';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { printSaleWithQzTray } from '../../../services/qzTrayPrintService';

interface POSTicketPrintModalProps {
  sale: Sale | null;
  onClose: () => void;
}

function getFiscalQrData(sale: Sale, company: { name?: string; taxId?: string } | undefined): string | null {
  if (!sale.notes?.includes('CAE')) return null;
  const cae = sale.notes.match(/CAE: (\S+)/)?.[1];
  if (!cae) return null;
  const params = new URLSearchParams({
    cuit: company?.taxId?.replace(/-/g, '') || '',
    tipo: 'Factura',
    ptoVta: sale.ticketNumber.substring(0, 4),
    nro: sale.ticketNumber,
    cae,
    fchVto: '',
    importe: sale.grandTotal.toFixed(2),
    moneda: 'PES',
    ctz: '1',
  });
  return `https://www.arca.gob.ar/qr?${params.toString()}`;
}

export const POSTicketPrintModal: React.FC<POSTicketPrintModalProps> = ({ sale, onClose }) => {
  const { data: company } = useCompany();
  const { addNotification } = useNotificationStore();
  const [isQzPrinting, setIsQzPrinting] = React.useState(false);

  if (!sale) return null;

  const isFiscal = sale.notes?.includes('CAE') ?? false;
  const qrData = getFiscalQrData(sale, company);

  const handlePrint = () => {
    window.print();
  };

  const handleQzPrint = async () => {
    setIsQzPrinting(true);
    try {
      await printSaleWithQzTray(sale, company);
      addNotification({ title: 'Ticket enviado a impresora', message: 'Impresión directa realizada con QZ Tray.', type: 'success' });
    } catch (error) {
      addNotification({
        title: 'No se pudo imprimir con QZ Tray',
        message: error instanceof Error ? error.message : 'Verificá que QZ Tray esté instalado, abierto y autorizado.',
        type: 'error',
      });
    } finally {
      setIsQzPrinting(false);
    }
  };

  return (
    <Dialog open={Boolean(sale)} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}>
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          #printable-ticket, #printable-ticket * { visibility: visible !important; }
          #printable-ticket {
            position: fixed;
            left: 0;
            top: 0;
            width: 48mm !important;
            min-width: 48mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-family: "Courier New", monospace !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }
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
          <Typography className="ticket-company" variant="subtitle2" align="center" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
            {company?.name || 'Nexus POS'}
          </Typography>
          <Typography className="ticket-address" variant="caption" align="center" sx={{ display: 'block' }}>
            {company?.address || ''}
          </Typography>
          <Typography className="ticket-contact" variant="caption" align="center" sx={{ display: 'block', mb: 1 }}>
            CUIT: {company?.taxId || ''} | Tel: {company?.phone || ''}
          </Typography>
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
            Ticket: {sale.ticketNumber}
          </Typography>
          <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
            Fecha: {new Date(sale.createdAt).toLocaleString()}
          </Typography>
          <Typography className="ticket-detail" variant="caption" sx={{ display: 'block' }}>
            Atendió: {sale.userName}
          </Typography>
          <Typography className="ticket-detail" variant="caption" sx={{ display: 'block', mb: 1 }}>
            Cliente: {sale.customerName}
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
          <Box className="ticket-total-row" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Impuestos:</span>
            <span>${sale.taxTotal.toFixed(2)}</span>
          </Box>
          <Box className="ticket-grand-total" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', mt: 1 }}>
            <span>TOTAL:</span>
            <span>${sale.grandTotal.toFixed(2)}</span>
          </Box>
          <Divider className="ticket-divider" sx={{ borderStyle: 'dashed', my: 1 }} />

          {isFiscal && qrData && (
            <Box sx={{ textAlign: 'center', my: 1.5 }}>
              <QRCodeSVG value={qrData} size={90} />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                Comprobante Fiscal ARCA
              </Typography>
            </Box>
          )}

          {sale.notes && (
            <Typography className="ticket-note" variant="caption" align="center" sx={{ display: 'block', fontStyle: 'italic', my: 0.5 }}>
              {sale.notes}
            </Typography>
          )}

          <Typography className="ticket-footer" variant="caption" align="center" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
            Gracias por su compra
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, minHeight: 48, fontWeight: 700 }}>
          Cerrar
        </Button>
        <Button
          onClick={handleQzPrint}
          variant="contained"
          color="success"
          disabled={isQzPrinting}
          sx={{ borderRadius: 3, minHeight: 48, px: 2, fontWeight: 800 }}
        >
          {isQzPrinting ? 'Imprimiendo...' : 'Imprimir directo (QZ Tray)'}
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          startIcon={<Printer size={20} />}
          sx={{ borderRadius: 3, minHeight: 48, px: 3, fontWeight: 800 }}
        >
          Imprimir Ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
};
