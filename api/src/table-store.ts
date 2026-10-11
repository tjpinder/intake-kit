// Counters in Azure Table storage. Each key "kind:rest" becomes PartitionKey "kind" and RowKey
// "rest"; increments use optimistic concurrency (ETags), retried on conflict, so concurrent
// requests can't lose an update. Only counters are stored: never conversation text.

import { TableClient, type TableEntity } from "@azure/data-tables";
import type { CounterStore } from "../../src/server/store.ts";

interface Counter extends TableEntity {
  value: number;
}

const status = (err: unknown) => (err as { statusCode?: number }).statusCode;

export class TableStore implements CounterStore {
  private ready: Promise<void> | null = null;
  private readonly client: TableClient;
  constructor(client: TableClient) {
    this.client = client;
  }

  static fromConnectionString(connectionString: string, table = "intakekitcounters"): TableStore {
    return new TableStore(TableClient.fromConnectionString(connectionString, table));
  }

  private ensureTable(): Promise<void> {
    this.ready ??= this.client.createTable().catch((err) => {
      if (status(err) !== 409) {
        this.ready = null;
        throw err;
      }
    });
    return this.ready;
  }

  private split(key: string): { partitionKey: string; rowKey: string } {
    const i = key.indexOf(":");
    return { partitionKey: key.slice(0, i), rowKey: key.slice(i + 1).replace(/[/\\#?]/g, "_") };
  }

  async get(key: string): Promise<number> {
    await this.ensureTable();
    const { partitionKey, rowKey } = this.split(key);
    try {
      const entity = await this.client.getEntity<Counter>(partitionKey, rowKey);
      return Number(entity.value) || 0;
    } catch (err) {
      if (status(err) === 404) return 0;
      throw err;
    }
  }

  async add(key: string, delta: number): Promise<number> {
    await this.ensureTable();
    const { partitionKey, rowKey } = this.split(key);
    for (let attempt = 0; attempt < 8; attempt++) {
      let current: (Counter & { etag: string }) | null = null;
      try {
        current = await this.client.getEntity<Counter>(partitionKey, rowKey);
      } catch (err) {
        if (status(err) !== 404) throw err;
      }
      try {
        if (!current) {
          await this.client.createEntity<Counter>({ partitionKey, rowKey, value: delta });
          return delta;
        }
        const next = (Number(current.value) || 0) + delta;
        await this.client.updateEntity<Counter>({ partitionKey, rowKey, value: next }, "Replace", { etag: current.etag });
        return next;
      } catch (err) {
        // 409: someone created it first; 412: someone updated it first. Read again and retry.
        if (status(err) !== 409 && status(err) !== 412) throw err;
      }
    }
    throw new Error(`Couldn't update counter ${key}: too much contention.`);
  }
}

/** Used when no storage is configured: every operation fails, so the handler refuses requests. */
export class UnavailableStore implements CounterStore {
  private readonly reason: string;
  constructor(reason: string) {
    this.reason = reason;
  }
  async get(): Promise<number> {
    throw new Error(this.reason);
  }
  async add(): Promise<number> {
    throw new Error(this.reason);
  }
}
