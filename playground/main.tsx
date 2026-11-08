/// <reference types="vite/client" />
import { StrictMode, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { findUnknownKeys, parseConfig, publicConfig, resolveJob, withQuery } from "../src/index.ts";
import { CharacterSheet, type LinkRendererProps } from "../src/CharacterSheet.tsx";
import "./playground.css";

// `npm run dev`: the panel straight from src/, with hot reload, on the
// configs in examples/. Not part of the package (package.json `files`
// leaves it out).
//
// The page acts like a host: everything it shows comes from the URL, as a
// host reads ?job=. The controls are query parameters too, so any state is
// a link (for a bug report or a browser test), and they ride along in
// basePath, whose query jobHref and actionHref keep.

const examples = import.meta.glob<unknown>("../examples/*.json", { eager: true, import: "default" });
const fixtures = Object.fromEntries(
  Object.entries(examples).map(([path, raw]) => [path.replace(/^.*\/(.+)\.json$/, "$1"), raw]),
);

// The controls' query parameters, with their defaults. A fixture's param
// action naming one of these would clash; none do.
const CONTROLS = {
  fixture: "full",
  theme: "document",
  labels: "narrow",
  sockets: "",
  toolbar: "",
  // Container width in rem; empty means as wide as the page allows (the
  // panel itself stops at 30rem). Below 26rem it switches to the narrow layout.
  width: "",
  // "dark": host tokens unlike the document theme's fallbacks, to show it
  // follows the host's --paper/--ink/--signal.
  tokens: "",
  // On: the whole config, as an editor sees it (drafts and hidden jobs).
  drafts: "",
} as const;
type Control = keyof typeof CONTROLS;

const DARK_TOKENS = {
  "--paper": "#16181c",
  "--paper-raised": "#1f2228",
  "--ink": "#e8e6e1",
  "--muted": "#a3a7ae",
  "--rule": "#3a3e46",
  "--rule-strong": "#5a5f69",
  "--signal": "#7fa7e0",
  "--signal-soft": "#26324a",
} as CSSProperties;

function useLocation() {
  const [href, setHref] = useState(() => location.pathname + location.search + location.hash);
  useEffect(() => {
    const onPop = () => setHref(location.pathname + location.search + location.hash);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  // Same-page navigation, as a host's router does it: new history entry,
  // no reload, then scroll to the hash if there is one.
  const navigate = (to: string, replace = false) => {
    history[replace ? "replaceState" : "pushState"](null, "", to);
    setHref(to);
    const hash = new URL(to, location.href).hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
  };
  return { href, navigate };
}

function App() {
  const { href, navigate } = useLocation();
  const [notice, setNotice] = useState<string | null>(null);
  const query = new URL(href, location.origin).searchParams;
  const control = (name: Control) => query.get(name) ?? CONTROLS[name];
  const setControl = (name: Control, value: string) =>
    navigate(withQuery(href, { [name]: value === CONTROLS[name] ? null : value }, location.hash.slice(1)), true);

  const fixtureName = Object.hasOwn(fixtures, control("fixture")) ? control("fixture") : CONTROLS.fixture;
  const raw = fixtures[fixtureName];
  const { config: parsed, errors } = parseConfig(raw);
  const unknownKeys = parsed && errors.length === 0 ? findUnknownKeys(raw, parsed) : [];

  // The controls that differ from their defaults, as the panel's basePath.
  const controlQuery = Object.fromEntries(
    (Object.keys(CONTROLS) as Control[])
      .filter((name) => query.has(name))
      .map((name) => [name, query.get(name)]),
  );
  const basePath = withQuery("/", controlQuery);

  const renderLink = ({ intent, href: to, ...props }: LinkRendererProps) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children come in through props
    <a
      {...props}
      href={to}
      onClick={(event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        // A site path is another page of the host; there's none here.
        if (intent === "page") setNotice(`A host would go to ${to}`);
        else {
          setNotice(null);
          navigate(to);
        }
      }}
    />
  );

  let panel: ReactNode;
  if (!parsed) {
    panel = <p className="pg-empty">This config has nothing to render.</p>;
  } else {
    const config = control("drafts") ? parsed : publicConfig(parsed);
    const job = resolveJob(config, query.get("job") ?? undefined);
    panel = (
      <>
        <CharacterSheet
          config={config}
          job={job}
          basePath={basePath}
          theme={control("theme") === "game" ? "game" : "document"}
          labels={control("labels") === "always" ? "always" : "narrow"}
          showSockets={Boolean(control("sockets"))}
          showToolbar={Boolean(control("toolbar"))}
          renderLink={renderLink}
          isParamActive={(name, value) => query.get(name) === value}
        />
        {job.sections && (
          <div className="pg-sections">
            {Object.entries(job.sections).map(([id, text]) => (
              <section key={id} id={id} className="pg-section">
                <h2>#{id}</h2>
                <p>{text}</p>
              </section>
            ))}
          </div>
        )}
      </>
    );
  }

  const width = control("width");
  const hostParams = [...query].filter(([name]) => !Object.hasOwn(CONTROLS, name) && name !== "job");

  return (
    <div className="pg">
      <form className="pg-controls" aria-label="Preview controls" onSubmit={(event) => event.preventDefault()}>
        <label>
          Fixture{" "}
          <select value={fixtureName} onChange={(event) => setControl("fixture", event.target.value)}>
            {Object.keys(fixtures).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Theme{" "}
          <select value={control("theme")} onChange={(event) => setControl("theme", event.target.value)}>
            <option>document</option>
            <option>game</option>
          </select>
        </label>
        <label>
          Labels{" "}
          <select value={control("labels")} onChange={(event) => setControl("labels", event.target.value)}>
            <option>narrow</option>
            <option>always</option>
          </select>
        </label>
        <Toggle name="sockets" label="Sockets" control={control} setControl={setControl} />
        <Toggle name="toolbar" label="Toolbar" control={control} setControl={setControl} />
        <Toggle name="tokens" label="Dark host tokens" on="dark" control={control} setControl={setControl} />
        <Toggle name="drafts" label="Drafts and hidden jobs" control={control} setControl={setControl} />
        <label>
          Width{" "}
          <input
            type="range"
            min="16"
            max="40"
            step="0.5"
            value={width || "40"}
            onChange={(event) => setControl("width", event.target.value === "40" ? "" : event.target.value)}
          />{" "}
          <output>{width ? `${width}rem` : "auto"}</output>
        </label>
      </form>

      {(errors.length > 0 || unknownKeys.length > 0) && (
        <div className="pg-report" role="status">
          <p>parseConfig reported:</p>
          <ul>
            {[...errors, ...unknownKeys.map((key) => `unknown key: ${key}`)].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="pg-status" role="status">
        {notice ?? (hostParams.length > 0 ? `Host parameters: ${new URLSearchParams(hostParams)}` : " ")}
      </p>

      <div
        className="pg-stage"
        data-tokens={control("tokens") || undefined}
        style={{ ...(control("tokens") === "dark" ? DARK_TOKENS : {}), width: width ? `${width}rem` : undefined }}
      >
        {panel}
      </div>
    </div>
  );
}

function Toggle({
  name,
  label,
  on = "1",
  control,
  setControl,
}: {
  name: Control;
  label: string;
  on?: string;
  control: (name: Control) => string;
  setControl: (name: Control, value: string) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={control(name) === on}
        onChange={(event) => setControl(name, event.target.checked ? on : "")}
      />{" "}
      {label}
    </label>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
