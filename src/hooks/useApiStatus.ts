import { useQuery } from '@tanstack/react-query';
import { getArcaStatus } from '../services/arcaApi';
import { getMercadoPagoHealth } from '../services/mercadoPagoQrApi';

export type ApiStatusState = 'checking' | 'connected' | 'notConfigured' | 'disconnected';

export interface ArcaStatusInfo {
  state: ApiStatusState;
  stub: boolean;
  taExpiration: string | null;
}

export interface MercadoPagoStatusInfo {
  state: ApiStatusState;
  configured: boolean;
}

const REFRESH_MS = 60_000;

export function useApiStatus() {
  const arcaQuery = useQuery({
    queryKey: ['api-status', 'arca'],
    queryFn: async () => {
      const status = await getArcaStatus();
      return { stub: status.stub, taExpiration: status.ta?.expiration ?? null };
    },
    refetchInterval: REFRESH_MS,
    retry: 1,
  });

  const mpQuery = useQuery({
    queryKey: ['api-status', 'mercadopago'],
    queryFn: async () => {
      const health = await getMercadoPagoHealth();
      return { configured: health.configured };
    },
    refetchInterval: REFRESH_MS,
    retry: 1,
  });

  const arcaData = arcaQuery.isSuccess ? arcaQuery.data : null;
  const arca: ArcaStatusInfo =
    arcaData
      ? { state: 'connected', stub: arcaData.stub, taExpiration: arcaData.taExpiration }
      : arcaQuery.isError
        ? { state: 'disconnected', stub: false, taExpiration: null }
        : { state: 'checking', stub: false, taExpiration: null };

  const mpData = mpQuery.isSuccess ? mpQuery.data : null;
  const mp: MercadoPagoStatusInfo =
    mpData
      ? { state: mpData.configured ? 'connected' : 'notConfigured', configured: mpData.configured }
      : mpQuery.isError
        ? { state: 'disconnected', configured: false }
        : { state: 'checking', configured: false };

  return { arca, mp };
}
