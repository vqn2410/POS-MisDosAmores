import { createServer } from 'node:http';
import { handleArcaRequest } from './arca/arcaRoutes.mjs';

const port = Number(process.env.MP_PORT || 3001);
const productionAccessToken = process.env.MP_PRODUCTION_ACCESS_TOKEN;
const productionExternalPosId = process.env.MP_PRODUCTION_EXTERNAL_POS_ID;
let productionCollectorId = process.env.MP_PRODUCTION_COLLECTOR_ID ? Number(process.env.MP_PRODUCTION_COLLECTOR_ID) : undefined;
const notificationUrl = process.env.MP_NOTIFICATION_URL;
const orders = new Map();
let activeQrOrder = null;

const QR_ORDER_TTL_MS = 10 * 60 * 1000;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'https://localhost:5173',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function mercadoPagoRequest(path, options = {}, token) {
  if (!token) throw new Error('Falta el Access Token requerido en .env.mercadopago.local.');
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || 'Mercado Pago rechazó la solicitud.');
  return payload;
}

let staticQrCache;

async function getStaticQr() {
  if (staticQrCache) return staticQrCache;
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en .env.mercadopago.local.');
  const search = await mercadoPagoRequest(`/pos?external_id=${encodeURIComponent(productionExternalPosId)}`, {}, productionAccessToken);
  const pos = search.results?.[0];
  if (!pos?.qr_code) throw new Error('La caja configurada no tiene un QR estático asociado.');
  staticQrCache = pos.qr_code;
  return staticQrCache;
}

async function findStaticQrPayment(amount, since) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  const expectedAmount = Number(amount);
  const startedAt = new Date(since);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) throw new Error('El importe a verificar no es válido.');
  if (Number.isNaN(startedAt.getTime())) throw new Error('La hora de inicio del cobro no es válida.');

  const endDate = new Date();
  const payments = await mercadoPagoRequest(
    `/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=${encodeURIComponent(startedAt.toISOString())}&end_date=${encodeURIComponent(endDate.toISOString())}&limit=20`,
    {},
    productionAccessToken
  );
  const payment = payments.results?.find((item) => item.status === 'approved' && Math.abs(Number(item.transaction_amount) - expectedAmount) < 0.01);
  if (!payment) return { found: false };

  return {
    found: true,
    payment: {
      id: String(payment.id),
      amount: Number(payment.transaction_amount),
      approvedAt: payment.date_approved || payment.date_created,
      paymentMethod: payment.payment_method_id || 'Mercado Pago',
    },
  };
}

async function getProductionCollectorId() {
  if (productionCollectorId) return productionCollectorId;
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  const user = await mercadoPagoRequest('/users/me', {}, productionAccessToken);
  productionCollectorId = user.id;
  return productionCollectorId;
}

async function createQrOrder(data) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en .env.mercadopago.local.');
  const amount = Number(data.totalAmount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto del cobro debe ser mayor a cero.');
  if (!data.externalReference || !Array.isArray(data.items) || data.items.length === 0) throw new Error('La orden no tiene una referencia o productos válidos.');

  const collector = await getProductionCollectorId();
  await mercadoPagoRequest(`/instore/qr/seller/collectors/${collector}/pos/${encodeURIComponent(productionExternalPosId)}/orders`, {
    method: 'PUT',
    body: JSON.stringify({
      external_reference: data.externalReference,
      title: data.title || 'Venta POS',
      description: data.description || data.title || 'Venta POS',
      total_amount: amount,
      items: data.items.map((item) => ({
        title: item.title,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        total_amount: Number(item.quantity) * Number(item.unitPrice),
        unit_measure: 'unit',
      })),
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
  }, productionAccessToken);

  orders.set(data.externalReference, { amount });
  activeQrOrder = {
    externalReference: data.externalReference,
    amount,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + QR_ORDER_TTL_MS),
  };
  return {
    externalReference: data.externalReference,
    orderId: null,
    qrData: null,
  };
}

async function cancelQrOrder() {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en .env.mercadopago.local.');
  const collector = await getProductionCollectorId();
  try {
    await mercadoPagoRequest(`/instore/qr/seller/collectors/${collector}/pos/${encodeURIComponent(productionExternalPosId)}/orders`, {
      method: 'DELETE',
    }, productionAccessToken);
  } catch (error) {
    if (!/rechaz|not found|no encontrad|delet/i.test(error.message)) throw error;
  }
  activeQrOrder = null;
  return { cancelled: true };
}

async function getPaymentStatus(externalReference) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en .env.mercadopago.local.');
  const paymentSearch = await mercadoPagoRequest(`/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc&limit=20`, {}, productionAccessToken);
  const payment = paymentSearch.results?.find((item) => item.status === 'approved') || paymentSearch.results?.[0];
  if (!payment) return { status: 'waiting' };

  const order = orders.get(externalReference);
  const paidAmount = Number(payment.transaction_amount);
  if (payment.status === 'approved') {
    if (activeQrOrder?.externalReference === externalReference) activeQrOrder = null;
  }
  if (payment.status === 'approved' && order && Math.abs(paidAmount - order.amount) > 0.01) {
    return { status: 'rejected', paymentId: String(payment.id), detail: 'El importe aprobado no coincide con la orden.' };
  }

  return {
    status: payment.status,
    paymentId: String(payment.id),
    detail: payment.status_detail,
  };
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'GET' && url.pathname === '/api/mercadopago/health') {
      return sendJson(response, 200, { configured: Boolean(productionAccessToken && productionExternalPosId) });
    }
    if (request.method === 'GET' && url.pathname === '/api/mercadopago/display-state') {
      const active = activeQrOrder && activeQrOrder.expiresAt.getTime() > Date.now() ? activeQrOrder : null;
      return sendJson(response, 200, active
        ? { active: true, amount: active.amount, startedAt: active.startedAt.toISOString(), expiresAt: active.expiresAt.toISOString() }
        : { active: false });
    }
    if (request.method === 'POST' && url.pathname === '/api/mercadopago/qr') {
      return sendJson(response, 201, await createQrOrder(await readJson(request)));
    }
    if (request.method === 'DELETE' && url.pathname === '/api/mercadopago/qr') {
      return sendJson(response, 200, await cancelQrOrder());
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/mercadopago/status/')) {
      const reference = decodeURIComponent(url.pathname.slice('/api/mercadopago/status/'.length));
      return sendJson(response, 200, await getPaymentStatus(reference));
    }
    if (request.method === 'GET' && url.pathname === '/api/mercadopago/static-qr') {
      return sendJson(response, 200, { qrData: await getStaticQr() });
    }
    if (request.method === 'GET' && url.pathname === '/api/mercadopago/static-qr/payment') {
      return sendJson(response, 200, await findStaticQrPayment(url.searchParams.get('amount'), url.searchParams.get('since')));
    }
    if (request.method === 'POST' && url.pathname === '/api/mercadopago/webhook') {
      // The POS polls Mercado Pago directly through this server; this endpoint is ready for a public tunnel.
      return sendJson(response, 200, { received: true });
    }
    if (url.pathname.startsWith('/api/arca/')) {
      return handleArcaRequest(request, response);
    }
    return sendJson(response, 404, { error: 'Ruta no encontrada.' });
  } catch (error) {
    return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Error desconocido.' });
  }
}).listen(port, () => {
  console.log(`Mercado Pago local API listening on http://localhost:${port}`);
});
