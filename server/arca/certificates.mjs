import { readFileSync } from 'node:fs';
import forge from 'node-forge';

function pemFromEnv(value) {
  if (!value) return null;
  return `${value.replace(/\\n/g, '\n').trim()}\n`;
}

export function loadCertificatePair(config) {
  const certificatePem = pemFromEnv(process.env.ARCA_CERT_PEM) || readFileSync(config.certificatePath, 'utf8');
  const privateKeyPem = pemFromEnv(process.env.ARCA_PRIVATE_KEY_PEM) || readFileSync(config.privateKeyPath, 'utf8');
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const privateKey = config.passphrase
    ? forge.pki.decryptRsaPrivateKey(privateKeyPem, config.passphrase)
    : forge.pki.privateKeyFromPem(privateKeyPem);
  if (!privateKey) {
    throw new Error('No se pudo descifrar la clave privada. Verificá la passphrase y el archivo .key.');
  }
  return { certificate, privateKey, certificatePem };
}
