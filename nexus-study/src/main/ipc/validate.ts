import { ValidationError } from '../lib/util.ts';

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`El campo "${field}" es inválido.`);
  }
  return value;
}

export function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new ValidationError(`El campo "${field}" debe ser una lista de textos.`);
  }
  return value;
}
