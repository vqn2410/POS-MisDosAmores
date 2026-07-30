export interface ScannerCallbacks {
  onDetected: (code: string) => void;
  onError?: (error: Error) => void;
}

export class BarcodeScannerService {
  private mediaStream: MediaStream | null = null;
  private isScanning = false;
  private facingMode: 'environment' | 'user' = 'environment';
  private lastDetectedCode: string | null = null;
  private lastDetectedTimestamp = 0;
  private scannerControls: { stop: () => void } | null = null;
  private readonly debounceMs = 1000;

  public async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode },
      });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  public async startScanner(videoElement: HTMLVideoElement, callbacks: ScannerCallbacks): Promise<void> {
    if (this.isScanning) {
      this.stopScanner();
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.mediaStream;
      await videoElement.play();
      this.isScanning = true;

      void this.startDecoding(videoElement, callbacks);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unable to access camera stream');
      if (callbacks.onError) callbacks.onError(error);
    }
  }

  public stopScanner(): void {
    this.isScanning = false;
    this.scannerControls?.stop();
    this.scannerControls = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public async switchCamera(videoElement: HTMLVideoElement, callbacks: ScannerCallbacks): Promise<void> {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    await this.startScanner(videoElement, callbacks);
  }

  public async toggleFlashlight(enable: boolean): Promise<boolean> {
    if (!this.mediaStream) return false;
    const track = this.mediaStream.getVideoTracks()[0];
    if (!track) return false;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: enable }] as any,
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  public isDebounced(code: string): boolean {
    const now = Date.now();
    if (this.lastDetectedCode === code && now - this.lastDetectedTimestamp < this.debounceMs) {
      return true;
    }
    this.lastDetectedCode = code;
    this.lastDetectedTimestamp = now;
    return false;
  }

  private async startDecoding(videoElement: HTMLVideoElement, callbacks: ScannerCallbacks): Promise<void> {
    if (!this.mediaStream) return;
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      this.scannerControls = await reader.decodeFromStream(this.mediaStream, videoElement, (result) => {
        if (!result || !this.isScanning) return;
        const code = result.getText();
        if (!this.isDebounced(code)) callbacks.onDetected(code);
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('No se pudo leer el código con la cámara.');
      callbacks.onError?.(error);
    }
  }
}
