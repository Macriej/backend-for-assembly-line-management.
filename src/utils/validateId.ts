import { Response } from 'express';

/**
 * Parsuje param z URL-a (np. :id) na liczbę całkowitą.
 * Jeśli param nie jest poprawną liczbą, od razu wysyła 400 i zwraca null,
 * żeby handler mógł zrobić early return zamiast przepuszczać NaN do Prisma.
 */
export function parseIdParam(raw: string, res: Response): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: `Invalid id: "${raw}"` });
    return null;
  }
  return id;
}
