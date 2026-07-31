import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import forge from 'node-forge';
import { XMLParser } from 'fast-xml-parser';
import { loadArcaConfig } from './config.mjs';
import { loadCertificatePair } from './certificates.mjs';

const xmlParser = new XMLParser({ ignoreAttributes: false });

const DEFAULT_TA_CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cache');

function formatAfipDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const local = new Date(date.getTime() - 3 * 3600 * 1000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}-03:00`;
}

function buildTraXml(service, cuit, generationTime, expirationTime) {
  const uniqueId = Math.floor(generationTime.getTime() / 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
<header>
<uniqueId>${uniqueId}</uniqueId>
<generationTime>${formatAfipDate(generationTime)}</generationTime>
<expirationTime>${formatAfipDate(expirationTime)}</expirationTime>
</header>
<service>${service}</service>
</loginTicketRequest>`;
}

function signTra(traXml, certificate, privateKey) {
  const cms = forge.pkcs7.createSignedData();
  cms.content = new forge.util.ByteBuffer(traXml, 'utf8');
  cms.addCertificate(certificate);
  cms.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha1,
  });
  cms.sign();
  const der = forge.asn1.toDer(cms.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

function buildLoginCmsSoap(cmsBase64) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
<soapenv:Header/>
<soapenv:Body>
<wsaa:loginCms>
<wsaa:in0>${cmsBase64}</wsaa:in0>
</wsaa:loginCms>
</soapenv:Body>
</soapenv:Envelope>`;
}

async function soapLogin(wsaaEndpoint, cmsBase64) {
  const response = await fetch(wsaaEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://impl.soap.wsaa.afip.gov.ar/LoginCms"',
    },
    body: buildLoginCmsSoap(cmsBase64),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`WSAA respondió HTTP ${response.status}: ${raw.slice(0, 2000)}`);
  }

  const envelope = xmlParser.parse(raw);
  const body = envelope?.['soapenv:Envelope']?.['soapenv:Body'] || envelope?.Envelope?.Body;
  const fault = body?.['soapenv:Fault'] || body?.Fault;
  if (fault) {
    throw new Error(`WSAA Fault: ${JSON.stringify(fault)}`);
  }
  const loginReturn =
    body?.['ns2:loginCmsResponse']?.['ns2:loginCmsReturn'] ||
    body?.['loginCmsResponse']?.['loginCmsReturn'] ||
    body?.loginCmsResponse?.loginCmsReturn;

  if (typeof loginReturn !== 'string') {
    throw new Error('WSAA no devolvió el Ticket de Acceso (respuesta inesperada).');
  }

  const ticket = xmlParser.parse(loginReturn);
  const responseTag = ticket?.loginTicketResponse || ticket?.loginTicketRequest;
  return {
    token: responseTag?.credentials?.token,
    sign: responseTag?.credentials?.sign,
    expiration: responseTag?.header?.expirationTime,
  };
}

const taCache = new Map();

function cacheKey(service, environment, cuit) {
  return `${environment}:${cuit}:${service}`;
}

function taCacheDir(config) {
  return config.taCachePath || DEFAULT_TA_CACHE_DIR;
}

function taFilePath(config, service) {
  return path.join(taCacheDir(config), `TA-${config.environment}-${config.cuit}-${service}.json`);
}

function readTaFile(config, service) {
  try {
    const file = taFilePath(config, service);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeTaFile(config, service, ta) {
  try {
    fs.mkdirSync(taCacheDir(config), { recursive: true });
    fs.writeFileSync(taFilePath(config, service), JSON.stringify(ta, null, 2), 'utf8');
  } catch (err) {
    console.warn('No se pudo persistir el TA en disco:', err.message);
  }
}

function isUsableTa(ta) {
  return (
    ta &&
    ta.token &&
    ta.sign &&
    !ta.stub &&
    new Date(ta.expiration).getTime() > Date.now() + 5 * 60 * 1000
  );
}

function buildStubTa(service, environment, cuit) {
  const expiration = new Date(Date.now() + 12 * 3600 * 1000);
  return {
    token: `PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3NvdG9rZW4+VE9LRU5fQVJDQV9XU0FBX1NUVUI8L3Nzb3Rva2VuPg==`,
    sign: `c2lnbmF0dXJlX2FyY2Ffd3NhYV9zdHViX2tleV8xMjM0NTY3ODkw`,
    expiration: expiration.toISOString(),
    service,
    environment,
    cuit,
    stub: true,
  };
}

function parseAfipExpiration(expirationValue) {
  if (!expirationValue) return new Date(Date.now() + 12 * 3600 * 1000);
  const parsed = new Date(expirationValue);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.now() + 12 * 3600 * 1000) : parsed;
}

export class WsaaService {
  constructor(config) {
    this.config = config || loadArcaConfig();
  }

  async getTicketAccess(service = 'wsfe') {
    const { environment, cuit, stub } = this.config;
    if (stub) {
      return buildStubTa(service, environment, cuit || '20300000007');
    }

    const key = cacheKey(service, environment, cuit);
    const cached = taCache.get(key);
    if (isUsableTa(cached)) {
      return { ...cached, cached: true };
    }
    const fromFile = readTaFile(this.config, service);
    if (isUsableTa(fromFile)) {
      taCache.set(key, fromFile);
      return { ...fromFile, cached: true };
    }

    const { certificate, privateKey } = loadCertificatePair(this.config);
    const generationTime = new Date(Date.now() - 2 * 60 * 1000);
    const expirationTime = new Date(generationTime.getTime() + 12 * 3600 * 1000);
    const traXml = buildTraXml(service, cuit, generationTime, expirationTime);
    const cmsBase64 = signTra(traXml, certificate, privateKey);

    let ticket;
    try {
      ticket = await soapLogin(this.config.wsaaEndpoint, cmsBase64);
    } catch (err) {
      if (String(err.message).includes('alreadyAuthenticated')) {
        throw new Error(
          'WSAA ya posee un TA vigente para este certificado. El TA se guarda en disco y se reutiliza hasta su expiración (12 h); si se perdió, esperá unos minutos antes de volver a solicitarlo.'
        );
      }
      throw err;
    }
    if (!ticket.token || !ticket.sign) {
      throw new Error('WSAA devolvió un token vacío. Verificá el certificado y la CUIT.');
    }

    const ta = {
      token: ticket.token,
      sign: ticket.sign,
      expiration: parseAfipExpiration(ticket.expiration).toISOString(),
      service,
      environment,
      cuit,
      stub: false,
    };
    taCache.set(key, ta);
    writeTaFile(this.config, service, ta);
    return ta;
  }

  async renewTicketAccess(service = 'wsfe') {
    taCache.delete(cacheKey(service, this.config.environment, this.config.cuit));
    try {
      fs.rmSync(taFilePath(this.config, service), { force: true });
    } catch {
      // ignorar si el archivo no existe
    }
    return this.getTicketAccess(service);
  }
}

export const arcaWsaaService = new WsaaService();
