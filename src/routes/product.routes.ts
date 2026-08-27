import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { wrapAsync } from '../middleware/error.middleware';
import { parseIdParam } from '../utils/validateId';
import { AppError } from '../utils/AppError';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /api/products
router.get(
  '/',
  wrapAsync(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { _count: { select: { assemblyLines: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(products);
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { assemblyLines: true },
    });
    if (!product) throw new AppError(404, 'Product not found');
    res.json(product);
  })
);

// POST /api/products
router.post(
  '/',
  wrapAsync(async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    const exists = await prisma.product.findUnique({ where: { name: parsed.data.name } });
    if (exists) throw new AppError(409, 'Product name already exists');

    const product = await prisma.product.create({ data: parsed.data });
    res.status(201).json(product);
  })
);

// PUT /api/products/:id
router.put(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    // update rzuci P2025 jeśli id nie istnieje - łapie to globalny errorHandler
    const product = await prisma.product.update({ where: { id }, data: parsed.data });
    res.json(product);
  })
);

// DELETE /api/products/:id  (kaskadowo usuwa linie i alokacje - onDelete: Cascade)
router.delete(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
