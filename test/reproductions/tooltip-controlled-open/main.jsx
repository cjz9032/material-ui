import * as React from "react";
import { createRoot } from "react-dom/client";
import Tooltip from "@mui/material/Tooltip";
import FixedTooltip from "tooltip-repro-fixed";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme();
const styles = `
*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#182b45;font:15px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px 24px}h1{font-size:28px}h2{font-size:19px}button,input,select{font:inherit}button{cursor:pointer;padding:12px 18px;border:1px solid #a8bad6;border-radius:8px;background:#ecf2ff;color:#21477d}button:focus-visible{outline:3px solid #2869bb;outline-offset:3px}.controls{display:flex;gap:24px;align-items:center;margin:22px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.panel{min-width:0;background:white;border:1px solid #d0d9e6;border-top:4px solid #ba633f;border-radius:10px;padding:24px}.panel.fixed{border-top-color:#23836b}.anchor-area{height:140px;position:relative;display:flex;align-items:center;justify-content:center}.pending{position:absolute;top:0;font-size:12px;color:#7c541b;pointer-events:none}.outside{padding:30px 15px;text-align:center;border:1px dashed #9baec7;border-radius:8px;background:#fafcff}.state{font-size:13px;background:#eef2f8;padding:10px;border-radius:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.8 monospace;min-height:180px;background:#152235;color:#dfebfc;padding:14px;border-radius:8px}details{margin-top:24px;background:white;padding:20px;border-radius:10px}summary{cursor:pointer;font-weight:600}@media(max-width:760px){.grid{grid-template-columns:1fr}.controls{flex-wrap:wrap}}
`;

function createGate() {
  let resolve;
  const gate = {
    blocked: true,
    promise: new Promise((r) => {
      resolve = r;
    }),
  };
  gate.release = () => {
    gate.blocked = false;
    resolve();
  };
  return gate;
}

const Anchor = React.forwardRef(function Anchor(
  { gate, simulate, ...props },
  ref,
) {
  // describeChild lets the harness identify an opening render. The transition
  // keeps the previously committed anchor visible while this render suspends.
  if (simulate && props["aria-describedby"] && gate.blocked) throw gate.promise;
  return (
    <button {...props} ref={ref}>
      Hover here, then move below
    </button>
  );
});

function Panel({ fixed, simulate }) {
  const kind = fixed ? "fixed" : "original";
  const Component = fixed ? FixedTooltip : Tooltip;
  const [open, setOpen] = React.useState(false);
  const [requested, setRequested] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [rows, setRows] = React.useState([]);
  const gate = React.useRef(null);
  if (!gate.current) gate.current = createGate();
  const started = React.useRef(false);
  const timer = React.useRef();
  const zero = React.useRef(performance.now());
  const log = (message) =>
    setRows((old) => [
      ...old,
      `${Math.round(performance.now() - zero.current)}ms  ${message}`,
    ]);

  React.useEffect(() => {
    function observe(event) {
      if (
        event.target instanceof Element &&
        event.target.closest(`[data-anchor="${kind}"]`)
      ) {
        log("native mouseout observed (capture; not intercepted)");
      }
    }
    document.addEventListener("mouseout", observe, true);
    return () => {
      document.removeEventListener("mouseout", observe, true);
      clearTimeout(timer.current);
      gate.current.release();
    };
  }, [kind]);

  return (
    <section className={`panel ${fixed ? "fixed" : ""}`}>
      <h2>{fixed ? "Patched MUI Tooltip" : "Official MUI Tooltip"}</h2>
      <p>
        {fixed
          ? "Same official component with the proposed library-only fix."
          : "Unmodified @mui/material 9.5.0."}
      </p>
      <div className="state">
        Owner requested open=
        <b data-testid={`${kind}-open`}>{String(requested)}</b>
      </div>
      <div className="anchor-area">
        {pending && (
          <span className="pending" data-testid={`${kind}-pending`}>
            Opening commit is pending; the original anchor stays visible.
          </span>
        )}
        <React.Suspense fallback={<span>Loading</span>}>
          <Component
            describeChild
            enterDelay={0}
            leaveDelay={0}
            open={open}
            title={
              fixed
                ? "Patched tooltip"
                : "Original tooltip: stuck after leaving"
            }
            slotProps={{ popper: { "data-testid": `${kind}-tooltip` } }}
            onOpen={() => {
              log("onOpen -> owner requests true");
              setRequested(true);
              if (simulate) startTransition(() => setOpen(true));
              else setOpen(true);
              if (simulate && !started.current) {
                started.current = true;
                timer.current = setTimeout(() => {
                  log("Opening render released");
                  gate.current.release();
                }, 1800);
              }
            }}
            onClose={() => {
              log("onClose -> owner requests false");
              setRequested(false);
              setOpen(false);
            }}
          >
            <Anchor
              gate={gate.current}
              simulate={simulate}
              data-anchor={kind}
              data-testid={`${kind}-anchor`}
              onMouseLeave={() => log("React onMouseLeave observed")}
            />
          </Component>
        </React.Suspense>
      </div>
      <div className="outside" data-testid={`${kind}-outside`}>
        Move the pointer here and wait 1.8 seconds.
        <br />
        Do not hover the anchor again.
      </div>
      <h3>Event log</h3>
      <pre data-testid={`${kind}-logs`}>
        {rows.join("\n") || "Waiting for hover..."}
      </pre>
    </section>
  );
}

function App() {
  const [simulate, setSimulate] = React.useState(true);
  const [epoch, setEpoch] = React.useState(0);
  return (
    <ThemeProvider theme={theme}>
      <style>{styles}</style>
      <main>
        <h1>Controlled Tooltip: leaving before the opening render commits</h1>
        <p>
          React 18.3.1 + official MUI 9.5.0. No application wrapper or business
          dependencies.
        </p>
        <ol>
          <li>Keep "Hold opening commit" enabled.</li>
          <li>
            Hover the original anchor, then immediately move into its dashed
            area. Wait 1.8 seconds.
          </li>
          <li>
            Repeat on the patched side. The original stays open; the patched
            version closes.
          </li>
        </ol>
        <div className="controls">
          <label>
            <input
              data-testid="simulate"
              type="checkbox"
              checked={simulate}
              onChange={(e) => {
                setSimulate(e.target.checked);
                setEpoch((n) => n + 1);
              }}
            />{" "}
            Hold opening commit
          </label>
          <button data-testid="reset" onClick={() => setEpoch((n) => n + 1)}>
            Reset both panels
          </button>
        </div>
        <div className="grid" key={epoch}>
          <Panel fixed={false} simulate={simulate} />
          <Panel fixed simulate={simulate} />
        </div>
        <details>
          <summary>What is simulated?</summary>
          <p>
            startTransition + Suspense holds an opening render before commit
            without hiding the existing anchor. It does not block JavaScript,
            suppress mouse events, or dispatch synthetic leave events. Remaining
            over the anchor must produce one onOpen, no mouseout, and a visible
            tooltip after release. Moving away before commit exposes the missing
            onClose notification.
          </p>
          <p>
            This is a deterministic concurrency reproduction, not a claim that
            all CPU stalls produce the same event ordering. The fixed copy
            changes only the pending-opening bookkeeping and the
            close-notification guard; official Tooltip.mjs remains untouched.
          </p>
        </details>
      </main>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
