// Eidos UI mock AI v1 — the "agent server" every demo frontend talks to.
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
window.MockAI = (function () {
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
  ];

  function v1() {
    const session_id = "mock-" + Math.random().toString(36).slice(2, 8);
    let seq = 0, turnCount = 0, scriptIdx = 0;
    let timers = [], liveTurn = null, cb = null;

    function emit(ev, turn_id) {
      ev.session_id = session_id;
      ev.turn_id = turn_id;
      ev.seq = ++seq;
      if (ev.type === "done" || ev.type === "abort" || (ev.type === "error" && !ev.recoverable)) {
        if (turn_id === liveTurn) liveTurn = null;
      }
      cb && cb(ev);
    }

    return {
      send(userText, onEvent) {
        if (liveTurn !== null) return null; // one live turn per session
        cb = onEvent;
        turnCount += 1;
        const turn_id = turnCount;
        liveTurn = turn_id;
        const want = EXPECTED[scriptIdx % EXPECTED.length];
        let script;
        if (userText && norm(userText) && norm(userText) !== norm(want)) {
          // off-script: say so, teach the next line, don't burn a script
          script = [
            [300, { type: "turn_start" }],
            ...deltas('I\'m a scripted demo, so I only know my rehearsed lines. Try asking: "' + want + '"', 2, 95),
            [300, { type: "done", result: { turns: 1, latency_ms: 1500 } }],
          ];
        } else {
          script = TURN_SCRIPTS[scriptIdx % TURN_SCRIPTS.length]();
          scriptIdx += 1;
        }
        let at = 0;
        timers = [];
        for (const [delay, ev] of script) {
          at += delay;
          if (!ev.type) continue; // scripted beat, no event
          timers.push(setTimeout(() => emit(ev, turn_id), at));
        }
        return {
          stop: () => {
            if (liveTurn !== turn_id) return;
            timers.forEach(clearTimeout);
            emit({ type: "abort", reason: "user_stop" }, turn_id);
            // The hard part: the wire is not instantly silent. Late events for
            // the dead turn arrive AFTER abort; clients must drop them.
            setTimeout(() => { cb && cb({ session_id, turn_id, seq: ++seq, type: "text", mode: "delta", text: " the chat telos and…" }); }, 200);
            setTimeout(() => { cb && cb({ session_id, turn_id, seq: ++seq, type: "tool_use", tool_use_id: "t9", name: "edit", label: "ghost tool", input: {} }); }, 320);
          },
        };
      },
      get busy() { return liveTurn !== null; },
      // Instantly materialize the first N turns (no timers) so demos can skip
      // straight to their addition. Next send() continues the cycle.
      preroll(onEvent, turns = 1) {
        if (liveTurn !== null || turnCount > 0) return;
        cb = onEvent;
        for (let i = 0; i < turns; i++) {
          turnCount += 1;
          scriptIdx += 1;
          for (const [, ev] of TURN_SCRIPTS[i % TURN_SCRIPTS.length]()) {
            if (ev.type) emit(ev, turnCount);
          }
        }
      },
    };
  }

  return { v1 };
})();
