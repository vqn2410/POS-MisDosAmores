import { writeFileSync, mkdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const productionPosId = Number(process.env.MP_STANDING_POS_ID || 136054980);
const token = process.env.MP_PRODUCTION_ACCESS_TOKEN;
if (!token) {
  console.error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  process.exit(1);
}

const response = await fetch(`https://api.mercadopago.com/pos/${productionPosId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const pos = await response.json();
if (!response.ok || !pos.qr_code) {
  console.error('No se pudo obtener el qr_code de la caja:', JSON.stringify(pos));
  process.exit(1);
}

let qrSvg = renderToStaticMarkup(
  React.createElement(QRCodeSVG, { value: pos.qr_code, size: 1000, level: 'M', includeMargin: true, marginSize: 4 })
);

if (!qrSvg.includes('xmlns=')) {
  qrSvg = qrSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

const outDir = new URL('../public/qr/', import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('mp-atendido.svg', outDir), qrSvg);
console.log(`QR generado en public/qr/mp-atendido.svg (pos ${productionPosId}, caja ${pos.name})`);
