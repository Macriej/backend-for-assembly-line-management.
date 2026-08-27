import 'dotenv/config';
import { z } from 'zod';

// Walidujemy env przy starcie procesu, zamiast wywalać się przy pierwszym
// requeście z niejasnym błędem, albo - co gorsza - startować z niebezpiecznym
// domyślnym sekretem (np. dawne 'dev-secret-change-me' jako fallback).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  port: Number(parsed.data.PORT) || 3000,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: '8h' as const,
};
