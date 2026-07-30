import qz from 'qz-tray';
import type { Sale } from '../types';

interface CompanyPrintData {
  name?: string;
  address?: string;
  taxId?: string;
  phone?: string;
}

const LINE_WIDTH = 32;

const center = (text: string) => {
  const value = text.slice(0, LINE_WIDTH);
  return value.padStart(Math.floor((LINE_WIDTH + value.length) / 2));
};
const divider = '-'.repeat(LINE_WIDTH);

const wrap = (text: string) => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    if (`${line} ${word}`.trim().length > LINE_WIDTH && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines;
};

const amountLine = (label: string, amount: string) => `${label.slice(0, LINE_WIDTH - amount.length - 1)}${' '.repeat(Math.max(1, LINE_WIDTH - label.length - amount.length))}${amount}`;

function buildReceipt(sale: Sale, company?: CompanyPrintData) {
  const lines = [
    '\x1B@',
    '\x1B!\x00',
    '\x1BM\x00',
    '\x1B \x00',
    '\x1Ba\x01',
    '\x1BE\x01',
    `${center(company?.name || 'Mis Dos Amores')}\n`,
    '\x1BE\x00',
    ...(company?.address ? [`${center(company.address)}\n`] : []),
    ...(company?.taxId ? [`CUIT: ${company.taxId}\n`] : []),
    ...(company?.phone ? [`Tel: ${company.phone}\n`] : []),
    '\x1Ba\x00',
    `${divider}\n`,
    `Ticket: ${sale.ticketNumber}\n`,
    `Fecha: ${new Date(sale.createdAt).toLocaleString('es-AR')}\n`,
    `Atendio: ${sale.userName}\n`,
    `Cliente: ${sale.customerName}\n`,
    `${divider}\n`,
  ];

  sale.items.forEach((item) => {
    lines.push(...wrap(item.product.name).map((line) => `${line}\n`));
    const quantity = item.saleType === 'WEIGHT' && item.weightKg ? item.weightKg.toFixed(3) : String(item.quantity);
    lines.push(amountLine(`${quantity} x $${item.unitPrice.toFixed(2)}`, `$${item.total.toFixed(2)}`) + '\n');
  });

  lines.push(
    `${divider}\n`,
    `${amountLine('Subtotal:', `$${sale.subtotal.toFixed(2)}`)}\n`,
    `${amountLine('Impuestos:', `$${sale.taxTotal.toFixed(2)}`)}\n`,
    '\x1BE\x01',
    `${amountLine('TOTAL:', `$${sale.grandTotal.toFixed(2)}`)}\n`,
    '\x1BE\x00',
    `${divider}\n`,
    ...(sale.notes ? [...wrap(sale.notes).map((line) => `${line}\n`)] : []),
    '\x1Ba\x01',
    'Gracias por su compra\n\n\n',
    '\x1Ba\x00',
  );

  return lines.join('');
}

export async function printSaleWithQzTray(sale: Sale, company?: CompanyPrintData) {
  if (!qz.websocket.isActive()) await qz.websocket.connect();

  const printers = await qz.printers.find();
  const printerNames = Array.isArray(printers) ? printers : [printers];
  const printer = printerNames.find((name) => /x.?printer|xp.?58|58ii/i.test(name)) || await qz.printers.getDefault();
  if (!printer) throw new Error('No se encontró una impresora disponible.');

  const config = qz.configs.create(printer, { encoding: 'Cp850' });
  await qz.print(config, [{ type: 'raw', format: 'plain', data: buildReceipt(sale, company) }]);
}
