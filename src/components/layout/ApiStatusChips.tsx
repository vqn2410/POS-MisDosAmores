import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { CloudDone, CloudOff, CloudQueue, WarningAmber } from '@mui/icons-material';
import { useApiStatus, type ApiStatusState } from '../../hooks/useApiStatus';

const PALETTE: Record<ApiStatusState, { color: string; border: string; bg: string; iconColor: string }> = {
  checking: { color: '#64748B', border: '#CBD5E1', bg: '#F1F5F9', iconColor: '#94A3B8' },
  connected: { color: '#15803D', border: '#86EFAC', bg: '#DCFCE7', iconColor: '#16A34A' },
  notConfigured: { color: '#B45309', border: '#FCD34D', bg: '#FEF3C7', iconColor: '#D97706' },
  disconnected: { color: '#B91C1C', border: '#FCA5A5', bg: '#FEE2E2', iconColor: '#DC2626' },
};

function StateIcon({ state }: { state: ApiStatusState }) {
  if (state === 'checking') return <CloudQueue fontSize="small" style={{ color: PALETTE.checking.iconColor }} />;
  if (state === 'connected') return <CloudDone fontSize="small" style={{ color: PALETTE.connected.iconColor }} />;
  if (state === 'notConfigured') return <WarningAmber fontSize="small" style={{ color: PALETTE.notConfigured.iconColor }} />;
  return <CloudOff fontSize="small" style={{ color: PALETTE.disconnected.iconColor }} />;
}

function StatusChip({
  state,
  label,
  tooltip,
}: {
  state: ApiStatusState;
  label: string;
  tooltip?: string;
}) {
  const palette = PALETTE[state];
  const chip = (
    <Chip
      icon={<StateIcon state={state} />}
      label={label}
      variant="outlined"
      size="small"
      sx={{
        fontWeight: 800,
        height: 32,
        color: palette.color,
        borderColor: palette.border,
        bgcolor: palette.bg,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
}

export const ApiStatusChips: React.FC = () => {
  const { arca, mp } = useApiStatus();

  const mpLabel =
    mp.state === 'checking'
      ? 'Verificando MP...'
      : mp.state === 'connected'
        ? 'Mercado Pago Conectado'
        : mp.state === 'notConfigured'
          ? 'MP Sin Configurar'
          : 'MP Desconectado';

  const arcaLabel =
    arca.state === 'checking'
      ? 'Verificando ARCA...'
      : arca.state === 'connected'
        ? arca.stub
          ? 'ARCA Conectado (Pruebas)'
          : 'ARCA Conectado'
        : 'ARCA Desconectado';

  const arcaTooltip =
    arca.state === 'connected' && arca.taExpiration
      ? `TA vigente hasta ${new Date(arca.taExpiration).toLocaleString('es-AR')}`
      : undefined;

  return (
    <>
      <StatusChip state={mp.state} label={mpLabel} tooltip={mp.state === 'connected' ? 'API Mercado Pago operativa' : undefined} />
      <StatusChip state={arca.state} label={arcaLabel} tooltip={arcaTooltip} />
    </>
  );
};
