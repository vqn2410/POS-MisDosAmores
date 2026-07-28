export interface ArcaCertificateConfig {
  cuit: string;
  certificatePem: string; // X509 Certificate (.crt)
  encryptedPrivateKey: string; // Encrypted Private Key (.key)
  passphrase?: string;
}

export class CertificateManager {
  private static configs: Map<string, ArcaCertificateConfig> = new Map();

  /**
   * Registers certificate configuration for a CUIT.
   */
  public static registerCertificate(config: ArcaCertificateConfig): void {
    this.configs.set(config.cuit, config);
  }

  /**
   * Retrieves certificate configuration for a CUIT.
   */
  public static getCertificate(cuit: string): ArcaCertificateConfig | null {
    return this.configs.get(cuit) || null;
  }

  /**
   * Verifies if certificates are loaded for a specific CUIT.
   */
  public static hasCertificate(cuit: string): boolean {
    return this.configs.has(cuit);
  }
}
