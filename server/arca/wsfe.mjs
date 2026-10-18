import { XMLParser } from 'fast-xml-parser';
import https from 'node:https';
import { URL } from 'node:url';
import { loadArcaConfig } from './config.mjs';

const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false });

const stubCounters = new Map();

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function todayAfip() {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
}

function soapEnvelope(method, bodyXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://ar.gov.afip.dif.FEV1/">
<soap:Body>
<ns:${method}>${bodyXml}</ns:${method}>
</soap:Body>
</soap:Envelope>`;
}

function authXml(ta) {
  return `<ns:Auth><ns:Token>${ta.token}</ns:Token><ns:Sign>${ta.sign}</ns:Sign><ns:Cuit>${ta.cuit}</ns:Cuit></ns:Auth>`;
}

function ivaIdForRate(rate) {
  const r = Math.round(rate * 10000);
  if (r === 2100) return 5;
  if (r === 1050) return 4;
  if (r === 2700) return 6;
  if (r === 500) return 8;
  if (r === 250) return 9;
  return null;
}

function buildIvaXml(subtotal, taxTotal) {
  if (taxTotal <= 0) return '';
  if (subtotal <= 0) return '';
  const rate = taxTotal / subtotal;
  const id = ivaIdForRate(rate);
  if (id === null) {
    throw new Error(`ImpIVA (${formatAmount(taxTotal)}) no coincide con una alícuota de IVA válida sobre el neto (${formatAmount(subtotal)}).`);
  }
  const expected = Math.round(subtotal * rate * 100) / 100;
  if (Math.abs(expected - taxTotal) > 0.01) {
    throw new Error(`ImpIVA (${formatAmount(taxTotal)}) no coincide con el ${(rate * 100).toFixed(2)}% esperado (${formatAmount(expected)}).`);
  }
  return `<ns:Iva><ns:AlicIva><ns:Id>${id}</ns:Id><ns:BaseImp>${formatAmount(subtotal)}</ns:BaseImp><ns:Importe>${formatAmount(taxTotal)}</ns:Importe></ns:AlicIva></ns:Iva>`;
}

function buildFechaSolicitar(payload, config, voucherNumber = 0) {
  const docNro = payload.docType === 99 || Number(payload.docNumber || 0) === 0 ? 0 : Number(payload.docNumber) || 0;
  const concept = payload.concept || 1;
  const fecha = payload.date || todayAfip();
  const neto = Number(payload.subtotal || 0);
  const iva = Number(payload.taxTotal || 0);
  const total = Number(payload.grandTotal || 0);
  const conc = Number(payload.totConc || 0);

  if (Math.abs(neto + iva + conc - total) > 0.01) {
    throw new Error(`Los totales del comprobante no cuadran: neto ${formatAmount(neto)} + IVA ${formatAmount(iva)} + no gravado ${formatAmount(conc)} != total ${formatAmount(total)}.`);
  }

  const servFecha = concept === 2 || concept === 3 ? `<ns:FchServDesde>${fecha}</ns:FchServDesde><ns:FchServHasta>${fecha}</ns:FchServHasta>` : '';
  const condicionIva = payload.condicionIvaId ? `<ns:CondicionIVAReceptorId>${payload.condicionIvaId}</ns:CondicionIVAReceptorId>` : '';
  const asociado = payload.associatedInvoice?.voucherNumber
    ? `<ns:CbtesAsoc><ns:CbteAsoc><ns:Tipo>${payload.associatedInvoice.voucherType}</ns:Tipo><ns:PtoVta>${payload.associatedInvoice.salesPoint}</ns:PtoVta><ns:Nro>${payload.associatedInvoice.voucherNumber}</ns:Nro></ns:CbteAsoc></ns:CbtesAsoc>`
    : '';

  return `<ns:FeCAEReq>
<ns:FeCabReq>
<ns:CantReg>1</ns:CantReg>
<ns:PtoVta>${config.salesPoint}</ns:PtoVta>
<ns:CbteTipo>${payload.voucherType}</ns:CbteTipo>
</ns:FeCabReq>
<ns:FeDetReq>
<ns:FECAEDetRequest>
<ns:Concepto>${concept}</ns:Concepto>
<ns:DocTipo>${payload.docType}</ns:DocTipo>
<ns:DocNro>${docNro}</ns:DocNro>
<ns:CbteDesde>${voucherNumber}</ns:CbteDesde>
<ns:CbteHasta>${voucherNumber}</ns:CbteHasta>
<ns:CbteFch>${fecha}</ns:CbteFch>
<ns:ImpTotal>${formatAmount(total)}</ns:ImpTotal>
<ns:ImpTotConc>${formatAmount(conc)}</ns:ImpTotConc>
<ns:ImpNeto>${formatAmount(neto)}</ns:ImpNeto>
<ns:ImpOpEx>0</ns:ImpOpEx>
<ns:ImpIVA>${formatAmount(iva)}</ns:ImpIVA>
<ns:ImpTrib>0</ns:ImpTrib>
${servFecha}
<ns:MonId>PES</ns:MonId>
<ns:MonCotiz>1</ns:MonCotiz>
${condicionIva}
${asociado}
${buildIvaXml(neto, iva)}
</ns:FECAEDetRequest>
</ns:FeDetReq>
</ns:FeCAEReq>`;
}

async function postSoap(endpoint, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const request = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers,
        // El WSFE de producción de ARCA usa DHE con claves < 1024 bits;
        // OpenSSL moderno lo rechaza a menos que se baje el security level.
        ciphers: 'DEFAULT:@SECLEVEL=0',
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => resolve({ status: response.statusCode || 0, text: data }));
      },
    );
    request.on('error', reject);
    request.end(body);
  });
}

async function soapCall(endpoint, method, bodyXml) {
  const { status, text: raw } = await postSoap(
    endpoint,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"http://ar.gov.afip.dif.FEV1/${method}"`,
    },
    soapEnvelope(method, bodyXml)
  );
  if (status >= 400) {
    throw new Error(`WSFE respondió HTTP ${status}: ${raw.slice(0, 300)}`);
  }
  const parsed = parser.parse(raw);
  const body = parsed?.Envelope?.Body;
  const fault = body?.Fault;
  if (fault) {
    throw new Error(`WSFE Fault: ${JSON.stringify(fault).slice(0, 500)}`);
  }
  return { body, raw };
}

