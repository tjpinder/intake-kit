// Counters the server keeps: monthly and daily spend, per-session turns and spend, and
// hashed-IP request counts. Never conversation text. The Azure Table implementation lives in
// api/; this in-memory one is for tests and local development.

export interface CounterStore {
  get(key: string): Promise<number>;
  /** Adds delta and returns the new total. */
  add(key: string, delta: number): Promise<number>;
}

export class MemoryStore implements CounterStore {
  readonly values = new Map<string, number>();
  failing = false;
  async get(key: string): Promise<number> {
    if (this.failing) throw new Error("store unavailable");
    return this.values.get(key) ?? 0;
  }
  async add(key: string, delta: number): Promise<number> {
    if (this.failing) throw new Error("store unavailable");
    const next = (this.values.get(key) ?? 0) + delta;
    this.values.set(key, next);
    return next;
  }
}

/** Spend is stored in whole micro-dollars so counters stay integers. */
export const toMicros = (usd: number) => Math.ceil(usd * 1_000_000);
export const fromMicros = (micros: number) => micros / 1_000_000;

export const keys = {
  monthSpend: (now: Date) => `spend:month:${now.toISOString().slice(0, 7)}`,
  daySpend: (now: Date) => `spend:day:${now.toISOString().slice(0, 10)}`,
  sessionTurns: (id: string) => `session:${id}:turns`,
  sessionSpend: (id: string) => `session:${id}:spend`,
  sessionVerified: (id: string) => `session:${id}:verified`,
  ipHour: (hash: string, now: Date) => `ip:${hash}:hour:${now.toISOString().slice(0, 13)}`,
  ipDay: (hash: string, now: Date) => `ip:${hash}:day:${now.toISOString().slice(0, 10)}`,
};
