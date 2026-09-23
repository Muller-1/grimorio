import { seededRng } from '@grimorio/rules';
import { describe, expect, it } from 'vitest';
import {
  controllableClock,
  controllableRng,
  createEventBus,
  defaultPorts,
  inMemoryMailer,
  isControllableClock,
  isControllableRng,
  isInMemoryMailer,
  sequentialIds,
} from '.';

describe('controllableRng', () => {
  it('com semente, repete a sequência do seededRng; sem, volta à base', () => {
    const base = { int: () => 7 };
    const rng = controllableRng(base);
    expect(rng.int(1, 20)).toBe(7);
    rng.reseed(42);
    const oracle = seededRng(42);
    for (let i = 0; i < 5; i++) expect(rng.int(1, 20)).toBe(oracle.int(1, 20));
    rng.reseed(null);
    expect(rng.int(1, 20)).toBe(7);
  });
});

describe('controllableClock', () => {
  it('para, adianta e volta ao relógio base', () => {
    const base = { now: () => new Date('2030-01-01T00:00:00Z') };
    const clock = controllableClock(base);
    expect(clock.now().toISOString()).toBe('2030-01-01T00:00:00.000Z');
    clock.set('2026-09-23T12:00:00Z');
    clock.advance(31 * 24 * 3600 * 1000);
    expect(clock.now().toISOString()).toBe('2026-10-24T12:00:00.000Z');
    clock.set(null);
    expect(clock.now().toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(() => clock.set('ontem')).toThrow(RangeError);
  });
});

describe('inMemoryMailer e eventos', () => {
  it('guarda os e-mails e os eventos', async () => {
    const mailer = inMemoryMailer();
    await mailer.send({ to: 'a@b.c', subject: 'Oi', text: '...' });
    expect(mailer.outbox()).toHaveLength(1);
    mailer.clear();
    expect(mailer.outbox()).toEqual([]);

    const bus = createEventBus({ record: true });
    const seen: string[] = [];
    const off = bus.subscribe((e) => seen.push(e.type));
    bus.publish({ type: 'a', at: 'x' });
    bus.publish({ type: 'b', at: 'x' });
    off();
    bus.publish({ type: 'a', at: 'x' });
    expect(seen).toEqual(['a', 'b']);
    expect(bus.recorded({ type: 'a' })).toHaveLength(2);
  });
});

describe('defaultPorts', () => {
  it('fora de produção, tudo é controlável e gravado', () => {
    const ports = defaultPorts('test');
    expect(isControllableRng(ports.rng)).toBe(true);
    expect(isControllableClock(ports.clock)).toBe(true);
    expect(isInMemoryMailer(ports.mailer)).toBe(true);
    ports.events.publish({ type: 'x', at: 'y' });
    expect(ports.events.recorded()).toHaveLength(1);
  });

  it('em produção, nada é controlável, nada é gravado e e-mail sem provedor falha', async () => {
    const ports = defaultPorts('production');
    expect(isControllableRng(ports.rng)).toBe(false);
    expect(isControllableClock(ports.clock)).toBe(false);
    expect(isInMemoryMailer(ports.mailer)).toBe(false);
    ports.events.publish({ type: 'x', at: 'y' });
    expect(ports.events.recorded()).toEqual([]);
    await expect(ports.mailer.send({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow();
  });
});

describe('sequentialIds', () => {
  it('gera UUIDs válidos e previsíveis', () => {
    const ids = sequentialIds();
    expect(ids.uuid()).toBe('00000000-0000-4000-8000-000000000001');
    expect(ids.uuid()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
