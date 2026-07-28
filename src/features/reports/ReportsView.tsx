import React from 'react';
import { Box, Paper, Typography, Button, Grid, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useSales } from '../../hooks/useSales';
import { Download, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const ReportsView: React.FC = () => {
  const { data: sales = [] } = useSales();
  const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Nexus POS - Reporte Ejecutivo de Ventas', 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Ticket #', 'Cliente', 'Monto Total', 'Fecha']],
      body: sales.map((s) => [s.ticketNumber, s.customerName || '', `$${s.grandTotal.toFixed(2)}`, new Date(s.createdAt).toLocaleDateString()]),
    });
    doc.save('Nexus_Reporte_Ventas.pdf');
    setExportAnchorEl(null);
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sales.map((s) => ({
        Ticket: s.ticketNumber,
        Cliente: s.customerName,
        Subtotal: s.subtotal,
        IVA: s.taxTotal,
        Total: s.grandTotal,
        Fecha: s.createdAt,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, 'Nexus_Reporte_Ventas.xlsx');
    setExportAnchorEl(null);
  };

  const handleExportCSV = () => {
    const headers = ['Ticket', 'Cliente', 'Total', 'Fecha'];
    const rows = sales.map((s) => [s.ticketNumber, s.customerName, s.grandTotal, s.createdAt]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Nexus_Reporte_Ventas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
  };

  const REPORT_CARDS = [
    { title: 'Reporte de Ventas Detallado', desc: 'Ventas por periodo, cajero, sucursal y método de pago' },
    { title: 'Reporte de Rotación de Inventario', desc: 'Productos más y menos vendidos, mermas y Kardex' },
    { title: 'Reporte de Margen & Utilidades', desc: 'Análisis de costos de adquisición vs precio final' },
    { title: 'Reporte de Arqueos de Caja', desc: 'Historial de sesiones, diferencias y cierres' },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            📊 Centro de Reportes & Analítica Enterprise
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generación y exportación masiva en formatos estándar de la industria
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Download size={22} />}
          onClick={(e) => setExportAnchorEl(e.currentTarget)}
          sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}
        >
          📊 Exportar Datos
        </Button>

        <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
          <MenuItem onClick={handleExportPDF} sx={{ py: 1.5 }}>
            <ListItemIcon><FileText size={20} color="#DC2626" /></ListItemIcon>
            <ListItemText primary="Exportar como PDF (.pdf)" slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '1rem' } } }} />
          </MenuItem>
          <MenuItem onClick={handleExportExcel} sx={{ py: 1.5 }}>
            <ListItemIcon><FileSpreadsheet size={20} color="#16A34A" /></ListItemIcon>
            <ListItemText primary="Exportar como Excel (.xlsx)" slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '1rem' } } }} />
          </MenuItem>
          <MenuItem onClick={handleExportCSV} sx={{ py: 1.5 }}>
            <ListItemIcon><FileCode size={20} color="#2563EB" /></ListItemIcon>
            <ListItemText primary="Exportar como CSV (.csv)" slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '1rem' } } }} />
          </MenuItem>
        </Menu>
      </Box>

      <Grid container spacing={3}>
        {REPORT_CARDS.map((card, idx) => (
          <Grid size={{ xs: 12, sm: 6 }} key={idx}>
            <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: '#0F172A' }}>
                {card.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                {card.desc}
              </Typography>
              <Button variant="outlined" size="large" sx={{ borderRadius: 3, minHeight: 48, fontWeight: 800 }}>
                Generar Vista Previa
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
