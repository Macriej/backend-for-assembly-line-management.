import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });

  // --- Produkty (modele rozłączników Siemens z treści zadania) ---
  const productNames = ['8DAB', '8DJH', 'Simosec', 'NXPlus C'];
  const products: Record<string, number> = {};
  for (const name of productNames) {
    const product = await prisma.product.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    products[name] = product.id;
  }

  // --- Stanowiska (workstations) ---
  const workstationDefs = [
    { shortName: 'LW', name: 'Laser welding', pcName: 'PC-LW-01' },
    { shortName: 'MW', name: 'Manual welding', pcName: 'PC-MW-01' },
    { shortName: 'DA', name: 'Drive assembly', pcName: 'PC-DA-01' },
    { shortName: 'VDT', name: 'Voltage drop test', pcName: 'PC-VDT-01' },
    { shortName: 'LT', name: 'Leakage test', pcName: 'PC-LT-01' },
    { shortName: 'HVPD', name: 'HV/PD test', pcName: 'PC-HVPD-01' },
    { shortName: 'FI', name: 'Final inspection', pcName: 'PC-FI-01' },
    { shortName: 'FA', name: 'Frame assembly', pcName: 'PC-FA-01' },
    { shortName: 'TST', name: 'Testing', pcName: 'PC-TST-01' },
    { shortName: 'DSP', name: 'Dispatch', pcName: 'PC-DSP-01' },
  ];

  // Idempotentnie: usuwamy istniejące stanowiska o tych shortName i tworzymy od nowa,
  // żeby seed dało się bezpiecznie odpalić wielokrotnie bez duplikatów.
  const workstations: Record<string, number> = {};
  for (const ws of workstationDefs) {
    const existing = await prisma.workstation.findFirst({ where: { shortName: ws.shortName } });
    const workstation = existing ?? (await prisma.workstation.create({ data: ws }));
    workstations[ws.shortName] = workstation.id;
  }

  // --- Assembly lines (przykłady z treści zadania) ---
  // Każda linia jest przypisana do jednego produktu - assembly line wymaga productId.
  const lineDefs = [
    { name: 'Convey line', productName: '8DAB' },
    { name: 'Manual line', productName: '8DJH' },
    { name: 'Final assembly line', productName: 'Simosec' },
    { name: 'Testing line', productName: 'NXPlus C' },
  ];

  const lines: Record<string, number> = {};
  for (const def of lineDefs) {
    const existing = await prisma.assemblyLine.findFirst({
      where: { name: def.name, productId: products[def.productName] },
    });
    const line =
      existing ??
      (await prisma.assemblyLine.create({
        data: { name: def.name, productId: products[def.productName], active: true },
      }));
    lines[def.name] = line.id;
  }

  // --- Przykładowe alokacje z zachowaniem kolejności ---
  // Pokazuje jak wygląda działający pipeline stanowisk na linii "Convey line".
  const sampleAllocations: Array<{ line: string; workstation: string; order: number }> = [
    { line: 'Convey line', workstation: 'FA', order: 1 },
    { line: 'Convey line', workstation: 'LW', order: 2 },
    { line: 'Convey line', workstation: 'VDT', order: 3 },
    { line: 'Convey line', workstation: 'FI', order: 4 },
  ];

  for (const alloc of sampleAllocations) {
    await prisma.allocation.upsert({
      where: {
        assemblyLineId_workstationId: {
          assemblyLineId: lines[alloc.line],
          workstationId: workstations[alloc.workstation],
        },
      },
      update: { order: alloc.order },
      create: {
        assemblyLineId: lines[alloc.line],
        workstationId: workstations[alloc.workstation],
        order: alloc.order,
      },
    });
  }

  console.log('Seed done ✅');
}

main()
  .catch((e) => {
    console.error('Seed failed ❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
