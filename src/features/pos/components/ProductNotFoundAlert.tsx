import React from 'react';
import { Alert, Snackbar } from '@mui/material';

interface ProductNotFoundAlertProps {
  code: string | null;
  onClose: () => void;
}

const playNotFoundSound = () => {
  const audio = new Audio('/sounds/error-notification-02.mp3');
  audio.volume = 0.7;
  void audio.play().catch(() => {
    // Browsers can block audio until they receive a user interaction.
  });
};

export const ProductNotFoundAlert: React.FC<ProductNotFoundAlertProps> = ({ code, onClose }) => {
  React.useEffect(() => {
    if (code) playNotFoundSound();
  }, [code]);

  return (
    <Snackbar
      open={Boolean(code)}
      autoHideDuration={3500}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={onClose}
    >
      <Alert
        severity="error"
        variant="filled"
        onClose={onClose}
        sx={{ borderRadius: 2, fontSize: '1rem', fontWeight: 900, letterSpacing: '0.04em' }}
      >
        PRODUCTO NO EXISTENTE{code ? `: ${code}` : ''}
      </Alert>
    </Snackbar>
  );
};
