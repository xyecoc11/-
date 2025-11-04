import { computeMRRGrowthRate, computeARPU, computeLTV, computeNRR, computeRefundRate } from './analytics';
import type { WhopOrder, WhopRefund } from './types';

describe('computeMRRGrowthRate', () => {
  it('calculates correct percent', () => {
    expect(computeMRRGrowthRate(1050, 1000)).toBeCloseTo(0.05);
    expect(computeMRRGrowthRate(1000, 1000)).toBe(0);
    expect(computeMRRGrowthRate(900, 1000)).toBeCloseTo(-0.1);
    expect(computeMRRGrowthRate(100, 0)).toBe(0);
  });
});

describe('computeARPU', () => {
  const orders: WhopOrder[] = [
    { id: '1', userId: 'a', amountCents: 1000, currency: 'USD', createdAt: '', refunded: false },
    { id: '2', userId: 'b', amountCents: 2000, currency: 'USD', createdAt: '', refunded: false }
  ];
  it('calculates ARPU correctly', () => {
    expect(computeARPU(orders, 2)).toBe(1500);
    expect(computeARPU(orders, 0)).toBe(0);
  });
});

describe('computeLTV', () => {
  it('calculates LTV, handling churnRate zero', () => {
    expect(computeLTV(0.05, 2000)).toBeCloseTo(40000);
    expect(computeLTV(0, 2000)).toBe(24000);
  });
});

describe('computeNRR', () => {
  it('computes NRR (decimal)', () => {
    expect(computeNRR(1000, 100, 50)).toBeCloseTo(1.05);
    expect(computeNRR(1000, 0, 0)).toBe(1);
    expect(computeNRR(0, 100, 50)).toBe(0);
  });
});

describe('computeRefundRate', () => {
  const orders: WhopOrder[] = [
    { id: '1', userId: 'a', amountCents: 1000, currency: 'USD', createdAt: '', refunded: false },
    { id: '2', userId: 'b', amountCents: 2000, currency: 'USD', createdAt: '', refunded: false },
  ];
  const refunds: WhopRefund[] = [
    { id: '1', orderId: '1', amountCents: 500, createdAt: '' },
    { id: '2', orderId: '2', amountCents: 1000, createdAt: '' }
  ];
  it('correctly yields refund rates', () => {
    expect(computeRefundRate(orders, refunds)).toBeCloseTo(0.5);
    expect(computeRefundRate([], refunds)).toBe(0);
  });
});
