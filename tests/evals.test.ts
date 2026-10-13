// The persona eval harness itself, on scripted models: no API calls.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { loadPersonas, parsePersona } from "../src/evals/personas.ts";
import { createAzureSimulator, simulatorPrompt, type Simulator } from "../src/evals/simulator.ts";
import { report, runInterview, scoreRun, storedQuotes } from "../src/evals/run.ts";
import type { Provider } from "../src/llm/types.ts";
import type { Session } from "../src/lib/session.ts";
import { makeItem, makeSession, type V2Step } from "./helpers.ts";

const fw = loadFramework(".");
const SKILL = readFileSync("skills/intake/SKILL.md", "utf8");
const CONVO = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));
const personas = loadPersonas();
const opsSupervisor = personas.find((p) => p.id === "ops-supervisor-report")!;

describe("persona cards", () => {
  test("the spec's six personas load, plus the enablement kit from the first live test", () => {
    assert.deepEqual(personas.map((p) => p.expect.primary_type), ["data_report", "broken", "manual_process", "known_idea", "exploratory", "data_report", "known_idea"]);
  });

  test("a malformed card fails loudly", () => {
    assert.throws(() => parsePersona("id: x\nexpect:\n  primary_type: report\n", "bad.yaml"), /bad\.yaml: .*primary_type/);
  });

  test("the simulator never sees the expected outcome", () => {
    for (const p of personas) {
      const prompt = simulatorPrompt(p);
      assert.ok(prompt.includes(p.situation.trim().slice(0, 40)));
      assert.doesNotMatch(prompt, /fix_not_build|gather_more|dont_build|primary_type|expect/);
    }
  });
});

describe("Azure simulator", () => {
  test("flips roles: the interviewer becomes the user it answers", async () => {
    let body: any;
    const fake = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ choices: [{ message: { content: "Four hours." } }], usage: { prompt_tokens: 10, completion_tokens: 3 } }));
    }) as unknown as typeof fetch;
    const sim = createAzureSimulator({ endpoint: "https://x.openai.azure.com", deployment: "d", apiKey: "k", model: "gpt-4.1-mini", fetch: fake });
    const out = await sim.reply(opsSupervisor, [{ role: "user", content: "opening" }, { role: "assistant", content: "How long does it take?" }]);
    assert.equal(out.text, "Four hours.");
    assert.deepEqual(body.messages.slice(1).map((m: { role: string }) => m.role), ["assistant", "user"]);
    assert.equal(body.response_format, undefined, "plain text, no schema");
  });
});

describe("scoring", () => {
  const fixture: Session = parseYaml(readFileSync("tests/fixtures/session/pick-exception-scored.yaml", "utf8"));
  // The scored fixture was recorded from these messages (the golden spec pack renders from it).
  const messages: string[] = JSON.parse(readFileSync("tests/fixtures/session/pick-exception-transcript.json", "utf8")).messages;
  const transcript = messages.map((text, i) => ({ role: "user" as const, text, at: `t${i}` }));

  test("the worked example scores full marks for the ops-supervisor persona", () => {
    const s = scoreRun(opsSupervisor, fixture, transcript, true, fw);
    assert.deepEqual(s.notes, []);
    assert.equal(s.routed && s.itemsFound && s.gatesCorrect && s.enoughItems, true);
  });

  test("a wrong gate, a missing item and an invented quote are each caught", () => {
    const wrong: Session = structuredClone(fixture);
    wrong.items[0].gate!.decision = "gather_more";
    wrong.items.pop();
    wrong.core.users.quotes = ["words nobody typed"];
    const s = scoreRun(opsSupervisor, wrong, transcript, true, fw);
    assert.equal(s.gatesCorrect, false);
    assert.equal(s.itemsFound, false);
    assert.equal(s.ungroundedQuotes, 1);
    assert.equal(s.notes.length >= 3, true);
  });

  test("gates aren't scored when the interview didn't complete", () => {
    assert.equal(scoreRun(opsSupervisor, fixture, transcript, false, fw).gatesCorrect, null);
  });

  test("storedQuotes finds quotes in core, coverage, facts and the router", () => {
    const q = storedQuotes(fixture);
    assert.ok(q.includes("I build it, the shift leads use it Tuesday"));
    assert.ok(q.includes("I need a report of short picks by shift and picker"));
  });
});

