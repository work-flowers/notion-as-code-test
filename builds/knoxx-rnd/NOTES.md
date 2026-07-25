# knoxx-rnd — Knoxx Innovations R&D management & evidence system

Three core databases (Projects, Activities, Knowledge) plus a Commercial
Opportunities stub, an ownership model, and audit-ready views for the ATO R&D Tax
Incentive claim.

**Deployed 2026-07-24** → private teamspace **KI R&D Sandbox** →
[R&D Hub](https://app.notion.com/p/3a791b0711ac817089bde6b19d97c3f2).
41 resources (1 teamspace, 4 databases, 15 views, 16 pages) + 48 properties.

Run it: `npm run build -- knoxx-rnd`

## Adaptations from the source spec

- **Grant-Eligible Hours rollup on Projects** — rollups can't filter and can't
  target formula properties (finding 2). Shipped instead: an `Eligible Hours`
  formula on Activities plus the filtered **ATO Activities** view, which is the
  audit-ready artifact.
- **Today's Activities view** — no relative-date filters (finding 4), so the
  dashboard uses a date-sorted Daily Log.
- **Person values** (Owner / Person / Captured by) exist as columns but seed rows
  leave them empty (finding 5).
- **Grant-Eligible Hours formula on Projects** is still declared in the script
  and is expected to evaluate to 0 (finding 1). If it gets fixed by hand in the
  UI, **delete that property block from the script first**, or the next deploy
  overwrites the fix with the broken expression.

## Post-deploy manual steps (client runbook)

Notion as Code owns structure; these product-level controls must be applied by
hand in the UI after every deploy to a new workspace — none are scriptable
(findings 7 and 9):

1. **Database share levels → "Can edit content"** on Projects, Activities,
   Knowledge and Commercial Opportunities: members can add and edit rows (log
   activities) but cannot change properties, views or structure. This is what
   enforces the ownership model structurally — bench staff log work but can't
   touch project stage columns.
2. **Lock each database** (⋯ → Lock database) and lock the hub and operating
   pages. Any editor can unlock, so it's a guardrail, not a boundary.
3. **Teamspace roles**: owners = whoever maintains the script plus the
   client-side admin; everyone else = member, with sidebar/section editing off.
4. **Back-port UI changes.** Any structural change requested in the UI gets
   written into the script and re-deployed — see the drift note in
   [GUARDRAILS.md](../../docs/GUARDRAILS.md).
