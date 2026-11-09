import type { CuentaDniChargeInput, CuentaDniChargeResult } from '../cuentadni/common/types';

export interface CuentaDniHealth {
  enabled: boolean;
  mode: 'clave_dni' | 't3';
  configured: boolean;
  stub: boolean;
}

export interface CuentaDniChargePayload extends CuentaDniChargeInput {
  amount: number;
  externalReference: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cuentadni${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo comunicar con el servicio Cuenta DNI.');
  }
  return data as T;
}

export function getCuentaDniHealth() {
  return request<CuentaDniHealth>('/health');
}

export function chargeClaveDni(input: CuentaDniChargePayload) {
  return request<CuentaDniChargeResult>('/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