describe("a scripted interview", () => {
  test("runs to confirmation, scores, and reports", async () => {
    // The engine's calls, answered in order from the worked example's script.
    const queues = new Map<string, unknown[]>();
    for (const step of CONVO.steps as V2Step[]) for (const m of step.model) queues.set(m.call, [...(queues.get(m.call) ?? []), m.output]);
    const users = CONVO.steps.slice(1).map((s: { user: string }) => s.user);
    const interviewer: Provider = { name: "azure-openai", complete: async (req) => ({ text: JSON.stringify(queues.get(req.format!.name)!.shift()), model: "gpt-4.1-mini", usage: { inputTokens: 1000, outputTokens: 100, cachedInputTokens: 0 } }) };
    const seen: string[] = [];
    const simulator: Simulator = { reply: async (_p, conversation) => { seen.push(conversation.at(-1)!.content); return { text: users.shift()!, model: "gpt-4.1-mini", usage: { inputTokens: 200, outputTokens: 20, cachedInputTokens: 0 } }; } };
    const persona = { ...opsSupervisor, opening: CONVO.steps[0].user };
    let spent = 0;
    const record = await runInterview({ persona, run: 1, interviewer, interviewerModel: "gpt-4.1-mini", simulator, simulatorModel: "gpt-4.1-mini", fw, skill: SKILL, onSpend: (u) => { spent += u; } });
    assert.equal(record.completed, true);
    // The simulated user sees the summary card under the proposal, as a web user would.
    assert.ok(seen.some((m) => m.includes("What you told me:")), "the simulator never saw the summary");
    assert.equal(record.turns, CONVO.steps.length);
    assert.deepEqual(record.score.notes, []);
    assert.ok(spent > 0 && Math.abs(spent - record.costUSD) < 1e-9);
    const md = report([record], { date: "2026-10-11", interviewerModel: "gpt-4.1-mini", simulatorModel: "gpt-4.1-mini", notRun: ["Claude: no key"] });
    assert.match(md, /\| ops-supervisor-report \| 1 \| 100% \| 100% \| 100% \| 100% \|/);
    assert.match(md, /## Not run\n\n- Claude: no key/);
  });

  test("stops when told the budget is spent", async () => {
    const interviewer: Provider = { name: "azure-openai", complete: async () => { throw new Error("should not be called"); } };
    const simulator: Simulator = { reply: async () => { throw new Error("should not be called"); } };
    const record = await runInterview({ persona: opsSupervisor, run: 1, interviewer, interviewerModel: "gpt-4.1-mini", simulator, simulatorModel: "gpt-4.1-mini", fw, skill: SKILL, shouldStop: () => true });
    assert.equal(record.turns, 0);
    assert.match(record.error!, /budget/);
  });
});

describe("persona expectations from the first live test", () => {
  const fw = loadFramework(".");
  const p = loadPersonas().find((x) => x.id === "enablement-kit")!;

  test("an invented manual-process item, a captured answer or a wrong band fails the checks", () => {
    const s = makeSession([makeItem("item-1", { type: "known_idea" })], { confirmed: true });
    s.items[0].facts.input_digital = { band: "partly", evidence: ["core.data"], quotes: [] };
    s.core.constraints = { status: "assumed", value: "MIT", quotes: ["MIT"], probe_count: 0, updated_at: "2026-10-13T15:00:00.000Z", source: "captured" };
    s.items.push(makeItem("item-2", { type: "manual_process", superseded_by: "item-1" }));
    const score = scoreRun(p, s, [], true, fw);
    assert.equal(score.expectations, false);
    const note = score.notes.find((n) => n.startsWith("expectations"))!;
    assert.match(note, /has a manual_process item/);
    assert.match(note, /core\.constraints only captured/);
    assert.match(note, /input_digital partly \(want fully\)/);
    assert.equal(score.captured, 1);
  });
});
