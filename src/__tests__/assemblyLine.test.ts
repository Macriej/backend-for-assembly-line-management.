import request from 'supertest';
import { createApp } from '../index';
import { prisma } from '../lib/prisma';

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;

const app = createApp();

describe('Assembly lines & allocations', () => {
  const testEmail = `test-lines-${Date.now()}@example.com`;
  const testPassword = 'password123';
  let token: string;
  let productAId: number;
  let productBId: number;
  let lineAId: number;
  let lineBId: number;
  let workstationId: number;
  let allocationOnLineBId: number;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email: testEmail, password: testPassword });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });
    token = login.body.token;

    const productA = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Product-A-${Date.now()}` });
    productAId = productA.body.id;

    const productB = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Product-B-${Date.now()}` });
    productBId = productB.body.id;

    const lineA = await request(app)
      .post('/api/assembly-lines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Line A', productId: productAId });
    lineAId = lineA.body.id;

    const lineB = await request(app)
      .post('/api/assembly-lines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Line B', productId: productBId });
    lineBId = lineB.body.id;

    const workstation = await request(app)
      .post('/api/workstations')
      .set('Authorization', `Bearer ${token}`)
      .send({ shortName: 'TWS', name: 'Test Workstation', pcName: 'PC-TEST-01' });
    workstationId = workstation.body.id;

    const allocation = await request(app)
      .post(`/api/assembly-lines/${lineBId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ workstationId });
    allocationOnLineBId = allocation.body.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: [productAId, productBId] } } });
    await prisma.workstation.deleteMany({ where: { id: workstationId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('filters assembly lines by productId', async () => {
    const res = await request(app)
      .get(`/api/assembly-lines?productId=${productAId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((l: { productId: number }) => l.productId === productAId)).toBe(true);
  });

  it('returns 400 for a malformed id param', async () => {
    const res = await request(app)
      .get('/api/assembly-lines/not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('rejects reordering allocations that belong to a different assembly line', async () => {
    // allocationOnLineBId belongs to lineB, but we try to reorder it through lineA's endpoint
    const res = await request(app)
      .put(`/api/assembly-lines/${lineAId}/allocations/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedAllocationIds: [allocationOnLineBId] });

    expect(res.status).toBe(400);
  });

  it('rejects deleting an allocation through the wrong assembly line', async () => {
    const res = await request(app)
      .delete(`/api/assembly-lines/${lineAId}/allocations/${allocationOnLineBId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('allows reordering through the correct assembly line', async () => {
    const res = await request(app)
      .put(`/api/assembly-lines/${lineBId}/allocations/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedAllocationIds: [allocationOnLineBId] });

    expect(res.status).toBe(200);
  });
});

function expect(actual: any) {
  const jestExpect = (globalThis as any).expect;

  if (typeof jestExpect === 'function') {
    return jestExpect(actual);
  }

  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${a} to equal ${b}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      },
      toEqual(expected: any) {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a === b) {
          throw new Error(`Expected ${a} not to equal ${b}`);
        }
      },
    },
  };
}

