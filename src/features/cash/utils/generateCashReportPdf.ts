import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CashSession, CashMovement, Sale, Company } from '../../../types';

export interface CashReportInput {
  company: Company | null | undefined;
  session: CashSession;
  sales: Sale[];
  movements: CashMovement[];
  branchName?: string;
  closingAmount: number;
  calculatedTotal: number;
  difference: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;

function paymentMethodKey(p: { method: string; reference?: string }): string {
  if (p.method === 'QR') {
    return p.reference?.startsWith('CDNI-') ? 'CUENTA_DNI' : 'MERCADOPAGO';
  }
  return p.method;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  MERCADOPAGO: 'Mercado Pago QR',
  CUENTA_DNI: 'Cuenta DNI',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito Cliente',
};

const BLUE: [number, number, number] = [37, 99, 235];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function generateCashReportPdf(input: CashReportInput): void {
  const { company, session, sales, movements, branchName, closingAmount, calculatedTotal, difference } = input;

  const cashOf = (s: Sale) =>
    (s.payments || [])
      .filter((p) => p.method === 'CASH')
      .reduce((acc, p) => acc + (p.amount - (p.change || 0)), 0);

  const kioskCashSales = sales.reduce((sum, s) => {
    const kioskTotal = s.items
      .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? kioskTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const cigaretteCashSales = sales.reduce((sum, s) => {
    const cigTotal = s.items
      .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? cigTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);

  const netIncome = movements
    .filter((m) => m.status !== 'CANCELLED' && m.type === 'INCOME')
    .reduce((sum, m) => sum + m.amount, 0);

  const netWithdrawals = movements
    .filter((m) => m.status !== 'CANCELLED' && m.type === 'WITHDRAWAL')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalCashInDrawer =
    session.initialKioskAmount + session.initialCigaretteAmount + kioskCashSales + cigaretteCashSales + netIncome - netWithdrawals;

  const totalSalesAmount = sales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalInvoicedCount = sales.filter((s) => s.fiscalInvoice?.cae).length;

  const totalCollectedAmount = sales.reduce((acc, s) => {
    const paid = (s.payments || []).reduce((a, p) => a + (p.amount - (p.change || 0)), 0);
    return acc + paid;
  }, 0);

  const paymentBreakdown = sales.reduce<Record<string, { sales: number; total: number }>>((acc, sale) => {
    const seen = new Set<string>();
    for (const p of sale.payments || []) {
      const key = paymentMethodKey(p);
      const row = (acc[key] = acc[key] || { sales: 0, total: 0 });
      if (!seen.has(key)) {
        seen.add(key);
        row.sales += 1;
      }
      row.total += p.amount - (p.change || 0);
    }
    return acc;
  }, {});

  const productTotals = sales.reduce<Map<string, { name: string; quantity: number; unit: string; total: number }>>((acc, sale) => {
    for (const item of sale.items) {
      const id = item.product.id;
      const row = acc.get(id) || { name: item.product.name, quantity: 0, unit: item.product.unit, total: 0 };
      row.quantity += item.quantity;
      row.total += item.total;
      acc.set(id, row);
    }
    return acc;
  }, new Map());

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BLUE);
  doc.text(company?.name || 'Nexus POS', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const emitterLines = [
    [company?.ownerName, company?.taxId].filter(Boolean).join(' | '),
    [company?.address, company?.phone].filter(Boolean).join(' | '),
  ].filter(Boolean);
  let y = 22;
  for (const line of emitterLines) {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('CIERRE DE CAJA', pageWidth / 2, y + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  y += 8;
  doc.text(`Fecha y hora de cierre: ${formatDateTime(session.closedAt || new Date().toISOString())}`, 14, y);
  doc.text(`Cajero: ${session.userName}`, 14, y + 5);
  doc.text(`Caja: ${session.cashRegisterId}  |  Sucursal: ${branchName || 'N/A'}`, 14, y + 10);
  doc.text(`Apertura: ${formatDateTime(session.openedAt)}`, 14, y + 15);

  // Resumen del turno
  autoTable(doc, {
    startY: y + 22,
    head: [['Métrica', 'Valor']],
    body: [
      ['Cantidad de ventas', String(sales.length)],
      ['Facturas emitidas (ARCA)', String(totalInvoicedCount)],
      ['Total vendido', money(totalSalesAmount)],
      ['Total cobrado', money(totalCollectedAmount)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
  });

  // Totales por caja
  const totalesPorCaja = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text('Totales por Caja', 14, totalesPorCaja + 12);

  autoTable(doc, {
    startY: totalesPorCaja + 16,
    head: [['Caja', 'Fondo inicial', 'Ventas en efectivo', 'Total esperado']],
    body: [
      ['Kiosco', money(session.initialKioskAmount), money(kioskCashSales), money(session.initialKioskAmount + kioskCashSales)],
      ['Cigarrillos', money(session.initialCigaretteAmount), money(cigaretteCashSales), money(session.initialCigaretteAmount + cigaretteCashSales)],
      ['Efectivo total esperado', '', '', money(totalCashInDrawer)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });

  // Arqueo final
  const arqueoY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  autoTable(doc, {
    startY: arqueoY + 6,
    head: [['Efectivo contado', 'Total calculado', 'Diferencia']],
    body: [[money(closingAmount), money(calculatedTotal), money(difference)]],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2, fontStyle: 'bold', textColor: difference !== 0 ? RED : GREEN },
    headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold' },
  });

  // Totales por medio de pago
  const mediosY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text('Totales por Medio de Pago', 14, mediosY + 12);

  autoTable(doc, {
    startY: mediosY + 16,
    head: [['Medio de pago', 'Ventas', 'Total cobrado']],
    body: [
      ...Object.entries(paymentBreakdown).map(([key, row]) => [PAYMENT_LABELS[key] || key, String(row.sales), money(row.total)]),
      ['TOTAL COBRADO', String(sales.length), money(totalCollectedAmount)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index === 2) data.cell.styles.fontStyle = 'bold';
    },
  });

  // Productos vendidos
  const productosY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text('Productos Vendidos', 14, productosY + 12);

  autoTable(doc, {
    startY: productosY + 16,
    head: [['Producto', 'Cantidad', 'Unidad', 'Total']],
    body: [...productTotals.values()]
      .sort((a, b) => b.total - a.total)
      .map((p) => [p.name, String(p.quantity), p.unit, money(p.total)]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
  });

  // Movimientos de caja
  const movsY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text(`Movimientos de Caja (ingresos ${money(netIncome)} / retiros ${money(netWithdrawals)})`, 14, movsY + 12);

  if (movements.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Sin movimientos registrados', 14, movsY + 20);
  } else {
    autoTable(doc, {
      startY: movsY + 16,
      head: [['Tipo', 'Monto', 'Motivo', 'Registró', 'Fecha y hora']],
      body: movements.map((m) => [
        m.status === 'CANCELLED' ? `Anulado (${m.type === 'INCOME' ? 'Ingreso' : 'Retiro'})` : m.type === 'INCOME' ? 'Ingreso' : 'Retiro',
        `${m.type === 'INCOME' ? '+' : '-'}${money(m.amount)}`,
        m.reason,
        m.userName,
        formatDateTime(m.createdAt),
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const value = data.cell.raw as string;
          data.cell.styles.textColor = value.startsWith('+') ? GREEN : RED;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // Footer
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 0;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${company?.name || 'Nexus POS'} - Documento generado el ${formatDateTime(new Date().toISOString())}`,
    pageWidth / 2,
    Math.min(finalY + 12, pageHeight - 8),
    { align: 'center' }
  );

  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`Cierre_Caja_${datePart}.pdf`);
}
