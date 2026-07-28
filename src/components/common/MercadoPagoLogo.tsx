import React from 'react';
import { Box } from '@mui/material';

interface MercadoPagoLogoProps {
  height?: number;
  width?: number | string;
}

export const MercadoPagoLogo: React.FC<MercadoPagoLogoProps> = ({ height = 36, width = 'auto' }) => {
  return (
    <Box
      component="img"
      src="/brands/mercado-pago-logo.svg"
      alt="Mercado Pago Logo Oficial"
      sx={{
        height,
        width,
        objectFit: 'contain',
        display: 'inline-block',
      }}
    />
  );
};
