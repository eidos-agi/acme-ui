# Conventions — read before touching this repo

Eidos UI is a version ladder: each demo version fixes ONE named problem and
stays online forever. That only works if everyone (human or agent) respects
the same split:

## Frozen vs retroactive

**Frozen (never edit after a version ships):** the per-version `index.html` —
its inline `<style>` and `<script>` are the version's lesson. v0's raw tool
dumps and missing Stop button are not bugs; they are the exhibit. Fixing a
frozen file destroys the ladder's honesty. A fix belongs in the NEXT version.

**Retroactive (safe and encouraged to improve; applies to every version at
once):**
- `/brand.css` — the one token sheet. No page carries token copies.
- `/demos/reference-chat/_base.css` — shared demo chrome (layout, header,
  composer). Not message/tool styles: those are lessons.
- `/demos/reference-chat/_autoplay.js` — shell-play glue.
- `/demos/mock-ai/vN.js` — the agent. Bump a mock version only when a demo
  needs new server behavior; never change an existing mock's semantics.
- The shell (`/index.html`), `server.js`, and this file.

Rule of thumb: if changing it would alter what a shipped version *teaches*,
it is frozen. If it only changes how the site *looks or runs*, it is
retroactive.

## Adding a version

1. Copy the previous version's directory: `cp -r vN vN+1`.
2. Apply exactly one named fix (the rung). Update the header note and the
   lesson comment in the inline style/script.
3. Write `meta.json`: `title`, `desc`, `why`, `tags`, `auto` (true for chat
   demos that should self-play). Remove the rung from `planned.json` if it
   was there.
3b. Define `window.VIGNETTE` at the end of the page script: call
   `agent.preroll(onEvent)` to materialize the prior conversation instantly,
   then script ONLY this version's addition (a stop, an expand, a scroll).
   Viewers must see the new thing within seconds of the veil lifting.
   Vignettes are presentation glue — RETROACTIVE, safe to tune later.
4. Prove it: drive the live page (mafia or browser), assert the version's
   acceptance checks mechanically, screenshot to `~/eidos/proof/`.
5. Push, then `ssh hostkey 'git -C ~/eidos-ui pull'`. Restart `eidosui-api`
   only if `server.js` changed.

The server scans `demos/<family>/v<N>/` — a new directory appears on the site
with no page edits.

## Progressive improvement (the critic loop)

Nobody should have to narrate fixes one by one:

1. A critic agent plays each live version (send, stop mid-stream, expand
   tools, resize), screenshots, and scores it against the calm-legibility
   checklist in ui-patterns brief 01.
2. Its top finding becomes a PROPOSED rung appended to the family's
   `planned.json` (marked `"proposed": true`).
3. The founder curates the queue — reorder, veto, promote — instead of
   describing bugs.
4. A builder takes the top approved rung through "Adding a version" above.

Founder feedback, when it does arrive, is captured the same way: as a rung in
`planned.json`, never as an in-place patch to a shipped version.

## Cache busting

Cloudflare caches `.css`/`.js` by extension and the API token cannot purge.
Shared assets are therefore referenced with a version stamp
(`/brand.css?v=N`). When you change ANY retroactive shared file, bump the
stamp in every HTML reference (one sed) — the HTML itself is not edge-cached,
so the new URLs take effect on the next pull.

## Copy markdown

The shell's Copy markdown button assembles the full pack for an implementing
agent: the version's `index.html` plus `brand.css`, `_base.css`,
`_autoplay.js`, and the mock — so the pack stays self-contained even though
the pages are normalized. If you add a new shared file, add it to
`agentMarkdown()` in the shell.

## Style

- Icons: Lucide inline SVG, stroke 2, `currentColor`. Never emojis in chrome
  (see `demos/icons/v0/`).
- Copy: plain sentences. No "grown in public", no em-dash aphorisms.
- Brand: tokens only. If you are writing a hex color anywhere except
  `brand.css`, stop.

## Screenshot review

A screenshot is product evidence, not a beauty shot. Review the rendered state
for meaning as well as layout:

- Prove desktop and phone widths have no horizontal overflow or overlapping
  regions. Compare important bounding boxes; do not rely on a glance alone.
- Remove axes, ticks, and labels that turn into visual debris at a narrow
  breakpoint. Decoration does not earn immunity from responsive review.
- Translate implementation coordinates for people. Show “column 6 of 10,” not
  a zero-based `x5`; reserve raw values for an explicitly technical trace.
- Every computed metric names its unit and direction. “Board fit — higher is
  better” is legible; an unexplained negative “Evaluation” is not.
- Do not use error color merely because a valid score is negative.
- Capture a meaningful dynamic state, then exercise pause, resume, restart, and
  one failure state. A loaded shell is not proof that the interface works.
