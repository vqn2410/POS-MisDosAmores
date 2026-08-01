import { loadArcaConfig, arcaPublicConfig } from './config.mjs';
import { arcaWsaaService } from './wsaa.mjs';
import { arcaWsfeService } from './wsfe.mjs';

const ARCA_PATH = '/api/arca';

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'https://localhost:5173',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function normalizeVoucherType(raw) {
  const type = Number(raw);
  return Number.isInteger(type) && type > 0 ? type : 6;
}

function normalizeSalesPoint(raw, config) {
  const point = Number(raw);
  return Number.isInteger(point) && point > 0 ? point : config.salesPoint;
}

function resolveVoucherType(payload, config) {
  const given = Number(payload.voucherType || 0);
  if (Number.isInteger(given) && given > 0) return given;
  const hasTaxId = Number(payload.docType) !== 99 && Number(payload.docNumber || 0) > 0;
  const taxCondition = String(config.emitterTaxCondition || '').toUpperCase().replace(/[\s_]/g, '');
  if (taxCondition.includes('RESPONSABLEINSCRIPTO')) return hasTaxId ? 1 : 6;
  if (taxCondition.includes('MONOTRIBUTO')) return 11;
  return 11;
}

function normalizeInvoicePayload(payload, config) {
  return {
    ...payload,
    voucherType: resolveVoucherType(payload, config),
    condicionIvaId: Number(payload.condicionIvaId || 5),
  };
}

export async function handleArcaRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const config = loadArcaConfig();
  const url = new URL(request.url, 'http://localhost');

  try {
    if (url.pathname === `${ARCA_PATH}/config` && request.method === 'GET') {
      sendJson(response, 200, arcaPublicConfig(config));
      return;
    }

    if (url.pathname === `${ARCA_PATH}/status` && request.method === 'GET') {
      const ta = await arcaWsaaService.getTicketAccess('wsfe');
      sendJson(response, 200, {
        ...arcaPublicConfig(config),
        ta: {
          service: ta.service,
          expiration: ta.expiration,
          stub: Boolean(ta.stub),
          cached: Boolean(ta.cached),
        },
      });
      return;
    }

    if (url.pathname === `${ARCA_PATH}/authenticate` && request.method === 'POST') {
      const ta = await arcaWsaaService.renewTicketAccess('wsfe');
      sendJson(response, 200, {
        ...arcaPublicConfig(config),
        ta: {
          service: ta.service,
          expiration: ta.expiration,
          stub: Boolean(ta.stub),
        },
      });
      return;
    }

    if (url.pathname === `${ARCA_PATH}/invoice` && request.method === 'POST') {
      const payload = await readJson(request);
      const ta = await arcaWsaaService.getTicketAccess('wsfe');
      const fiscalResult = await arcaWsfeService.createInvoice(normalizeInvoicePayload(payload, config), ta);
      sendJson(response, 200, { fiscalResult });
      return;
    }

    if (url.pathname === `${ARCA_PATH}/last-voucher` && request.method === 'GET') {
      const ta = await arcaWsaaService.getTicketAccess('wsfe');
      const voucherType = normalizeVoucherType(url.searchParams.get('voucherType'));
      const salesPoint = normalizeSalesPoint(url.searchParams.get('salesPoint'), config);
      const lastVoucher = await arcaWsfeService.lastVoucher(salesPoint, voucherType, ta);
      sendJson(response, 200, { salesPoint, voucherType, lastVoucher });
      return;
    }

    if (url.pathname === `${ARCA_PATH}/consult` && request.method === 'GET') {
      const ta = await arcaWsaaService.getTicketAccess('wsfe');
      const voucherType = normalizeVoucherType(url.searchParams.get('voucherType'));
      const salesPoint = normalizeSalesPoint(url.searchParams.get('salesPoint'), config);
      const voucherNumber = Number(url.searchParams.get('voucherNumber') || 0);
      const details = await arcaWsfeService.consultInvoice(voucherType, voucherNumber, salesPoint, ta);
      sendJson(response, 200, details);
      return;
    }

    if (url.pathname === `${ARCA_PATH}/dummy` && request.method === 'GET') {
      const availability = await arcaWsfeService.dummy();
      sendJson(response, 200, availability);
      return;
    }

    if (url.pathname === `${ARCA_PATH}/sales-points` && request.method === 'GET') {
      const ta = await arcaWsaaService.getTicketAccess('wsfe');
      const salesPoints = await arcaWsfeService.salesPoints(ta);
      sendJson(response, 200, { salesPoints });
      return;
    }

    sendJson(response, 404, { message: `No existe la ruta ${url.pathname}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servicio ARCA.';
    sendJson(response, 500, { message });
  }
}
