// The Azure wrapper in api/: what it bundles, and the Table counter store's concurrency.
// The Functions host isn't available here; scripts/build-api.mjs is exercised in CI.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TableStore, UnavailableStore } from "../api/src/table-store.ts";

describe("bundled framework", () => {
  test("api/src/bundled.ts imports every module file, plus router, scoring, sections and the skill", () => {
    const text = readFileSync("api/src/bundled.ts", "utf8");
    for (const file of readdirSync("skills/intake/modules").filter((f) => f.endsWith(".yaml"))) {
      assert.ok(text.includes(`skills/intake/modules/${file}"`), `${file} isn't imported`);
      assert.ok(text.includes(`"${file}":`), `${file} isn't in the modules map`);
    }
    for (const path of ["skills/intake/router.yaml", "skills/intake/scoring.yaml", "templates/sections.yaml", "skills/intake/SKILL.md"]) {
      assert.ok(text.includes(path), `${path} isn't imported`);
    }
  });

  test("the API runs on node:22, matching the kit", () => {
    assert.equal(JSON.parse(readFileSync("api/package.json", "utf8")).engines.node, ">=22");
  });
});

/** A fake TableClient: entities in a map, ETags as counters, optional scripted conflicts. */
function fakeTable(opts: { conflictsOnUpdate?: number; conflictOnCreate?: boolean } = {}) {
  const rows = new Map<string, { value: number; etag: string }>();
  let etag = 0;
  let updateConflicts = opts.conflictsOnUpdate ?? 0;
  let createConflict = opts.conflictOnCreate ?? false;
  const err = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });
  const client = {
    createTable: async () => { throw err(409); },
    getEntity: async (pk: string, rk: string) => {
      const row = rows.get(`${pk}|${rk}`);
      if (!row) throw err(404);
      return { partitionKey: pk, rowKey: rk, value: row.value, etag: row.etag };
    },
    createEntity: async (e: { partitionKey: string; rowKey: string; value: number }) => {
      if (createConflict) {
        createConflict = false;
        rows.set(`${e.partitionKey}|${e.rowKey}`, { value: 5, etag: String(++etag) }); // someone else got there first
        throw err(409);
      }
      if (rows.has(`${e.partitionKey}|${e.rowKey}`)) throw err(409);
      rows.set(`${e.partitionKey}|${e.rowKey}`, { value: e.value, etag: String(++etag) });
    },
    updateEntity: async (e: { partitionKey: string; rowKey: string; value: number }, _mode: string, o: { etag: string }) => {
      const key = `${e.partitionKey}|${e.rowKey}`;
      if (updateConflicts > 0) {
        updateConflicts--;
        const row = rows.get(key)!;
        rows.set(key, { value: row.value + 1, etag: String(++etag) }); // a concurrent increment lands first
        throw err(412);
      }
      if (rows.get(key)?.etag !== o.etag) throw err(412);
      rows.set(key, { value: e.value, etag: String(++etag) });
    },
  };
  return { rows, client: client as never };
}

describe("Table counter store", () => {
  test("missing counters read as zero; add creates then increments", async () => {
    const { client } = fakeTable();
    const store = new TableStore(client);
    assert.equal(await store.get("spend:month:2026-10"), 0);
    assert.equal(await store.add("spend:month:2026-10", 1500), 1500);
    assert.equal(await store.add("spend:month:2026-10", 500), 2000);
    assert.equal(await store.get("spend:month:2026-10"), 2000);
  });

  test("keys split into partition and row; characters Tables forbids are replaced", async () => {
    const { rows, client } = fakeTable();
    await new TableStore(client).add("session:2026-10-11-beef:turns", 1);
    await new TableStore(client).add("ip:a/b#c?d:hour:2026-10-11T15", 1);
    assert.deepEqual([...rows.keys()], ["session|2026-10-11-beef:turns", "ip|a_b_c_d:hour:2026-10-11T15"]);
  });

  test("a stale ETag is retried, so no concurrent increment is lost", async () => {
    const { client } = fakeTable({ conflictsOnUpdate: 2 });
    const store = new TableStore(client);
    await store.add("k:x", 10);
    assert.equal(await store.add("k:x", 1), 13, "10, two concurrent +1s, then ours");
  });

  test("losing the race to create is retried as an update", async () => {
    const { client } = fakeTable({ conflictOnCreate: true });
    assert.equal(await new TableStore(client).add("k:y", 2), 7);
  });

  test("endless contention gives up with an error rather than guessing", async () => {
    const { client } = fakeTable({ conflictsOnUpdate: 100 });
    const store = new TableStore(client);
    await store.add("k:z", 1).catch(() => {});
    await assert.rejects(store.add("k:z", 1), /too much contention/);
  });

  test("with no storage configured every operation fails, so the handler refuses", async () => {
    const store = new UnavailableStore("no storage");
    await assert.rejects(store.get(), /no storage/);
    await assert.rejects(store.add(), /no storage/);
  });
});
