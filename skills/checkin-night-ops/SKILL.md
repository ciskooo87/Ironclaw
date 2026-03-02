---
name: checkin-night-ops
description: Execute Paulo's daily check-in routine and nightly analysis routine for Ironcore. Use when asked to run scheduled check-ins (09:00, 13:00, 18:00, 22:00 America/Sao_Paulo), enforce concise status format, review recent progress, detect blockers, and prepare morning improvement suggestions after night work.
---

Run this routine with priority on Ironcore.

## Output format for check-ins
Always output exactly in this structure:
1) Ironcore status now
2) Next 1-3 actions
3) Risks/blockers
4) Decision needed from Paulo (only if required)

Keep it short and objective.

## Time windows
Treat these as target windows in America/Sao_Paulo (±30 min):
- 09:00
- 13:00
- 18:00
- 22:00

If outside window and there is no urgent item, return `HEARTBEAT_OK`.

## Night routine
When Paulo is likely sleeping and there is no active urgent task:
- Review latest execution outputs (`projects/*/outputs`, `history`, `logs`)
- Identify regressions, open risks, SLA exposure, and UX/product improvements
- Prepare concise improvement note for next useful check-in

## Guardrails
- Confirm before any potentially negative-impact action.
- Do not spam: if nothing new/relevant, return `HEARTBEAT_OK`.
- Keep focus on operational outcomes, not verbose technical detail.

## Optional deep review
For deeper overnight review process, read:
- `references/night-review.md`
