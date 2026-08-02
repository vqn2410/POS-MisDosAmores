import React from 'react';
import { Box } from '@mui/material';

interface CuentaDniLogoProps {
  height?: number;
  width?: number | string;
}

export const CuentaDniLogo: React.FC<CuentaDniLogoProps> = ({ height = 36, width = 'auto' }) => {
  return (
    <Box
      component="img"
      src="/logoCDNI.png"
      alt="Cuenta DNI Logo Oficial"
      sx={{
        height,
        width,
        objectFit: 'contain',
        display: 'inline-block',
      }}
    />
  );
};
