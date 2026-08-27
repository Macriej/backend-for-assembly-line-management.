import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { wrapAsync } from '../middleware/error.middleware';
import { parseIdParam } from '../utils/validateId';
import { AppError } from '../utils/AppError';

const router = Router();

// POST /api/assembly-lines/:lineId/allocations  { workstationId }
router.post(
  '/:lineId/allocations',
  wrapAsync(async (req, res) => {
    const lineId = parseIdParam(req.params.lineId, res);
    if (lineId === null) return;

    const parsed = z.object({ workstationId: z.number().int() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    const [line, workstation] = await Promise.all([
      prisma.assemblyLine.findUnique({ where: { id: lineId } }),
      prisma.workstation.findUnique({ where: { id: parsed.data.workstationId } }),
    ]);
    if (!line) throw new AppError(404, 'Assembly line not found');
    if (!workstation) throw new AppError(400, 'workstationId does not reference an existing workstation');

    const maxOrder = await prisma.allocation.aggregate({
      where: { assemblyLineId: lineId },
      _max: { order: true },
    });

    try {
      const allocation = await prisma.allocation.create({
        data: {
          assemblyLineId: lineId,
          workstationId: parsed.data.workstationId,
          order: (maxOrder._max.order ?? 0) + 1,
        },
        include: { workstation: true },
      });
      res.status(201).json(allocation);
    } catch {
      throw new AppError(409, 'Workstation already allocated to this line');
    }
  })
);

// PUT /api/assembly-lines/:lineId/allocations/reorder  { orderedAllocationIds: number[] }
router.put(
  '/:lineId/allocations/reorder',
  wrapAsync(async (req, res) => {
    const lineId = parseIdParam(req.params.lineId, res);
    if (lineId === null) return;

    const parsed = z
      .object({ orderedAllocationIds: z.array(z.number().int()).min(1) })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

    const { orderedAllocationIds } = parsed.data;

    // KLUCZOWA POPRAWKA: sprawdzamy, że KAŻDA podana alokacja faktycznie
    // należy do lineId z URL-a. Bez tego frontend (lub ktoś ręcznie wołający
    // API) mógłby przestawić kolejność alokacji zupełnie innej linii,
    // podając ich id w tym endpoincie.
    const existing = await prisma.allocation.findMany({
      where: { id: { in: orderedAllocationIds }, assemblyLineId: lineId },
      select: { id: true },
    });

    if (existing.length !== orderedAllocationIds.length) {
      throw new AppError(
        400,
        'orderedAllocationIds contains ids that do not belong to this assembly line'
      );
    }

    await prisma.$transaction(
      orderedAllocationIds.map((id, index) =>
        prisma.allocation.update({
          where: { id, assemblyLineId: lineId }, // dodatkowa gwarancja na poziomie query
          data: { order: index + 1 },
        })
      )
    );
    res.json({ message: 'Reordered' });
  })
);

// DELETE /api/assembly-lines/:lineId/allocations/:allocationId
router.delete(
  '/:lineId/allocations/:allocationId',
  wrapAsync(async (req, res) => {
    const lineId = parseIdParam(req.params.lineId, res);
    if (lineId === null) return;
    const allocationId = parseIdParam(req.params.allocationId, res);
    if (allocationId === null) return;

    // deleteMany zamiast delete: nie usunie nic, jeśli allocationId istnieje,
    // ale należy do innej linii - zamiast po cichu skasować cudzą alokację.
    const result = await prisma.allocation.deleteMany({
      where: { id: allocationId, assemblyLineId: lineId },
    });

    if (result.count === 0) {
      throw new AppError(404, 'Allocation not found for this assembly line');
    }
    res.status(204).send();
  })
);

export default router;
