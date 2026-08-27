/**
 * Błąd ze świadomie ustawionym statusem HTTP.
 * Rzucany w routach, łapany przez globalny errorHandler middleware.
 */
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
