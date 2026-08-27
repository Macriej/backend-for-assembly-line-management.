import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { wrapAsync } from '../middleware/error.middleware';
import { parseIdParam } from '../utils/validateId';
import { AppError } from '../utils/AppError';

const router = Router();

const lineSchema = z.object({
  name: z.string().min(1),
  active: z.boolean().default(true),
  productId: z.number().int(),
});

// GET /api/assembly-lines?productId=1
router.get(
  '/',
  wrapAsync(async (req, res) => {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    if (req.query.productId && (!Number.isInteger(productId) || (productId as number) <= 0)) {
      return res.status(400).json({ message: 'Invalid productId query param' });
    }

    const lines = await prisma.assemblyLine.findMany({
      where: productId ? { productId } : undefined,
      include: { product: true },
      orderBy: { id: 'asc' },
    });
    res.json(lines);
  })
);

// GET /api/assembly-lines/:id
router.get(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const line = await prisma.assemblyLine.findUnique({
      where: { id },
      include: {
        product: true,
        allocations: { include: { workstation: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!line) throw new AppError(404, 'Assembly line not found');
    res.json(line);
  })
);

// POST /api/assembly-lines
router.post(
  '/',
  wrapAsync(async (req, res) => {
    const parsed = lineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    // Sprawdzamy, że produkt istnieje - inaczej Prisma rzuci mniej czytelny P2003 (FK violation)
    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
    if (!product) throw new AppError(400, 'productId does not reference an existing product');

    const line = await prisma.assemblyLine.create({ data: parsed.data });
    res.status(201).json(line);
  })
);

// PUT /api/assembly-lines/:id
router.put(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const parsed = lineSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    if (parsed.data.productId !== undefined) {
      const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
      if (!product) throw new AppError(400, 'productId does not reference an existing product');
    }

    const line = await prisma.assemblyLine.update({ where: { id }, data: parsed.data });
    res.json(line);
  })
);

// DELETE /api/assembly-lines/:id
router.delete(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    await prisma.assemblyLine.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
