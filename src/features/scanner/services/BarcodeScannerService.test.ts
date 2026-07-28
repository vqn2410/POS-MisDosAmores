import { describe, it, expect } from 'vitest';
import { BarcodeScannerService } from './BarcodeScannerService';

describe('BarcodeScannerService', () => {
  it('prevents duplicate detection within 1000ms debounce interval', () => {
    const service = new BarcodeScannerService();
    const code = '77903201001234';

    // First scan -> not debounced (false)
    const firstAttempt = service.isDebounced(code);
    expect(firstAttempt).toBe(false);

    // Immediate second scan -> debounced (true)
    const secondAttempt = service.isDebounced(code);
    expect(secondAttempt).toBe(true);
  });

  it('allows different barcode immediately', () => {
    const service = new BarcodeScannerService();
    const code1 = '77903201001234';
    const code2 = '7791111222233';

    expect(service.isDebounced(code1)).toBe(false);
    expect(service.isDebounced(code2)).toBe(false);
  });
});
