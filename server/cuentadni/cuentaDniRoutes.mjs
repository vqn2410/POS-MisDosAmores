import { loadCuentaDniConfig, cuentaDniPublicConfig } from './config.mjs';
import { CuentaDniClient } from './CuentaDniClient.mjs';

const CUENTA_DNI_PATH = '/api/cuentadni';

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

export async function handleCuentaDniRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const config = loadCuentaDniConfig();
  const client = new CuentaDniClient(config);
  const url = new URL(request.url, 'http://localhost');

  try {
    if (url.pathname === `${CUENTA_DNI_PATH}/health` && request.method === 'GET') {
      sendJson(response, 200, cuentaDniPublicConfig(config));
      return;
    }

    if (url.pathname === `${CUENTA_DNI_PATH}/charge` && request.method === 'POST') {
      const payload = await readJson(request);
      const result = await client.chargeClaveDni(payload);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { message: `No existe la ruta ${url.pathname}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servicio Cuenta DNI.';
    sendJson(response, 400, { message });
  }
}
