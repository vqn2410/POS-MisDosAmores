const WSAA_ENDPOINTS = {
  testing: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

const WSFE_ENDPOINTS = {
  testing: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

export function loadArcaConfig() {
  const cuit = String(process.env.ARCA_CUIT || '').trim();
  const environment = process.env.ARCA_ENVIRONMENT === 'production' ? 'production' : 'testing';
  const salesPoint = Number(process.env.ARCA_SALES_POINT || 1);
  const certificatePath = String(process.env.ARCA_CERTIFICATE_PATH || '').trim();
  const privateKeyPath = String(process.env.ARCA_PRIVATE_KEY_PATH || '').trim();
  const passphrase = String(process.env.ARCA_PRIVATE_KEY_PASSPHRASE || '');
  const taCachePath = String(process.env.ARCA_TA_CACHE_PATH || '').trim() || null;

  const emitterName = String(process.env.ARCA_EMITTER_NAME || '').trim();
  const emitterAddress = String(process.env.ARCA_EMITTER_ADDRESS || '').trim();
  const emitterTaxCondition = String(process.env.ARCA_EMITTER_TAX_CONDITION || 'RESPONSABLE MONOTRIBUTO').trim();

  const hasPemFromEnv = Boolean(process.env.ARCA_CERT_PEM && process.env.ARCA_PRIVATE_KEY_PEM);
  const stub = !cuit || (!certificatePath && !hasPemFromEnv) || (!privateKeyPath && !hasPemFromEnv);

  return {
    cuit,
    environment,
    salesPoint,
    certificatePath,
    privateKeyPath,
    passphrase,
    taCachePath,
    emitterName,
    emitterAddress,
    emitterTaxCondition,
    stub,
    wsaaEndpoint: WSAA_ENDPOINTS[environment],
    wsfeEndpoint: WSFE_ENDPOINTS[environment],
  };
}

export function arcaPublicConfig(config) {
  return {
    cuit: config.cuit || null,
    environment: config.environment,
    salesPoint: config.salesPoint,
    emitter: {
      name: config.emitterName || null,
      address: config.emitterAddress || null,
      taxCondition: config.emitterTaxCondition,
    },
    stub: config.stub,
  };
}
