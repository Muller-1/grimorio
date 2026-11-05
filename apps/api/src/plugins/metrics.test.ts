import { describe, expect, it } from 'vitest';
import { cpuLimitFrom, throttlingFrom } from './metrics';

describe('limite de CPU do contêiner', () => {
  it('cgroup v2: "10000 100000" = 0,1 núcleo (o Render grátis); "max" = sem limite', () => {
    expect(cpuLimitFrom('10000 100000')).toBe(0.1);
    expect(cpuLimitFrom('50000 100000')).toBe(0.5);
    expect(cpuLimitFrom('max 100000')).toBeNull();
  });

  it('cgroup v1: quota/período; quota -1 = sem limite; fora de contêiner = null', () => {
    expect(cpuLimitFrom(null, '10000', '100000')).toBe(0.1);
    expect(cpuLimitFrom(null, '-1', '100000')).toBeNull();
    expect(cpuLimitFrom(null, null, null)).toBeNull();
  });
});

describe('CPU cortada pelo limite', () => {
  it('cgroup v2 (microssegundos)', () => {
    const stat = [
      'usage_usec 5000000',
      'nr_periods 200',
      'nr_throttled 150',
      'throttled_usec 9000000',
    ].join('\n');
    expect(throttlingFrom(stat)).toEqual({ periods: 200, throttled: 150, ms: 9000 });
  });

  it('cgroup v1 (nanossegundos) e arquivo ausente', () => {
    const stat = 'nr_periods 10\nnr_throttled 4\nthrottled_time 2000000000';
    expect(throttlingFrom(stat)).toEqual({ periods: 10, throttled: 4, ms: 2000 });
    expect(throttlingFrom(null)).toBeNull();
    expect(throttlingFrom('usage_usec 1')).toBeNull();
  });
});
