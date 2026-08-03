# Acme UI

**Live at [acme-ui.eidosagi.com](https://acme-ui.eidosagi.com).**

A public, work-in-progress gallery of agent-chat UI demos: reference
implementations of the interaction grain that makes watching an AI agent work
feel great — realtime, legible, calm. Informed, never overwhelmed.

- **Where demos come from:** self-contained briefs in
  [eidos-agi/ui-patterns](https://github.com/eidos-agi/ui-patterns)
  (`briefs/`), each with a scripted agent event stream and an acceptance
  checklist. A demo lands here only when its checklist passes on the running
  artifact.
- **Brand:** Acme is a deliberate placeholder. Every demo keeps its
  colors/type/spacing as CSS custom properties in one `:root` block so any
  real product re-skins by swapping tokens. Brand-neutral, never generic.
- **Layout:** `index.html` is the options landing page; each demo is a
  self-contained page under `demos/<slug>/`.

## Deploy

Static files, no build step. Served by Caddy on hostkey from a clone of this
repo; deploy = push to `main`, then `git pull` on the host.
