# crm — work.flowers CRM

The live [CRM](https://app.notion.com/p/work-flowers/CRM-21991b0711ac811dad9cf4a7103368f8)
expressed as code: **Core CRM Objects** (Contacts / Companies / Deals in one
multi-data-source database, as in production), **Meeting Notes**, **Emails**, the
views, a hub page with the linked-database dashboards, and 26 fictional sample
records wired through the relations.

Out of scope by design: Project Proposals, SOWs & Project Addenda, Sales
Invoices — and every relation to a database outside that scope.

Compiles to 48 intents (1 teamspace, 7 databases, 11 view tabs, 29 pages), 179
resourceIds. Type-checks clean under `strict`.

Run it: `npm run build -- crm`

## Where it deviates from production

The full list lives in the header of [build.ts](build.ts), each item tied to a
numbered finding in [FINDINGS.md](../../docs/FINDINGS.md). The short version:
no charts or dashboards (8), no buttons or automations (9), no `place` type (10),
no number formats (11), no `is_empty` filter (12), some rollups unbuildable
(13), no tabs block (14), date-only date values (15), empty person values (5).

## Source of truth for the model

`source/schema.txt` and `source/views.txt` are the extracted production schema
and view configuration this build was modelled from. Regenerate with:

```bash
npm run pull -- --database=31a91b0711ac801fa4abec043bc3172f --out=builds/crm/source
```

(That covers Core CRM Objects. Meeting Notes is `1984d37f6b4081e6a46bfe5fdd6e44d9`,
Emails is `39191b0711ac80c7bfeadc70bf273da8`.)

## Probe results (deploys #1 and #2, 2026-07-25)

Deployed to private teamspace **CRM Sandbox** →
[CRM hub](https://app.notion.com/p/3a891b0711ac81008c08f898ab8f39cf).
63 resources + 117 properties. Detail for each item is in
[FINDINGS.md](../../docs/FINDINGS.md) 17–19.

| Probe | Result |
| --- | --- |
| Multi-data-source database (3 data sources in one) | ✅ works |
| Views-only linked databases, multiple tabs each | ✅ works (2 / 3 / 2 / 2 tabs) |
| Self-referencing dual relation (Duplicate of ↔ Duplicated by) | ✅ works |
| Forward page reference in a relation value | ✅ works |
| `me` person filters (My Meetings / My Emails) | ⚠️ unverifiable via API — check in the UI |
| Multiple filters on one view | ❌ rejected: one filter per property per view (17) |
| Board `columns` group hiding | ❌ accepted but no effect — board shows all columns |
| Cross-data-source formulas (finding 1) | ❌ reproduces on `map`/`sort`/`last` too |
| Same-data-source formulas | ✅ Meeting Status, Expected Value = 33 600, URL builders |
| Dual-relation value writes | ⚠️ Deals → Company landed one-sided (19) |
| Re-deploy idempotency | ✅ resources — ❌ **wipes dual-relation values** (18) |

**Current state of the sandbox: structure is complete and correct, but the
sample rows are disconnected** — deploy #2 cleared every dual-relation value
(finding 18). Re-running `npm run build -- crm` will not restore them; it writes
the same empty values. Restoring the links is a data-level fix (API page
updates, or by hand in the UI), and any later re-deploy will clear them again
until finding 18 is fixed. `source/post-redeploy-relation-state.json` records
the wiped state as evidence.

## Post-deploy manual steps

1. Format `Probability` as a percent and `Value` with thousands separators
   (finding 11).
2. Rebuild the 7 charts and the Contact Dashboard by hand if the sandbox needs
   them (finding 8).
3. Re-pick the cross-data-source formulas in the UI if they landed broken —
   and **delete those property blocks from the script first**, or the next
   deploy overwrites the fix (finding 1).
4. Buttons and database automations cannot be scripted at all (finding 9); the
   sandbox has none.
