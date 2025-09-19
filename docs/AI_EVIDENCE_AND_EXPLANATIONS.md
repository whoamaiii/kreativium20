# AI Evidence-Grounded Explanations

Denne dokumentasjonen beskriver hvordan AI‑forklaringer i `Kreativium` skal genereres på en
datadrevet og sikker måte.

## Mål

- Alltid reflektere faktisk registrert data.
- Unngå å oppgi steder/årsaker som ikke finnes i data.
- Svar alltid på norsk (bokmål) i ren tekst (ingen Markdown/stjerner).
- Fra mikro → makro: konkrete eksempler, mønstre og trender.

## Komponenter

- `src/lib/evidence/evidenceBuilder.ts`
  - `computeAllowedContexts`: bygger lister over tillatte kontekster (steder, aktiviteter, triggere)
    basert på registrerte data.
  - `buildEvidenceForPattern`: plukker ut ferske, representative hendelser (med id/tid/intensitet)
    som kan siteres.
  - `sanitizePlainNorwegian`: fjerner Markdown/formatting og sensurerer forbudte kontekster
    (erstatter med «ikke logget sted»).
- `src/components/analytics-panels/PatternsPanel.tsx`
  - Samler evidence og allowed contexts.
  - Utvider prompten med «Regler» og «Tillatte kontekster».
  - Setter `system`-melding: norsk, ingen Markdown, handlingsorientert.
  - Etter mottak: saniterer svaret via `sanitizePlainNorwegian`.

## Flyt

1. Bruker klikker «Forklar mønster».
2. Panelet bygger evidence (`buildEvidenceForPattern`) og allowed contexts
   (`computeAllowedContexts`).
3. Prompt inkluderer:
   - Oppgavebeskrivelse og mønsterdata
   - Tillatte kontekster (steder/aktiviteter/triggere)
   - Eksempel‑hendelser med ID
   - Strenge regler: bruk kun tillatt kontekst; referer ved ID; ingen antakelser
4. LLM svarer i JSON (alltid norsk/ren tekst) via `chatJSON` med skjema:
   ```
   { summary: string,
     causes: { text: string, evidenceIds?: string[], confidence?: number }[],
     interventions: { text: string, evidenceIds?: string[] }[],
     examples: { id: string, whyRelevant?: string }[] }
   ```
   Svaret valideres (Zod). Deretter konverteres til ren tekst og saniteres før visning.

## Kvalitetsgjerder

- Manglende kontekst → LLM instrueres til å skrive «ikke logget» i stedet for å anta sted.
- Sanitering i etterkant fjerner o/uønskede tokens (f.eks. «klasserom/hjemme») når ikke i allowed
  set.
- Maks høyde på forklaring med scroll for å unngå klipping (`max-h-[60vh] overflow-auto`).

## Videre arbeid (anbefalt)

- JSON‑kontrakt via `chatJSON` og validator (evidens‑IDer per påstand).
- Delvise korrelasjoner og FDR‑korrigering i analytics.
- «Kilder»‑chip i UI som viser hvilke hendelser forklaringen bygger på.

## Språkregler (obligatorisk)

- Alltid norsk (bokmål).
- Ingen \*_, _, # eller kodeblokker.
- Korte setninger og bindestrek‑punkter når aktuelt.
