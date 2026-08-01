import { handleArcaRequest } from './arca/arcaRoutes.mjs';

const QR_ORDER_TTL_MS = 10 * 60 * 1000;
const orders = new Map();
let activeQrOrder = null;
let staticQrCache;

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

const productionAccessToken = process.env.MP_PRODUCTION_ACCESS_TOKEN;
const productionExternalPosId = process.env.MP_PRODUCTION_EXTERNAL_POS_ID;
const productionPointDeviceId = process.env.MP_PRODUCTION_POINT_DEVICE_ID;
let productionCollectorId = process.env.MP_PRODUCTION_COLLECTOR_ID ? Number(process.env.MP_PRODUCTION_COLLECTOR_ID) : undefined;
const notificationUrl = process.env.MP_NOTIFICATION_URL;

async function mercadoPagoRequest(path, options = {}, token) {
  if (!token) throw new Error('Falta el Access Token requerido en las variables de entorno.');
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const mpMessage = payload.errors?.[0]?.message || payload.message || payload.error;
    throw new Error(mpMessage ? `Mercado Pago: ${mpMessage}` : 'Mercado Pago rechazó la solicitud.');
  }
  return payload;
}

async function getStaticQr() {
  if (staticQrCache) return staticQrCache;
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en las variables de entorno.');
  const search = await mercadoPagoRequest(`/pos?external_id=${encodeURIComponent(productionExternalPosId)}`, {}, productionAccessToken);
  const pos = search.results?.[0];
  if (!pos?.qr_code) throw new Error('La caja configurada no tiene un QR estático asociado.');
  staticQrCache = pos.qr_code;
  return staticQrCache;
}

async function findStaticQrPayment(amount, since) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
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
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  const user = await mercadoPagoRequest('/users/me', {}, productionAccessToken);
  productionCollectorId = user.id;
  return productionCollectorId;
}

async function createQrOrder(data) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en las variables de entorno.');
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
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  if (!productionExternalPosId) throw new Error('Falta MP_PRODUCTION_EXTERNAL_POS_ID en las variables de entorno.');
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
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
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

async function listPointDevices() {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  const terminals = await mercadoPagoRequest('/terminals/v1/list?limit=50', {}, productionAccessToken);
  const terminalList = terminals?.data?.terminals;
  if (Array.isArray(terminalList)) {
    return terminalList.map((terminal) => ({
      deviceId: terminal.id,
      name: terminal.id,
      operatingMode: terminal.operating_mode || null,
    }));
  }
  const devices = await mercadoPagoRequest('/point/integration-api/devices', {}, productionAccessToken);
  const list = devices?.results || devices?.devices || devices || [];
  if (!Array.isArray(list)) return [];
  return list.map((device) => ({
    deviceId: device.id,
    name: device.name || device.id,
    operatingMode: device.operating_mode || null,
  }));
}

async function resolvePointDeviceId() {
  if (productionPointDeviceId) return productionPointDeviceId;
  const devices = await listPointDevices();
  if (devices.length === 0) throw new Error('No hay lectores Point vinculados a esta cuenta. Vinculá el Point Smart en la app Mercado Pago y verificá que esté en modo Punto de Venta (PDV).');
  if (devices.length > 1) throw new Error('Hay varios lectores Point. Configurá MP_PRODUCTION_POINT_DEVICE_ID en las variables de entorno.');
  return devices[0].deviceId;
}

async function createPointOrder(data) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto del cobro debe ser mayor a cero.');
  if (!data.externalReference) throw new Error('Falta la referencia externa del cobro con Point.');
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  const deviceId = await resolvePointDeviceId();
  const order = await mercadoPagoRequest('/v1/orders', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      type: 'point',
      external_reference: data.externalReference,
      description: data.description || 'Venta POS Mis Dos Amores',
      transactions: { payments: [{ amount: amount.toFixed(2) }] },
      config: { point: { terminal_id: deviceId, print_on_terminal: 'no_ticket' } },
    }),
  }, productionAccessToken);
  return { orderId: order.id, status: order.status, deviceId };
}

async function getPointOrderStatus(orderId) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  const order = await mercadoPagoRequest(`/v1/orders/${encodeURIComponent(orderId)}`, {}, productionAccessToken);
  const payment = order.transactions?.payments?.[0] || {};
  return {
    status: order.status,
    statusDetail: order.status_detail || null,
    payment: payment.id
      ? {
          id: String(payment.id),
          status: payment.status,
          amount: Number(payment.amount || 0),
          statusDetail: payment.status_detail || null,
        }
      : null,
  };
}

async function cancelPointOrder(orderId) {
  if (!productionAccessToken) throw new Error('Falta MP_PRODUCTION_ACCESS_TOKEN en las variables de entorno.');
  try {
    await mercadoPagoRequest(`/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({}),
    }, productionAccessToken);
  } catch (error) {
    if (!/rechaz|not found|no encontrad|cancel/i.test(error.message)) throw error;
  }
  return { cancelled: true };
}

export async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/arca/')) {
      return handleArcaRequest(request, response);
    }
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
      return sendJson(response, 200, { received: true });
    }
    if (request.method === 'GET' && url.pathname === '/api/mercadopago/point/devices') {
      return sendJson(response, 200, { devices: await listPointDevices() });
    }
    if (request.method === 'POST' && url.pathname === '/api/mercadopago/point/order') {
      return sendJson(response, 201, await createPointOrder(await readJson(request)));
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/mercadopago/point/order/')) {
      const orderId = decodeURIComponent(url.pathname.slice('/api/mercadopago/point/order/'.length));
      return sendJson(response, 200, await getPointOrderStatus(orderId));
    }
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/mercadopago/point/order/')) {
      const orderId = decodeURIComponent(url.pathname.slice('/api/mercadopago/point/order/'.length));
      return sendJson(response, 200, await cancelPointOrder(orderId));
    }
    return sendJson(response, 404, { error: 'Ruta no encontrada.' });
  } catch (error) {
    return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Error desconocido.' });
  }
}
