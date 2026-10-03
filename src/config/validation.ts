import { ValidationPipe } from '@nestjs/common';

/** Validação global das requisições; usada pelo main.ts e pelos testes HTTP. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
}
