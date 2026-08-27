import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { wrapAsync } from '../middleware/error.middleware';
import { parseIdParam } from '../utils/validateId';
import { AppError } from '../utils/AppError';

const router = Router();

const workstationSchema = z.object({
  shortName: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  pcName: z.string().min(1).max(100),
});

// GET /api/workstations
router.get(
  '/',
  wrapAsync(async (_req, res) => {
    const workstations = await prisma.workstation.findMany({
      include: { _count: { select: { allocations: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(workstations);
  })
);

// GET /api/workstations/:id
router.get(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const workstation = await prisma.workstation.findUnique({
      where: { id },
      include: {
        allocations: { include: { assemblyLine: { include: { product: true } } } },
      },
    });
    if (!workstation) throw new AppError(404, 'Workstation not found');
    res.json(workstation);
  })
);

// POST /api/workstations
router.post(
  '/',
  wrapAsync(async (req, res) => {
    const parsed = workstationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    const workstation = await prisma.workstation.create({ data: parsed.data });
    res.status(201).json(workstation);
  })
);

// PUT /api/workstations/:id
router.put(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    const parsed = workstationSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    const workstation = await prisma.workstation.update({ where: { id }, data: parsed.data });
    res.json(workstation);
  })
);

// DELETE /api/workstations/:id
router.delete(
  '/:id',
  wrapAsync(async (req, res) => {
    const id = parseIdParam(req.params.id, res);
    if (id === null) return;

    await prisma.workstation.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
