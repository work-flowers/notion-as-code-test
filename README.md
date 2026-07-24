# Notion as Code — test bed

Testing Notion's **Notion as Code** alpha by deploying a realistic client build:
the Knoxx Innovations R&D management & evidence system (three core databases +
ownership model + ATO audit views), into a **private sandbox teamspace** in the
primary workspace.

**Status: deployed 2026-07-24** to workspace `9607e18f-5d82-4842-8b96-ca0d32e66011`
→ private teamspace **KI R&D Sandbox** →
[R&D Hub](https://app.notion.com/p/3a791b0711ac817089bde6b19d97c3f2).
41 resources created (1 teamspace, 4 databases, 15 views, 16 pages) + 48 properties.

## Layout

```
scripts/               Notion as Code scripts (version-controlled here)
  knoxx-rnd-sandbox.ts   The Knoxx R&D build
  compile-check.ts       Dry-run validator (compiles to intents, no Notion call)
sessions/              Session-state files (resourceId → Notion ID mappings) — COMMIT THESE
  knoxx-rnd.sessionState.json   Live mappings for the deployed build
notion-sdk-js/         Local clone of makenotion/notion-sdk-js @ EXPERIMENTAL__notion-as-code (gitignored)
```

## Setup

```bash
git clone --branch EXPERIMENTAL__notion-as-code https://github.com/makenotion/notion-sdk-js.git
cd notion-sdk-js && npm install
```

Auth uses a **Personal Access Token** (not an integration bot token), attached
to the target workspace, stored in 1Password as
`op://Employee/notion-as-code-test/credential`.

## Dry run (no Notion call)

Compiles the script to intents and checks resourceId uniqueness:

```bash
cd notion-sdk-js && npx tsx ../scripts/compile-check.ts ../scripts/knoxx-rnd-sandbox.ts
```

## Deploy / re-deploy

The session-state file already exists (pre-seeded before the first run — see
workflow note below), so first deploys and re-deploys use the same command:

```bash
cd notion-sdk-js && NOTION_TOKEN="$(op read 'op://Employee/notion-as-code-test/credential' --account work-flowers)" npm run notion-as-code -- --spaceId=9607e18f-5d82-4842-8b96-ca0d32e66011 --scriptFilePath=../scripts/knoxx-rnd-sandbox.ts --sessionStateFilePath=../sessions/knoxx-rnd.sessionState.json
```

Mappings are written back to the same file after each run — commit the diff.

**Workflow note:** running without `--sessionStateFilePath` triggers a
`Continue? (y/N)` prompt that auto-cancels in non-TTY shells (the runner
returns `""` when stdin isn't a TTY). The workaround: pre-seed the session
file with just the workspace mapping (the documented shape) and always pass
`--sessionStateFilePath`. This also keeps mappings in this repo from run one.

For a **new build/workspace**, seed a new session file first:

```json
{
  "resourceIdToPointerMappings": {
    "<your-space-anchor-resource-id>": {
      "table": "space",
      "id": "<WORKSPACE_ID>",
      "spaceId": "<WORKSPACE_ID>"
    }
  },
  "resourceIdToPropertyIdMappings": {}
}
```

## Guardrails (testing in the primary workspace)

The alpha docs recommend a throwaway workspace; we're opted in only on the
primary workspace, so:

- The sandbox teamspace is `accessLevel: "private"` — invisible to other members.
- Scripts are **additive-only**: every resource is net-new, parented under the
  sandbox teamspace. No script may reference an existing Notion ID.
- The only mapped existing resource is the workspace itself, used solely as the
  teamspace parent (the API cannot delete, only create/update).
- Never hand-edit session-state files after the initial seed. Commit each
  generated one; diff after runs.
- Rate limit is 5 requests/min — one deploy is one request, so not a concern.

## Findings (feedback tracker candidates)

1. **🐛 Cross-data-source formula references are mis-bound.** A Formulas 2.0
   expression `prop("relation").map(current.prop("related-prop")).sum()` is
   accepted, and both property IDs resolve — but the rewriter binds the inner
   property token to the *current* data source's collection ID instead of the
   related one, so the formula silently evaluates to 0. Verified via
   `GET /v1/data_sources/{id}`: the rewritten expression carries the wrong
   collection ID on the inner `block_property` token. (Same-data-source formula
   references, e.g. Activities' `Eligible Hours`, work correctly.)
2. **No conditional rollups** — "sum of Hours where Grant Eligible = Yes" can't
   be expressed: rollups don't filter, and Notion as Code rollups can't target
   formula properties (`RollupTargetPropertyType` excludes `formula`). Combined
   with finding 1, a grant-hours-per-project number currently requires a manual
   UI formula. Workaround shipped: `Eligible Hours` formula on Activities + the
   filtered **ATO Activities** view (the audit-ready artifact).
3. **Non-TTY runs silently cancel** — the first-run confirmation prompt returns
   `""` when stdin isn't a TTY, so agent/CI runs abort. Workaround above.
4. **No relative-date view filters** — fixed `YYYY-MM-DD` only, so "Today's
   Activities" can't be built as specced; the hub uses a date-sorted Daily Log.
5. **Person property values can't be set by script** — columns exist, seed rows
   leave them empty. Teamspace membership also can't be configured.
6. **Auto-increment ID prefixes are workspace-global** — `KIP`/`KIA`/`KIK`/`KIC`
   must not collide with any existing database in the workspace.
7. **✨ Feature request: permissions-as-code.** No intent exists for teamspace
   membership/roles, database share levels, or locking (a `TeamspaceMember`
   type is declared in `types.ts` but nothing accepts it — likely roadmap).
   Scripts can't prevent UI-side schema edits, so every deploy target needs a
   manual permissioning pass (see runbook below). Declared schema + locked
   schema would make one-way push safe by construction — the natural complement
   to there being no pull/drift detection — and is what governance-heavy
   builds (e.g. an ATO evidence system) actually need. Also erodes the
   "same script, many workspaces" story until it exists.

Everything else deployed faithfully on the first run: two-way relations,
rollups (Total Hours = 18 on the seeded prawn project ✅), status/select
options with colors, auto-increment IDs (KIP-1…), filtered + sorted views,
calendar/timeline/board views, ephemeral views embedded as inline linked
databases on the hub page, column layouts, callouts, and child-page placement.

## Post-deploy manual steps (client runbook)

Notion as Code owns structure; these product-level controls must be applied
**by hand in the UI after every deploy to a new workspace** (none are
scriptable yet — see finding 7):

1. **Database share levels → "Can edit content"** on Projects, Activities,
   Knowledge, and Commercial Opportunities: members can add/edit rows (log
   activities) but cannot change properties, views, or structure. This is what
   enforces the ownership model structurally (e.g. bench staff log work but
   can't touch project stage columns).
2. **Lock each database** (⋯ menu → Lock database) and lock the hub/operating
   pages: guards against accidental edits; note any editor can unlock, so it's
   a guardrail, not a boundary.
3. **Teamspace roles**: owners = whoever maintains the script (plus the
   client-side admin); everyone else = member. Set teamspace permissions so
   members can't edit sidebar/sections.
4. **Convention**: any structural change requested UI-side gets back-ported
   into the script and re-deployed — the script is the source of truth for
   structure; the UI is the source of truth for data. There is no pull or
   drift detection (session state is only an ID ledger), so undeclared UI
   schema changes will drift silently and script-declared fields get
   overwritten on the next deploy.

## Open questions to test next

- Does a **re-deploy** with the session file update in place without duplicating?
- Do **manually added UI properties** (e.g. the fixed Grant-Eligible Hours
  formula) survive a re-deploy?
- Does **removing a property from the script** leave the live property alone?
