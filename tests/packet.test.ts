// Async intake: the question packet (HANDOFF.md, "Async intake mode", step 2). Code only.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { buildPacket, packetAgenda, packetEmail } from "../src/lib/packet.ts";
import { queueFor } from "../src/engine/plan.ts";
import { MANUAL_QUESTION } from "../src/engine/turn.ts";
import type { ItemType } from "../src/lib/framework.ts";
import type { Item } from "../src/lib/session.ts";

const fw = loadFramework(".");
const TYPES = Object.keys(fw.router.types) as ItemType[];

describe("question packet", () => {
  test("every area has packet wording: a question, why it matters and an example", () => {
    for (const [id, a] of fw.areas) {
      assert.ok(a.packet?.ask.trim().endsWith("?") || a.packet?.ask.trim().endsWith("."), `${id}: ask`);
      assert.ok(a.packet.why.trim() && a.packet.example.trim(), `${id}: why and example`);
    }
  });

  test("the questions are the required areas in the engine's order, then the checks word for word", () => {
    for (const type of TYPES) {
      const p = buildPacket(fw, { request: "r", type });
      const queue = queueFor({ id: "item-1", type, modifiers: [], spawned_from: null } as unknown as Item, fw);
      assert.deepEqual(p.questions.filter((q) => !q.check).map((q) => q.area), queue, type);
      const checks = p.questions.filter((q) => q.check);
      assert.deepEqual(checks.map((q) => q.check), [
        ...(fw.router.checks!.manual_work.applies_to.includes(type) ? ["manual_work"] : []),
        ...(fw.router.checks!.kill_criteria.applies_to.includes(type) ? ["kill_criteria"] : []),
      ], type);
      for (const c of checks) assert.equal(c.ask, c.check === "manual_work" ? MANUAL_QUESTION : fw.router.checks!.kill_criteria.question);
    }
  });

  test("every other area that applies is under \"if you know\", and no area appears twice", () => {
    for (const type of TYPES) {
      const p = buildPacket(fw, { request: "r", type, modifiers: ["compliance", "integration"] });
      const all = ["core", type, "mod.compliance", "mod.integration"].flatMap((m) => fw.modules[m].areas.map((a) => a.id));
      const listed = [...p.questions.filter((q) => !q.check).map((q) => q.area), ...p.if_you_know.map((q) => q.area)];
      assert.deepEqual([...listed].sort(), [...new Set(all)].sort(), type);
      assert.equal(new Set(listed).size, listed.length, type);
    }
  });

  test("the email and the agenda carry every question, numbered once", () => {
    const p = buildPacket(fw, { request: "An enablement kit for AI rollouts", type: "known_idea" });
    for (const text of [packetEmail(p), packetAgenda(p)]) {
      for (const q of [...p.questions, ...p.if_you_know]) assert.ok(text.includes(q.ask), q.ask);
      const total = p.questions.length + p.if_you_know.length;
      assert.ok(new RegExp(`(^|\\n)(## )?${total}\\. `).test(text), "numbering runs to the last question");
    }
    assert.match(packetEmail(p), /For example:/);
    assert.match(packetAgenda(p), /Notes:/);
  });
});
