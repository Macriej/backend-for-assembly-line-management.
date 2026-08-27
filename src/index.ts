import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import assemblyLineRoutes from './routes/assemblyLine.routes';
import workstationRoutes from './routes/workstation.routes';
import allocationRoutes from './routes/allocation.routes';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/products', authMiddleware, productRoutes);
  app.use('/api/assembly-lines', authMiddleware, assemblyLineRoutes);
  app.use('/api/assembly-lines', authMiddleware, allocationRoutes);
  app.use('/api/workstations', authMiddleware, workstationRoutes);

  // Musi być zarejestrowany PO wszystkich routach - Express wywołuje
  // middleware z 4 argumentami tylko gdy poprzedni handler wywoła next(err)
  // (co robi wrapAsync przy odrzuconej Promise).
  app.use(errorHandler);

  return app;
}

// Eksportujemy createApp() osobno od nasłuchiwania na porcie, żeby testy
// integracyjne (supertest) mogły użyć tej samej instancji app bez
// faktycznego bindowania portu.
if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => console.log(`API running on port ${config.port}`));
}