function first(values) {
  return Array.isArray(values) ? values[0] : values;
}

function throwIfErrors(resultNode) {
  const err = resultNode?.Errors?.Err;
  if (err) {
    const item = first(err);
    const desc = item?.Msg || item?.Desc || 'error sin descripción';
    throw new Error(`ARCA rechazó el comprobante: (${item?.Code}) ${desc}`);
  }
}

function buildStubInvoiceResult(payload, config) {
  const key = `${config.salesPoint}:${payload.voucherType}`;
  const next = (stubCounters.get(key) || 1041) + 1;
  stubCounters.set(key, next);
  const mockCae = `7402910${Math.floor(10000000 + Math.random() * 90000000)}`;
  return {
    cae: mockCae,
    caeExpiration: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ''),
    voucherNumber: next,
    salesPoint: config.salesPoint,
    voucherType: payload.voucherType,
    result: 'A',
    observations: [],
  };
}

// Serializa la emisión de comprobantes en este proceso para evitar que dos
// pedidos concurrentes lean el mismo "último autorizado" y pidan el mismo número.
let invoiceQueue = Promise.resolve();
function withInvoiceLock(task) {
  const run = invoiceQueue.then(task, task);
  invoiceQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export class WsfeService {
  constructor(config) {
    this.config = config || loadArcaConfig();
  }

  async createInvoice(payload, ta) {
    if (ta.stub || this.config.stub) {
      return buildStubInvoiceResult(payload, this.config);
    }

    return withInvoiceLock(() => this._emitLocked(payload, ta));
  }

  async _emitLocked(payload, ta) {
    const salesPoint = this.config.salesPoint;
    const voucherType = Number(payload.voucherType);
    let voucherNumber = Number(payload.voucherNumber || 0);
    if (!voucherNumber) {
      const last = await this.lastVoucher(salesPoint, voucherType, ta);
      voucherNumber = last + 1;
    }

    const { body } = await soapCall(
      this.config.wsfeEndpoint,
      'FECAESolicitar',
      `${authXml(ta)}${buildFechaSolicitar(payload, this.config, voucherNumber)}`
    );

    const resultNode = body?.FECAESolicitarResponse?.FECAESolicitarResult;
    throwIfErrors(resultNode);

    const det = first(resultNode?.FeDetResp?.FECAEDetResponse);
    if (!det) {
      throw new Error('ARCA no devolvió el detalle del comprobante (respuesta inesperada).');
    }

    const observations = (first(det?.Observaciones?.Obs)?.Msg) ? [first(det.Observaciones.Obs).Msg] : [];
    return {
      cae: det.CAE,
      caeExpiration: det.CAEFchVto,
      voucherNumber: Number(det.CbteDesde || 0),
      salesPoint: Number(resultNode?.FeCabResp?.PtoVta || this.config.salesPoint),
      voucherType: Number(resultNode?.FeCabResp?.CbteTipo || payload.voucherType),
      result: det.Resultado || 'A',
      observations,
    };
  }

  async condicionesIva(ta) {
    if (ta.stub || this.config.stub) {
      return [{ id: 5, desc: 'Monotributo' }];
    }
    const { body } = await soapCall(
      this.config.wsfeEndpoint,
      'FEParamGetCondicionIvaReceptor',
      authXml(ta)
    );
    const resultNode = body?.FEParamGetCondicionIvaReceptorResponse?.FEParamGetCondicionIvaReceptorResult;
    throwIfErrors(resultNode);
    const list = resultNode?.ResultGet?.CondicionIvaReceptor;
    return (Array.isArray(list) ? list : [list])
      .filter(Boolean)
      .map((item) => ({ id: Number(item.Id), desc: item.Desc }));
  }

  async lastVoucher(salesPoint, voucherType, ta) {
    if (ta.stub || this.config.stub) {
      const key = `${salesPoint}:${voucherType}`;
      return stubCounters.get(key) || 1041;
    }

    const { body } = await soapCall(
      this.config.wsfeEndpoint,
      'FECompUltimoAutorizado',
      `${authXml(ta)}<ns:PtoVta>${salesPoint}</ns:PtoVta><ns:CbteTipo>${voucherType}</ns:CbteTipo>`
    );

    const resultNode = body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
    throwIfErrors(resultNode);
    return Number(resultNode?.CbteNro || 0);
  }

  async consultInvoice(voucherType, voucherNumber, salesPoint, ta) {
    if (ta.stub || this.config.stub) {
      return {
        voucherType,
        voucherNumber,
        salesPoint,
        cae: '740291088219451',
        caeExpiration: '20260810',
        docType: 80,
        docNumber: '30112233445',
        grandTotal: 1250,
        date: '20260728',
        status: 'A',
      };
    }

    const { body } = await soapCall(
      this.config.wsfeEndpoint,
      'FECompConsultar',
      `${authXml(ta)}<ns:FeCompConsReq><ns:CbteTipo>${voucherType}</ns:CbteTipo><ns:CbteNro>${voucherNumber}</ns:CbteNro><ns:PtoVta>${salesPoint}</ns:PtoVta></ns:FeCompConsReq>`
    );

    const resultNode = body?.FECompConsultarResponse?.FECompConsultarResult;
    throwIfErrors(resultNode);
    const result = resultNode?.ResultGet;
    return {
      voucherType: Number(result?.CbteTipo || voucherType),
      voucherNumber: Number(result?.CbteNro || voucherNumber),
      salesPoint: Number(result?.PtoVta || salesPoint),
      cae: result?.CodAutorizacion || '',
      caeExpiration: result?.FchVtoCAE || result?.FchVto || '',
      docType: Number(result?.DocTipo || 0),
      docNumber: String(result?.DocNro || ''),
      grandTotal: Number(result?.ImpTotal || 0),
      date: result?.FchEmision || result?.CbteFch || '',
      status: result?.Resultado || 'A',
    };
  }

  async dummy() {
    if (this.config.stub) {
      return { appServer: true, dbServer: true, authServer: true };
    }
    const { body } = await soapCall(this.config.wsfeEndpoint, 'FEDummy', '');
    const result = body?.FEDummyResponse?.FEDummyResult;
    return {
      appServer: result?.AppServer === 'OK',
      dbServer: result?.DbServer === 'OK',
      authServer: result?.AuthServer === 'OK',
    };
  }

  async salesPoints(ta) {
    if (ta.stub || this.config.stub) {
      return [{ salesPoint: Number(this.config.salesPoint), blocked: false, emissionType: 'CAE' }];
    }
    const { body } = await soapCall(this.config.wsfeEndpoint, 'FEParamGetPtosVenta', authXml(ta));
    const resultNode = body?.FEParamGetPtosVentaResponse?.FEParamGetPtosVentaResult;
    const err = resultNode?.Errors?.Err;
    if (err && (Array.isArray(err) ? err.some((e) => e.Code === '602') : err.Code === '602')) {
      return [];
    }
    throwIfErrors(resultNode);
    const list = resultNode?.ResultGet?.PtoVenta;
    return (Array.isArray(list) ? list : [list])
      .filter(Boolean)
      .map((item) => ({
        salesPoint: Number(item.Nro),
        blocked: item.Bloqueado === 'S',
        emissionType: item.EmisionTipo,
      }));
  }
}

export const arcaWsfeService = new WsfeService();
