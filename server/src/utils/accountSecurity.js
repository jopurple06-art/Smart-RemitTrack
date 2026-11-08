import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set before encrypting recipient account details.');
  return createHash('sha256').update(process.env.JWT_SECRET).digest();
}

export function encryptAccountNumber(accountNumber) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(accountNumber, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptAccountNumber(value) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskAccountNumber(lastFour) {
  return lastFour ? `**** ${lastFour}` : '';
}
