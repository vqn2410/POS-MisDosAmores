import React from 'react';
import { Alert, Snackbar } from '@mui/material';

interface ProductNotFoundAlertProps {
  code: string | null;
  onClose: () => void;
}

const playNotFoundSound = () => {
  try {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;

    [
      { frequency: 196, start: 0, duration: 0.12 },
      { frequency: 131, start: 0.13, duration: 0.28 },
    ].forEach(({ frequency, start, duration }) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + duration);
    });

    window.setTimeout(() => void audioContext.close(), 500);
  } catch {
    // Browsers can block audio until they receive a user interaction.
  }
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
