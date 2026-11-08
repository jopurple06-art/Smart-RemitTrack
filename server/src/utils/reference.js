import crypto from 'node:crypto';

export function createReference() {
  const year = new Date().getFullYear();
  const sequence = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `SRM-${year}-${sequence}`;
}
