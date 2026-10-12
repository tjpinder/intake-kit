// Azure Functions (v4 programming model) entry for the Static Web Apps managed API:
//   POST /api/turn    one user turn (see src/server/handler.ts)
//   GET  /api/config  what the UI can offer
// Everything Azure-specific is here; the logic lives in src/server and is tested without Azure.

import * as frameworkValidators from "../../src/lib/generated/framework-validators.js";
import { parse as parseYaml } from "yaml";
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { buildFramework } from "../../src/lib/framework.ts";
import { readServerConfig } from "../../src/server/config.ts";
import { configResponse, handleTurn, type ApiResponse } from "../../src/server/handler.ts";
import type { CounterStore } from "../../src/server/store.ts";
import { sources, skill } from "./bundled.ts";
import { TableStore, UnavailableStore } from "./table-store.ts";

const config = readServerConfig(process.env);
const fw = buildFramework(sources, { parseYaml, schemas: frameworkValidators });
const connection = process.env.AZURE_STORAGE_CONNECTION_STRING;
const store: CounterStore = connection
  ? TableStore.fromConnectionString(connection)
  : new UnavailableStore("AZURE_STORAGE_CONNECTION_STRING isn't set, so usage can't be counted.");
if (!connection) config.warnings.push("AZURE_STORAGE_CONNECTION_STRING is missing, so every turn is refused.");

let warned = false;
function warnOnce(context: InvocationContext): void {
  if (warned) return;
  warned = true;
  for (const w of config.warnings) context.warn(`intake-kit config: ${w}`);
}

function toHttp(res: ApiResponse): HttpResponseInit {
  return { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store", ...res.headers }, jsonBody: res.body };
}

app.http("turn", {
  route: "turn",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    warnOnce(context);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => {
      headers[name.toLowerCase()] = value;
    });
    const res = await handleTurn(
      { method: request.method, headers, body: await request.text() },
      { config, store, fw, skill, log: (message, data) => context.log(`intake-kit: ${message}`, data ?? {}) },
    );
    return toHttp(res);
  },
});

app.http("config", {
  route: "config",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    warnOnce(context);
    return toHttp(configResponse({ config }));
  },
});
