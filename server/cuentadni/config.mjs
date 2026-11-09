export function loadCuentaDniConfig() {
  const enabled = String(process.env.CDNI_ENABLED || '').trim().toLowerCase() !== 'false';
  const mode = String(process.env.CDNI_MODE || '').trim().toLowerCase() === 't3' ? 't3' : 'clave_dni';
  const baseUrl = String(process.env.CDNI_REDLINK_BASE_URL || '').trim();
  const clientId = String(process.env.CDNI_REDLINK_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.CDNI_REDLINK_CLIENT_SECRET || '').trim();
  const merchantId = String(process.env.CDNI_REDLINK_MERCHANT_ID || '').trim();

  const configured = Boolean(enabled && baseUrl && clientId && clientSecret && merchantId);
  const stub = !configured;

  return {
    enabled,
    mode,
    baseUrl,
    clientId,
    clientSecret,
    merchantId,
    configured,
    stub,
  };
}

export function cuentaDniPublicConfig(config) {
  return {
    enabled: config.enabled,
    mode: config.mode,
    configured: config.configured,
    stub: config.stub,
  };
}
