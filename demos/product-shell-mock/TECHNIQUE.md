# Technique: interactive product-shell HTML mocks

**Why this exists.** Before Swift / React Native / production CSS, ship a
**single static HTML file** that fakes the real app chrome on **desktop +
phone side by side**, with clickable state. Founders and agents can argue
about IA and navigation in minutes, not days.

Proven in Knox Approve (You + Contexts pills) → generalized here as Acme UI.

## When to use

| Use this | Don’t use this |
|----------|----------------|
| New nav spine, multi-surface IA | Final visual design system polish |
| “Where does this control live?” | Production accessibility audit |
| Context / workspace / tab choosers | Real data, real auth |
| Align Mac + iOS before coding twice | Replacing ui-patterns chat-event demos |

## Recipe (agent-friendly)

1. **One file, no build** — `index.html` with CSS + a tiny JS data model.
2. **Tokens in `:root`** — product can re-skin; Acme stays placeholder.
3. **Two frames** — desktop window + phone bezel on one page.
4. **Shared state** — one `selectedX` drives both surfaces so the rule is obvious.
5. **Fake data objects** — enough cards to feel density; no APIs.
6. **Chooser is first-class** — pills / strip / tabs that filter everything below.
7. **Label the rules** in a callout under the frames (ship checklist).
8. **Version ladder** — `v0/`, `v1/`… each version fixes one named IA failure.

## Anti-patterns

- Mock that only works at one breakpoint (forces “desktop-first” lies).
- Separate HTML files per surface that drift out of sync.
- Pretty pictures with no click handlers (IA can’t be felt).
- Inventing product SoT in the mock — call out real data source in the callout
  (e.g. “pills from Hostkey `contexts` registry”).

## Relation to other Acme demos

| Family | Grain |
|--------|--------|
| `reference-chat/` | Agent chat stream, tools, stop |
| **`product-shell-mock/`** | **App chrome, multi-surface IA, choosers** |

Both stay static and public. Chat demos talk to `mock-ai/`; shell mocks talk
only to in-page JS state.

## Provenance

- First dogfood: Knox Approve You + Contexts pill strip  
  (`knox-approve/docs/mocks/you-contexts-pills.html`)
- Captured as Acme pattern: this folder
