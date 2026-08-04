// Eidos UI mock AI v3 — everything v2 speaks, plus:
// - reasoning events: {type:"reasoning", mode:"delta", text} stream extended
//   thinking before the answer (script 6).
// - tool truth (script 7): two tools run in PARALLEL (results resolve out of
//   order), one input carries a secret marked by input_redacted, one result
//   is oversized behind content_full_ref (fetch the body via fetchRef), and
//   the done result carries cost for a receipt line.
// v1 and v2 stay frozen; load one mock per page.
// Speaks chat-events v1.1 shapes (envelope: session_id, turn_id, seq) over a
// callback. No network, fully scripted, but honest about the hard parts:
// stop() emits abort and then LATE EVENTS for the dead turn — clients are
// required to drop them (late-token suppression). Naive clients render them.
//
// API:
//   const agent = MockAI.v1();
//   const turn = agent.send(userText, (ev) => { ...render... });
//   turn.stop();   // abort the live turn (no-op if already terminal)
//
// Turn behaviors cycle: 1 happy path with tools · 2 long stream (stoppable)
// · 3 recoverable error mid-turn. New mock versions (v2: seq replay/resume,
// approvals) appear when a demo needs the new server behavior.
window.MockAI = window.MockAI || {};
window.MockAI.v3 = (function () {
  "use strict";

  function deltas(text, chunk, gap) {
    // split prose into word-ish deltas so clients get a real token stream
    const out = [];
    const words = text.split(/(?<= )/);
    for (let i = 0; i < words.length; i += chunk) {
      out.push([gap, { type: "text", mode: "delta", text: words.slice(i, i + chunk).join("") }]);
    }
    return out;
  }

  // The user prompt each scripted turn expects. Off-script input gets an
  // honest fallback instead of an unrelated rehearsed reply.
  const EXPECTED = [
    "Audit the repo's broken links and fix them",
    "Now rewrite every README",
    "Just fix the catalog opening",
    "Draft the release notes",
    "Clean up the old release branches",
    "Why did the tests get faster?",
    "Profile the test suite",
  ];
  const norm = (t) => (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

  // [delay_ms, event]... per turn behavior
  const TURN_SCRIPTS = [
    // 1 — happy path with two tools (from ui-patterns brief 01)
    () => [
      [300, { type: "turn_start" }],
      ...deltas("I'll scan the docs for broken links first.\n", 2, 95),
      [150, { type: "tool_use", tool_use_id: "t1", name: "bash", label: "Scan 139 markdown files for links", input: { cmd: "grep -r …" } }],
      [1800, { type: "tool_result", tool_use_id: "t1", status: "ok", metrics: { duration_ms: 1750 },
        content: "412 links found, 9 broken:\ndocs/emf/index.md → ../missing.md\npatterns/catalog.md → cross-cutting/design-not-here.md\ndocs/emf/claims/streaming.md → ../../schemas/old.json\nharvests/popular/INDEX.md → micro/chat/gone.md\npatterns/agentic-chat/README.md → micro/removed.md\nreference/VISUAL.md → ../uizze-notes.md\npatterns/CANONICAL.md → catalog-v2.md\nREADME.md → docs/emf/intents/dead.md\nAGENTS.md → TELOS-old.md" }],
      ...deltas("Found 9 broken links. Fixing them now — 7 are the same renamed folder.\n", 2, 95),
      [200, { type: "tool_use", tool_use_id: "t2", name: "edit", label: "Rewrite 9 links across 4 files", input: { files: 4 } }],
      [4200, { type: "tool_result", tool_use_id: "t2", status: "ok", metrics: { duration_ms: 4100 },
        content: "4 files changed, 9 links now resolve" }],
      ...deltas("Done — all 9 broken links fixed. 4 files touched; every link in the repo now resolves.", 2, 95),
      [300, { type: "done", result: { turns: 1, latency_ms: 9000 } }],
    ],
    // 2 — long uninterrupted stream: exists so Stop has something to interrupt
    () => [
      [350, { type: "turn_start" }],
      ...deltas(
        "Starting with the root README. Rewriting the opening to center on the chat telos: the current text frames agentic chat as one domain among many, which the charter supersedes. I'll restate the mission in two sentences, move the domain table below the fold, freeze the non-chat rows behind the metric, and then do the same pass on the catalog so both documents agree on what this repo is for. After that I'll sweep AGENTS.md for the same framing and add the pointer to TELOS.md so a cold session lands on the contract before it lands on the file tree.",
        2, 60),
      [400, { type: "done", result: { turns: 1, latency_ms: 14000 } }],
    ],
    // (script 4 is appended below: markdown-rich release notes)
    // 3 — recoverable error that keeps partial output
    () => [
      [350, { type: "turn_start" }],
      ...deltas("Rewriting patterns/catalog.md opening…\n", 2, 95),
      [900, { type: "error", code: "file_lock", recoverable: true, text: "catalog.md is locked by another process — retrying" }],
      [1600, {}], // beat while "retrying"
      ...deltas('Lock cleared. Opening now reads: "This repo exists to make agent-chat frontends excellent…"', 2, 95),
      [400, { type: "done", result: { turns: 1, latency_ms: 4100 } }],
    ],
    // 4 — markdown-rich stream: headings, bold, list, code, link, fence
    () => [
      [350, { type: "turn_start" }],
      ...deltas("# Release 0.8\n\nThis release focuses on **calm legibility** for agent chat.\n\n## Changes\n\n- `stop` now interrupts within one event\n- tool rows show *live elapsed time*\n- errors render as small notes — see [the ladder](https://ui.eidosagi.com/)\n\n```js\nagent.send(prompt, onEvent)\n```\n\nReady to publish.", 2, 105),
      [400, { type: "done", result: { turns: 1, latency_ms: 6000 } }],
    ],
    // 5 — approval-gated destructive tool: blocks until decide()
    () => [
      [350, { type: "turn_start" }],
      ...deltas("I found 12 merged release branches older than 90 days. Deleting them needs your sign-off.\n", 2, 95),
      [250, { type: "tool_use", tool_use_id: "t5", name: "bash",
        label: "Delete 12 merged release branches",
        input: { cmd: "git branch -D release/0.1 … release/0.12" },
        approval: "required", approval_id: "ap1", danger: "high" }],
      [0, { __await: "ap1",
        approved: [
          [900, { type: "tool_result", tool_use_id: "t5", status: "ok",
            metrics: { duration_ms: 850 }, content: "12 branches deleted" }],
          "DELTAS:Done — 12 stale branches removed. main and the active release lines are untouched.",
          [300, { type: "done", result: { turns: 1, latency_ms: 4000 } }],
        ],
        denied: [
          [250, { type: "tool_result", tool_use_id: "t5", status: "denied",
            metrics: { duration_ms: 10 }, content: "denied by user" }],
          "DELTAS:Understood — leaving all branches in place.",
          [300, { type: "done", result: { turns: 1, latency_ms: 2000 } }],
        ] }],
    ],
    // 6 — reasoning before the answer
    () => [
      [350, { type: "turn_start" }],
      ...rdeltas("The suite dropped from 41s to 32s after the config change. Two candidates: the YAML parse ran before every test file, and the cache warmup step was serialized. Removing the config file kills the parse entirely — that's roughly 40 files times 220ms, which matches the 9 seconds almost exactly. Cache warmup timing is unchanged in the logs, so that rules it out.", 2, 85),
      [400, {}],
      ...deltas("The tests got faster because removing the config file eliminated a 220ms YAML parse that ran before every one of the 40 test files — about 9 seconds total. Cache warmup was unchanged.", 2, 95),
      [350, { type: "done", result: { turns: 1, latency_ms: 11000, cost: 0.0031 } }],
    ],
    // 7 — tool truth: parallel, redacted, oversized, costed
    () => [
      [350, { type: "turn_start" }],
      ...deltas("Running the profiler and the coverage pass in parallel.\n", 2, 95),
      [200, { type: "tool_use", tool_use_id: "t7a", name: "bash", label: "Profile the test suite",
        input: { cmd: "pytest --profile", api_token: "sk-live-9f2a8c41d7e3b605" }, input_redacted: ["api_token"] }],
      [180, { type: "tool_use", tool_use_id: "t7b", name: "bash", label: "Coverage report",
        input: { cmd: "coverage run -m pytest && coverage report" } }],
      [2100, { type: "tool_result", tool_use_id: "t7b", status: "ok", metrics: { duration_ms: 2000 },
        content: "87% covered, 412 statements missed" }],
      [2600, { type: "tool_result", tool_use_id: "t7a", status: "ok", metrics: { duration_ms: 4650 },
        content: "hot path: markdown re-render 38% of runtime. Full trace attached.",
        content_full_ref: { ref: "trace-8812", bytes: 14520 } }],
      ...deltas("Coverage finished first at 87%. The profiler confirms the markdown re-render is the hot path — 38% of runtime. Full trace available on the tool row.", 2, 95),
      [350, { type: "done", result: { turns: 1, latency_ms: 9800, cost: 0.0058 } }],
    ],
  ];
  // reasoning deltas: same word-chunking, reasoning type
  function rdeltas(text, chunk, gap) {
    const out = [];
    const words = text.split(/(?<= )/);
    for (let i = 0; i < words.length; i += chunk) {
      out.push([gap, { type: "reasoning", mode: "delta", text: words.slice(i, i + chunk).join("") }]);
    }
    return out;
  }

  const FULL_TRACE = Array.from({ length: 220 }, (_, i) =>
    "trace " + String(i + 1).padStart(3, "0") + "  test_" +
    ["parse", "render", "stream", "approve", "replay"][i % 5] + "_" + (i % 40) +
    "  " + (12 + (i * 7) % 180) + "ms  ok").join("\n");

  // expand the DELTAS: shorthand used in approval branches
  function expandBranch(events) {
    const out = [];
    for (const e of events) {
      if (typeof e === "string" && e.startsWith("DELTAS:")) out.push(...deltas(e.slice(7), 2, 95));
      else out.push(e);
    }
    return out;
  }

  function v1() {
    const session_id = "mock-" + Math.random().toString(36).slice(2, 8);
    let seq = 0, turnCount = 0, scriptIdx = 0;
    let timers = [], liveTurn = null, cb = null, pendingApproval = null;
    const journal = [];   // every emitted event, in order — the resume log

    function emit(ev, turn_id) {
      ev.session_id = session_id;
      ev.turn_id = turn_id;
      ev.seq = ++seq;
      if (ev.type === "done" || ev.type === "abort" || (ev.type === "error" && !ev.recoverable)) {
        if (turn_id === liveTurn) liveTurn = null;
      }
      journal.push({ ...ev });
      cb && cb(ev);
    }

    return {
      send(userText, onEvent) {
        if (liveTurn !== null) return null; // one live turn per session
        cb = onEvent;
        turnCount += 1;
        const turn_id = turnCount;
        liveTurn = turn_id;
        const cycleIdx = scriptIdx % EXPECTED.length;
        const matchIdx = (userText && norm(userText))
          ? EXPECTED.findIndex((pr) => norm(pr) === norm(userText))
          : cycleIdx;
        let script;
        if (matchIdx === -1) {
          // off-script: say so, teach the next line, don't burn a script
          script = [
            [300, { type: "turn_start" }],
            ...deltas('I\'m a scripted demo, so I only know my rehearsed lines. Try asking: "' + EXPECTED[cycleIdx] + '"', 2, 95),
            [300, { type: "done", result: { turns: 1, latency_ms: 1500 } }],
          ];
        } else {
          // any known prompt plays its script, any number of times; the cycle
          // pointer only advances when you follow it in order
          script = TURN_SCRIPTS[matchIdx]();
          if (matchIdx === cycleIdx) scriptIdx += 1;
        }
        let at = 0;
        timers = [];
        pendingApproval = null;
        for (const [delay, ev] of script) {
          if (ev && ev.__await) {
            pendingApproval = { id: ev.__await, turn_id,
              approved: expandBranch(ev.approved), denied: expandBranch(ev.denied) };
            break; // nothing past the gate is scheduled until decide()
          }
          at += delay;
          if (!ev.type) continue; // scripted beat, no event
          timers.push(setTimeout(() => emit(ev, turn_id), at));
        }
        return {
          decide: (approval_id, approved) => {
            if (!pendingApproval || pendingApproval.id !== approval_id) return;
            if (liveTurn !== turn_id) return;
            const branch = approved ? pendingApproval.approved : pendingApproval.denied;
            pendingApproval = null;
            let t = 0;
            for (const [delay, ev] of branch) {
              t += delay;
              timers.push(setTimeout(() => emit(ev, turn_id), t));
            }
          },
          stop: () => {
            if (liveTurn !== turn_id) return;
            timers.forEach(clearTimeout);
            pendingApproval = null;
            emit({ type: "abort", reason: "user_stop" }, turn_id);
            // The hard part: the wire is not instantly silent. Late events for
            // the dead turn arrive AFTER abort; clients must drop them.
            setTimeout(() => { cb && cb({ session_id, turn_id, seq: ++seq, type: "text", mode: "delta", text: " the chat telos and…" }); }, 200);
            setTimeout(() => { cb && cb({ session_id, turn_id, seq: ++seq, type: "tool_use", tool_use_id: "t9", name: "edit", label: "ghost tool", input: {} }); }, 320);
          },
        };
      },
      get busy() { return liveTurn !== null; },
      get prompts() { return EXPECTED.slice(); },
      get nextPrompt() { return EXPECTED[scriptIdx % EXPECTED.length]; },
      // Resume: synchronously re-deliver every journaled event after last_seq.
      // This IS the spec's reconnect story — seq is the cursor.
      replay(last_seq, onEvent) {
        for (const ev of journal) if (ev.seq > last_seq) onEvent({ ...ev });
      },
      fetchRef(ref) {                 // lazy body behind content_full_ref
        return ref === "trace-8812" ? FULL_TRACE : null;
      },
      // Instantly materialize the first N turns (no timers) so demos can skip
      // straight to their addition. Next send() continues the cycle.
      preroll(onEvent, turns = 1) {
        if (liveTurn !== null || turnCount > 0) return;
        cb = onEvent;
        for (let i = 0; i < turns; i++) {
          turnCount += 1;
          scriptIdx += 1;
          for (const [, ev] of TURN_SCRIPTS[i % TURN_SCRIPTS.length]()) {
            if (ev && ev.__await) {           // preroll auto-approves gates
              for (const [, e2] of expandBranch(ev.approved)) if (e2.type) emit(e2, turnCount);
              continue;
            }
            if (ev.type) emit(ev, turnCount);
          }
        }
      },
    };
  }

  return v1;   // factory; assigned as MockAI.v3 below
})();
