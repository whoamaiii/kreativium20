# Pattern Explanations: Dock + Mobile Sheet

This document describes how the pattern explanation UI works in the Analytics → Patterns tab,
replacing the previous hover popup approach.

## Rationale

- Hover popups with long text are awkward and are prone to stacking context issues (clipping under
  tabs).
- The new design uses a persistent right-side dock on large screens and a bottom sheet on small
  screens.
- Benefits: predictable layout, accessible focus flow, scrollable content, no z-index fragility.

## Components

- `src/components/analytics-panels/ExplanationContent.tsx`
  - Stateless renderer for explanation text with actions (Copy, Add to report).
- `src/components/analytics-panels/ExplanationDock.tsx`
  - Card wrapper for the content in a fixed-height, scrollable area.
- `src/components/analytics-panels/ExplanationSheet.tsx`
  - Mobile bottom sheet wrapper using the existing Sheet primitive.
- `src/components/analytics-panels/PatternsPanel.tsx`
  - Manages selection state and requests explanations, displays dock or sheet based on viewport.
  - Builds rich sources (SourceItem[]) and provides an S1..Sn mapping to the chat prompt.
  - Passes `sourcesRich` to Dock/Sheet for clickable kilder/detaljer.

## Behavior

- Clicking “Forklar mønster” sets the selected pattern, ensures an explanation is requested (and
  cached), and:
  - Desktop/tablet (min-width: 1024px): scrolls the dock into view and renders new content there.
  - Mobile: opens the bottom sheet with the content.
- Explanations are cached by `stableKeyFromPattern` via the existing `explanations` state in
  `PatternsPanel`.
- Copy/Report actions are provided in the content component; report integration can be wired later.

### Chat about this explanation

- The dock/sheet includes a chat section using `ExplanationChat`.
- Grounding: a system prompt is built from the current explanation text, allowed contexts, evidence
  IDs, and compacted data (recent entries, emotions, sensory inputs). The model is instructed to use
  only these facts and to refer to examples by ID.
- Nummererte henvisninger: Systemet sender en kort liste S1..Sn (kun etiketter og tidspunkter) og
  ber modellen henvise med [S#]. UI viser en «Henvisninger»-seksjon som kan klikkes.
- Privacy: inputs are compacted and trimmed; we avoid sending unnecessary free-form notes longer
  than needed.
- UX details:
  - Composer focuses after sending and after receiving the first reply.
  - Assistant messages render as readable bubbles with copy buttons.
  - Responses are sanitized to remove markdown markers (\*\*, \_\_, backticks) for clean text.
  - Guardrails: The AI is instructed to never reply only with “ukjent”. If info is missing, it first
    explains what is missing and suggests how to improve the question/context, then answers what it
    can from the provided data.

### Data sufficiency indicator

- Full-history retrieval and structured scanning

- The chat context builder scans the student’s full history, not only recent data. It aggregates:
  - Top places (from `environmentalData.location` and sensory `location`)
  - Top activities (from `environmentalData.classroom.activity`)
  - Top triggers (from `emotion.triggers`)
  - “Sosiale eksempler” gathered from evidence and by directly scanning tracking entries for
    social/day‑structure keywords (e.g., `morgenrutine`, `frokost`, `lunsj`, `middag`,
    `kveldsstell`, `ute`, `inne`, `hjemme`, `avlastning`, `gruppe`, `klasse`, `presentasjon`,
    `diskusjon`, `overgang`).
- Prompt highlights the overall timespan in days and still includes the latest subset for detailed
  context.

Implementation pointers:

- `src/components/analytics-panels/PatternsPanel.tsx` → `buildSystemPrompt()`
- `src/lib/evidence/evidenceBuilder.ts` → structured tracking pickup for evidence

- A lightweight heuristic estimates readiness to answer “social triggers” questions.
- Location: `src/lib/dataSufficiency.ts` → `evaluateSocialTriggerReadiness()`.
- Factors and thresholds (tunable):
  - Minimum entries: 25 (40% weight)
  - Minimum social examples (regex on notes/triggers): 5 (40% weight)
  - Minimum time span: 7 days (20% weight)
- The dock shows a small indicator with score and reasons; dev builds expose a button to seed
  additional social examples for demo/testing.

## Accessibility

- No reliance on hover; the trigger is a button.
- Updates use visible text; the dock/sheet can be focused when opened; consider announcing status in
  the global live region if desired.

## Removal of old approach

- We removed the long-text HoverCard explanation from `PatternsPanel`. Standard HoverCards elsewhere
  remain.
- z-index tokens (`.z-overlay`, `.z-overlay-elevated`) are kept for other overlays, but explanations
  now live in the dock/sheet.

## Layout notes

- `PatternsPanel` uses a responsive grid:
  - Desktop: `lg:grid-cols-[1fr_minmax(320px,420px)]` (left: list, right: dock).
  - Dock is `sticky top-4` and scrolls internally.
- Mobile sheet height: `70vh`.

## Future enhancements

- History of last N explanations with quick switching.
- “Add to report” deep link to the report builder.
- Port the same dock idea to Correlations/Insights if we introduce long-form helpers.

## Rich sources and citations (new)

- Rich sources model (`SourceItem`): id, timestamp, activity/place, note, emotions (med intensitet),
  sensorikk (type/response/intensitet), environment (valgfritt: lys/støy/temperatur/tid/antall
  elever/notes).
- «Kilder fra data» listes som klikkbare elementer; klikk åpner detaljer i en skuff med «Kopier som
  tekst».
- Svar kan inneholde [S1], [S2], [S3] osv.; UI viser en «Henvisninger»-seksjon der S1..Sn mappes til
  kildene og kan åpnes.
- Personvern: Interne ID-er vises ikke. Kun menneskevennlige etiketter (aktivitet/sted + tidspunkt)
  presenteres til brukeren.
