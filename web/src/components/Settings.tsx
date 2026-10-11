// Which model answers: the kit's own (free, capped) or the visitor's key. Keys stay in this
// browser tab only (sessionStorage) and are sent with each message; the server never stores them.

import { useState } from "react";
import type { AppConfig, ProviderSettings } from "../api.ts";

const KEY = "intake-kit:provider";

export function loadProvider(): ProviderSettings | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProviderSettings) : null;
  } catch {
    return null;
  }
}

function saveProvider(p: ProviderSettings): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* fine: settings last for this page view */
  }
}

export function Settings({ config, current, onSave, onClose }: { config: AppConfig | null; current: ProviderSettings; onSave: (p: ProviderSettings) => void; onClose: () => void }) {
  const [kind, setKind] = useState<ProviderSettings["kind"]>(current.kind);
  const [endpoint, setEndpoint] = useState(current.kind === "azure" ? current.endpoint : "");
  const [deployment, setDeployment] = useState(current.kind === "azure" ? current.deployment : "");
  const [azureKey, setAzureKey] = useState(current.kind === "azure" ? current.key : "");
  const [claudeKey, setClaudeKey] = useState(current.kind === "claude" ? current.key : "");
  const [model, setModel] = useState(current.kind === "claude" ? current.model : (config?.defaultClaudeModel ?? "claude-opus-5-5"));

  const valid = kind === "kit" ? !!config?.kitModel : kind === "azure" ? !!(endpoint && deployment && azureKey) : !!claudeKey;

  function save() {
    const p: ProviderSettings = kind === "kit" ? { kind } : kind === "azure" ? { kind, endpoint: endpoint.trim(), deployment: deployment.trim(), key: azureKey.trim() } : { kind, key: claudeKey.trim(), model };
    saveProvider(p);
    onSave(p);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="settings-title">Model</h2>
        <fieldset>
          <legend className="sr-only">Which model answers</legend>
          <label className={!config?.kitModel ? "disabled" : ""}>
            <input type="radio" name="provider" checked={kind === "kit"} disabled={!config?.kitModel} onChange={() => setKind("kit")} />
            <span><strong>Built-in</strong> {config?.kitModel ? `(${config.kitModel}, free, with limits)` : "(unavailable right now)"}</span>
          </label>
          {config?.byok !== false ? (
            <>
              <label>
                <input type="radio" name="provider" checked={kind === "azure"} onChange={() => setKind("azure")} />
                <span><strong>Your Azure OpenAI</strong></span>
              </label>
              <label>
                <input type="radio" name="provider" checked={kind === "claude"} onChange={() => setKind("claude")} />
                <span><strong>Your Claude API key</strong></span>
              </label>
            </>
          ) : null}
        </fieldset>

        {kind === "azure" ? (
          <div className="fields">
            <label>Endpoint<input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-resource.openai.azure.com" autoComplete="off" /></label>
            <label>Deployment name<input value={deployment} onChange={(e) => setDeployment(e.target.value)} autoComplete="off" /></label>
            <label>Key<input type="password" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} autoComplete="off" /></label>
            <p className="muted">The deployment needs a model that supports structured outputs, such as gpt-4.1 or gpt-4.1-mini.</p>
          </div>
        ) : null}
        {kind === "claude" ? (
          <div className="fields">
            <label>API key<input type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} placeholder="sk-ant-..." autoComplete="off" /></label>
            <label>Model
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {(config?.claudeModels ?? ["claude-opus-5-5"]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
        ) : null}

        {kind !== "kit" ? <p className="muted">Your key stays in this browser tab and is sent with each message. The server passes it to the provider and never stores or logs it.</p> : null}

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!valid} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
