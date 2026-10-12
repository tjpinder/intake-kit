// Vite config for the web app. In dev it also serves /api/* from the real handler
// (src/server/handler.ts) with in-memory counters, so the UI runs locally with no deploy:
// put AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in the repo's .env.local to use the kit's
// model; without them the built-in model reports unavailable and the offline sample still works.

import { readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { parse as parseYaml } from "yaml";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { readServerConfig } from "../src/server/config.ts";
import { configResponse, handleTurn } from "../src/server/handler.ts";
import { MemoryStore } from "../src/server/store.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => ok(body));
    req.on("error", fail);
  });
}

function devApi(env: Record<string, string>): Plugin {
  return {
    name: "intake-kit-dev-api",
    apply: "serve",
    configureServer(server) {
      const config = readServerConfig({ IP_HASH_SALT: "local-development-salt", TURNSTILE_SECRET_KEY: "", ...env });
      const deps = {
        config,
        store: new MemoryStore(),
        fw: loadFramework(repoRoot),
        skill: readFileSync(resolve(repoRoot, "skills/intake/SKILL.md"), "utf8"),
        log: (message: string, data?: Record<string, unknown>) => server.config.logger.info(`[api] ${message} ${data ? JSON.stringify(data) : ""}`),
      };
      for (const w of config.warnings) server.config.logger.warn(`[api] ${w}`);
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/turn" && path !== "/api/config") return next();
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers[k] = v;
        headers["x-forwarded-for"] ??= req.socket.remoteAddress ?? "127.0.0.1";
        const result = path === "/api/config" ? configResponse(deps) : await handleTurn({ method: req.method ?? "GET", headers, body: await readBody(req) }, deps);
        res.statusCode = result.status;
        res.setHeader("content-type", "application/json");
        for (const [k, v] of Object.entries(result.headers ?? {})) res.setHeader(k, v);
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

/** `import x from "file.yaml?parsed"` gives the parsed value, so the YAML parser stays out of the bundle. */
function parsedYaml(): Plugin {
  return {
    name: "intake-kit:parsed-yaml",
    enforce: "pre",
    load(id) {
      if (!id.endsWith(".yaml?parsed")) return null;
      const file = id.slice(0, -"?parsed".length);
      this.addWatchFile(file);
      return `export default ${JSON.stringify(parseYaml(readFileSync(file, "utf8")))};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: resolve(repoRoot, "web"),
  plugins: [parsedYaml(), react(), devApi(loadEnv(mode, repoRoot, ""))],
  server: { fs: { allow: [repoRoot] } },
  build: { outDir: resolve(repoRoot, "web/dist"), emptyOutDir: true },
}));
