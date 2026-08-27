import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Ostatni middleware w łańcuchu Express - łapie wszystko, co przeleci przez
 * routy (włącznie z odrzuconymi Promise'ami dzięki wrapAsync w routach).
 *
 * Wcześniej każdy catch{} w routach zwracał 404 niezależnie od przyczyny
 * błędu, co ukrywało prawdziwe awarie (np. błąd połączenia z bazą) pod
 * mylącym "Not found". Tutaj rozróżniamy:
 *  - Prisma P2025 (record not found)  -> 404
 *  - Prisma P2002 (unique constraint) -> 409
 *  - AppError rzucony świadomie       -> jego własny statusCode
 *  - wszystko inne                    -> 500 + zalogowanie na serwerze
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Unique constraint violation', meta: err.meta });
    }
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * Owija async handlery routów, żeby odrzucone Promise'y trafiały do next(err)
 * zamiast crashować proces (Express 4 nie robi tego automatycznie).
 */
export function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
