import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchConfig, sendTurn, type AppConfig, type ProviderSettings } from "./api.ts";
import { Chat } from "./components/Chat.tsx";
import { Review } from "./components/Review.tsx";
import { Settings, loadProvider } from "./components/Settings.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { clearState, freshState, isComplete, loadState, nextSampleMessage, playSampleStep, saveState, type IntakeState } from "./state.ts";
import { getTurnstileToken } from "./turnstile.ts";

interface Notice {
  text: string;
  /** Show a link to the model settings, with this label. */
  settings?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [provider, setProvider] = useState<ProviderSettings>(() => loadProvider() ?? { kind: "kit" });
  const [state, setState] = useState<IntakeState>(() => loadState() ?? freshState("live"));
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const turnstileBox = useRef<HTMLDivElement>(null);
  const playing = useRef(false);

  useEffect(() => {
    fetchConfig().then(setConfig, () => setConfigError(true));
  }, []);
  useEffect(() => saveState(state), [state]);
  // ?sample opens straight into the sample intake: a shareable demo link.
  useEffect(() => {
    if (new URLSearchParams(location.search).has("sample")) void playSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = isComplete(state);

  const startOver = useCallback((mode: IntakeState["mode"] = "live") => {
    playing.current = false;
    clearState();
    setState(freshState(mode, provider.kind));
    setDraft("");
    setPending(null);
    setNotice(null);
  }, [provider.kind]);

  async function send(text: string) {
    if (state.mode === "sample") return;
    if (provider.kind === "kit" && config && !config.kitModel) {
      setNotice({ text: "The built-in model isn't available right now. Use your own API key, or watch the sample intake.", settings: "Use your own key" });
      return;
    }
    setBusy(true);
    setPending(text);
    setDraft("");
    setNotice(null);
    try {
      let turnstileToken: string | undefined;
      if (state.transcript.length === 0 && config?.turnstileSiteKey && turnstileBox.current) {
        turnstileToken = await getTurnstileToken(config.turnstileSiteKey, turnstileBox.current);
      }
      const transcript = [...state.transcript, { role: "user" as const, text, at: new Date().toISOString() }];
      const res = await sendTurn({ session: state.session, transcript, replies: state.replies, provider, turnstileToken });
      setState((s) => ({ ...s, session: res.session, transcript: res.transcript, replies: [...s.replies, res.reply] }));
      setPending(null);
    } catch (err) {
      setPending(null);
      setDraft(text); // give their words back so nothing is lost
      if (err instanceof ApiError) {
        const wait = err.retryAfterSeconds ? ` (about ${Math.ceil(err.retryAfterSeconds / 60)} min)` : "";
        const ownKeyHelps = err.suggestsOwnKey && config?.byok !== false && provider.kind === "kit";
        const keyProblem = provider.kind !== "kit" && (err.status === 502 || err.status === 400);
        setNotice({ text: err.message + wait, settings: ownKeyHelps ? "Use your own key" : keyProblem ? "Check your key settings" : undefined });
      } else {
        setNotice({ text: (err as Error).message || "Something went wrong. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function playSample() {
    if (playing.current) return;
    playing.current = true;
    let s = freshState("sample");
    setState(s);
    setNotice(null);
    for (let next = nextSampleMessage(s); next && playing.current; next = nextSampleMessage(s)) {
      setPending(next);
      await sleep(900);
      setBusy(true);
      await sleep(1100);
      if (!playing.current) break;
      s = playSampleStep(s);
      setPending(null);
      setBusy(false);
      setState(s);
      await sleep(1600);
    }
    setPending(null);
    setBusy(false);
    playing.current = false;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>intake-kit</h1>
            <p>From a vague request to a build-ready spec</p>
          </div>
        </div>
        <nav>
          {state.mode === "sample" ? <span className="badge">Sample</span> : null}
          <button onClick={() => setShowSettings(true)} disabled={state.mode === "sample"}>
            Model: {provider.kind === "kit" ? "built-in" : provider.kind === "azure" ? "your Azure" : "your Claude"}
          </button>
          {state.transcript.length ? <button onClick={() => startOver("live")}>New intake</button> : null}
          <a href="https://github.com/tjpinder/intake-kit" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      {configError ? <div className="notice">The server isn't reachable, so live interviews are off. The sample intake still works.</div> : null}
      {notice ? (
        <div className="notice" role="alert">
          {notice.text}
          {notice.settings ? <button className="link" onClick={() => setShowSettings(true)}>{notice.settings}</button> : null}
          <button className="link dismiss" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}

      <main className={complete ? "layout review-layout" : "layout"}>
        {complete ? (
          <Review session={state.session} onNewIntake={() => startOver("live")} />
        ) : (
          <Chat
            transcript={state.transcript}
            replies={state.replies}
            pending={pending}
            busy={busy}
            disabled={state.mode === "sample" || complete}
            disabledReason={state.mode === "sample" ? "This is the sample playing. Start a new intake to try your own." : "This intake is finished."}
            maxChars={config?.maxMessageChars ?? 4000}
            draft={draft}
            onDraft={setDraft}
            onSend={send}
            onSample={state.transcript.length === 0 && !busy ? playSample : null}
            needsKey={config && !config.kitModel && provider.kind === "kit" ? { onOpenSettings: () => setShowSettings(true) } : null}
          />
        )}
        <Sidebar session={state.session} />
      </main>

      <div ref={turnstileBox} className="turnstile" />
      {showSettings ? (
        <Settings
          config={config}
          current={provider}
          onClose={() => setShowSettings(false)}
          onSave={(p) => {
            setProvider(p);
            setShowSettings(false);
            setNotice(null);
          }}
        />
      ) : null}
    </div>
  );
}
