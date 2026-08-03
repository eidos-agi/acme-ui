# Acme UI

**Live at [acme-ui.eidosagi.com](https://acme-ui.eidosagi.com).**

A public, work-in-progress gallery of UI demos for agent products — two families:

### 1. Agent chat (`demos/reference-chat/`)
Reference implementations of the interaction grain that makes watching an AI
agent work feel great — realtime, legible, calm. Informed, never overwhelmed.

- **Where demos come from:** self-contained briefs in
  [eidos-agi/ui-patterns](https://github.com/eidos-agi/ui-patterns)
  (`briefs/`), each with a scripted agent event stream and an acceptance
  checklist. A demo lands here only when its checklist passes on the running
  artifact.
- **Mock agent:** frontends talk to `demos/mock-ai/` (versioned: `v1.js`, …)
  that speaks chat-events v1.1 — envelopes, abort, late-token traps.

### 2. Product shell mocks (`demos/product-shell-mock/`)
**Interactive multi-surface chrome** — desktop window + phone bezel, shared
JS state, clickable IA. Use **before** Swift / RN when the question is “where
does this control live?” Technique: [`demos/product-shell-mock/TECHNIQUE.md`](demos/product-shell-mock/TECHNIQUE.md).

- **v0 live:** context **pill strip** chooser (You global · Contexts filter
  content). Dogfood origin: Knox Approve You + Contexts.
- No mock-ai server — pure static HTML + in-page data.

### Shared rules
- **Brand:** Acme is a deliberate placeholder. CSS custom properties in one
  `:root` block so real products re-skin by swapping tokens.
- **Layout:** each demo under `demos/<slug>/`, **grown in public** — `v0/`,
  `v1/`… stay online; each version fixes a named failure.

## Deploy

Static files, no build step. Served by Caddy on hostkey from a clone of this
repo; deploy = push to `main`, then `git pull` on the host.
