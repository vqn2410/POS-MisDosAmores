import { readFileSync } from 'node:fs';
import forge from 'node-forge';

export function loadCertificatePair(config) {
  const certificatePem = readFileSync(config.certificatePath, 'utf8');
  const privateKeyPem = readFileSync(config.privateKeyPath, 'utf8');
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const privateKey = config.passphrase
    ? forge.pki.decryptRsaPrivateKey(privateKeyPem, config.passphrase)
    : forge.pki.privateKeyFromPem(privateKeyPem);
  if (!privateKey) {
    throw new Error('No se pudo descifrar la clave privada. Verificá la passphrase y el archivo .key.');
  }
  return { certificate, privateKey, certificatePem };
}
