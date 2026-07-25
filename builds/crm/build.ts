/**
 * work.flowers CRM — sandbox rebuild (Notion as Code)
 *
 * Models the live work.flowers CRM
 * (https://app.notion.com/p/work-flowers/CRM-21991b0711ac811dad9cf4a7103368f8)
 * as a declarative script, scoped to:
 *   - the core CRM objects: Contacts, Companies, Deals (one multi-data-source
 *     database, exactly like production: "Core CRM Objects")
 *   - Meeting Notes and Emails
 *   - the views, including the CRM hub page's linked-database dashboards
 * and populated with fictional sample records.
 *
 * Deliberately OUT of scope (per request): Project Proposals, SOWs & Project
 * Addenda, Sales Invoices.
 *
 * SAFETY: every resource here is net-new and parented under a private sandbox
 * teamspace. The only mapped existing resource is the workspace itself
 * ("crm-sandbox-space", bound via --spaceId), used purely as the teamspace
 * parent. Nothing references an existing Notion ID, so nothing in the live
 * CRM can be touched.
 *
 * ---------------------------------------------------------------------------
 * Adaptations from production (what the alpha cannot express)
 * Each item cites its numbered finding in ../../docs/FINDINGS.md.
 * ---------------------------------------------------------------------------
 * - Charts and dashboards (finding 8): production has 7 chart views (Deal Value
 *   by Stage/Owner, Open Deals by Stage/Owner, Contacts Created, Contacts by
 *   Source/Owner) and a "Contact Dashboard". `ViewType` is table | board |
 *   calendar | list | gallery | feed | timeline only, so all are omitted.
 * - Buttons and automations (finding 9): production's write path — Register
 *   Lead, Create Xero Contact, Create Slack Channel, Create Google Drive
 *   Folder, Enrich, Add to Mailing List, Create Harvest Project — has no
 *   representation in the DSL, and neither do database automations. Omitted.
 * - `place` (finding 10): Companies → Address is modelled as text. Emails →
 *   Attachments exists as a file property but values need an upload, so it
 *   ships empty.
 * - Number formats (finding 11): Deals → Value (number_with_commas) and
 *   Probability (percent) aren't expressible. Probability stores 0–1 and renders
 *   as a plain decimal until formatted by hand; `Expected Value` math is right.
 * - View filters (findings 4 and 12): no `is_empty`, no relative dates. So
 *   production's "Deal Pipeline" (Actual Close is empty) is approximated with
 *   three `status_is_not` filters — which doubles as a probe of whether multiple
 *   filters AND together — and "Today" / "Today's Meetings" become
 *   Date-ascending lists. Person filters DO support the `me` variable, so
 *   "My Meetings" and "My Emails" are faithful.
 * - Rollups (findings 2 and 13): can't target formula or unique_id properties,
 *   so Deals → Slack Channel / Google Drive Folder / Company ID and Companies →
 *   Last Contacted are omitted.
 * - Tabs (finding 14): production's left column is a tabs block (Quick Actions
 *   / Databases); there is no markdown tag, so the hub uses callouts + columns.
 * - Date values (finding 15): `notion.date()` carries only start_date/end_date
 *   — no time, no timezone — so production's timed meeting and email stamps
 *   become plain dates. The Meeting `Status` formula still resolves correctly
 *   (dateEnd of a date-only value is that date's midnight).
 * - Person values (finding 5): Owner, Internal Attendees, Internal Recipients
 *   and Comment Access exist as columns but sample rows leave them empty.
 * - Auto-increment prefixes (finding 6) are workspace-global; production owns
 *   COM and DEAL, so this build claims CRMC and CRMD.
 * - Cross-data-source formulas (finding 1) are included as PROBES only.
 *   Contacts → "Latest Meeting" / "Latest Email" reproduce production formulas
 *   that walk a relation into another data source, and are expected to deploy
 *   but evaluate empty because the rewriter binds the inner property to the
 *   wrong collection. Same-data-source formulas (Expected Value, Slack Channel,
 *   Google Drive Folder, Meeting Status) should work.
 * - Peripheral production plumbing left out to keep the model legible: Zapier
 *   partner fields (Account Owner + its 3 rollups, Lead Status, Referral Lead
 *   Id), and every relation to a database outside this scope (Projects, Tasks,
 *   Time Entries, Invoices, Legal Agreements, Memories, Docs, Readwise
 *   Highlights, Google Drive Files, Customer Reviews, Event attendees, Deal
 *   Currency — and with it Deals → Value (SGD) / FX Rate).
 */

// Anchors the script to the workspace passed with --spaceId. Used only as the
// parent for the sandbox teamspace; the workspace itself is not modified.
const spaceParent = {
  type: "resourceId",
  resourceId: "crm-sandbox-space",
} as const

// ---------------------------------------------------------------------------
// Sandbox teamspace (private: invisible to other workspace members)
// ---------------------------------------------------------------------------

const crmTeamspace = notion.teamspace({
  resourceId: "crm-teamspace",
  parent: spaceParent,
  name: "CRM Sandbox",
  accessLevel: "private",
  icon: { type: "notion_icon", description: "address book", color: "orange" },
  description:
    "Sandbox rebuild of the work.flowers CRM — core objects, meetings, emails and views (Notion as Code test).",
})

// ---------------------------------------------------------------------------
// Database 1 · Core CRM Objects — ONE database, THREE data sources
// (Contacts / Companies / Deals), mirroring production.
// ---------------------------------------------------------------------------

const coreDb = crmTeamspace.addDatabase({
  resourceId: "core-db",
  name: "Core CRM Objects",
  icon: { type: "notion_icon", description: "database", color: "orange" },
  description: "Contacts, Companies, and Deals",
  dataSources: [
    // -------------------------------------------------------------- Contacts
    {
      resourceId: "contacts-ds",
      name: "Contacts",
      icon: { type: "notion_icon", description: "user circle", color: "orange" },
      properties: [
        { resourceId: "ct-name", name: "Name", type: "title" },
        { resourceId: "ct-first-name", name: "First Name", type: "text" },
        { resourceId: "ct-last-name", name: "Last Name", type: "text" },
        { resourceId: "ct-primary-email", name: "Primary Email", type: "email" },
        {
          resourceId: "ct-secondary-email",
          name: "Secondary Email",
          type: "multi_select",
          options: [
            { name: "priya.raman@gmail.com", color: "yellow" },
            { name: "d.shah@brightanvil.studio", color: "purple" },
            { name: "grace.okonjo@outlook.com", color: "blue" },
          ],
        },
        {
          resourceId: "ct-primary-phone",
          name: "Primary Phone",
          type: "phone_number",
        },
        { resourceId: "ct-job-title", name: "Job Title", type: "text" },
        { resourceId: "ct-linkedin", name: "Linkedin", type: "url" },
        { resourceId: "ct-owner", name: "Owner", type: "person", limit: 1 },
        {
          resourceId: "ct-lead-source",
          name: "Lead Source",
          type: "select",
          options: [
            { name: "Contact Us", color: "pink" },
            { name: "Event", color: "red" },
            { name: "Existing Network", color: "purple" },
            { name: "LinkedIn", color: "blue" },
            { name: "Newsletter Sign-up", color: "yellow" },
            { name: "Notion Partner Directory", color: "default" },
            { name: "Notion Setup Session", color: "green" },
            { name: "Vendor", color: "gray" },
            { name: "Zapier Partner Directory", color: "brown" },
          ],
        },
        { resourceId: "ct-location", name: "Location", type: "text" },
        // Production carries 383 City / 64 Country options (enriched from
        // LinkedIn). Sample set only.
        {
          resourceId: "ct-city",
          name: "City",
          type: "select",
          options: [
            { name: "Singapore", color: "red" },
            { name: "Melbourne", color: "gray" },
            { name: "London", color: "brown" },
            { name: "New York", color: "blue" },
            { name: "Minneapolis", color: "pink" },
          ],
        },
        {
          resourceId: "ct-country",
          name: "Country",
          type: "select",
          options: [
            { name: "Singapore", color: "red" },
            { name: "Australia", color: "yellow" },
            { name: "United Kingdom", color: "brown" },
            { name: "United States", color: "blue" },
          ],
        },
        { resourceId: "ct-bio", name: "Bio", type: "text" },
        { resourceId: "ct-note", name: "Note", type: "text" },
        // Relations out to the rest of the CRM
        {
          resourceId: "ct-company-rel",
          name: "Related Company",
          type: "relation",
          targetDataSourceResourceId: "companies-ds",
          targetDataSourcePropertyResourceId: "co-contacts-rel",
          limit: 1,
        },
        {
          resourceId: "ct-deals-rel",
          name: "Deals",
          type: "relation",
          targetDataSourceResourceId: "deals-ds",
          targetDataSourcePropertyResourceId: "dl-contact-rel",
        },
        {
          resourceId: "ct-deals-referred-rel",
          name: "Deals Referred",
          type: "relation",
          targetDataSourceResourceId: "deals-ds",
          targetDataSourcePropertyResourceId: "dl-referred-by-rel",
        },
        {
          resourceId: "ct-meetings-rel",
          name: "Meeting Notes",
          type: "relation",
          targetDataSourceResourceId: "meetings-ds",
          targetDataSourcePropertyResourceId: "mt-contacts-rel",
        },
        {
          resourceId: "ct-emails-rel",
          name: "📥 Emails",
          type: "relation",
          targetDataSourceResourceId: "emails-ds",
          targetDataSourcePropertyResourceId: "em-contacts-rel",
        },
        // Self-referencing dual relation — production's dedupe pair.
        {
          resourceId: "ct-dup-of-rel",
          name: "Duplicate of",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-dup-by-rel",
          limit: 1,
        },
        {
          resourceId: "ct-dup-by-rel",
          name: "Duplicated by",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-dup-of-rel",
        },
        {
          resourceId: "ct-company-rollup",
          name: "Company",
          type: "rollup",
          relationPropertyResourceId: "ct-company-rel",
          targetPropertyResourceId: "co-name",
          targetPropertyType: "title",
          aggregation: "show_unique",
        },
        {
          resourceId: "ct-domain-rollup",
          name: "Domain",
          type: "rollup",
          relationPropertyResourceId: "ct-company-rel",
          targetPropertyResourceId: "co-website",
          targetPropertyType: "url",
          aggregation: "show_unique",
        },
        // PROBE (expected broken — finding 1): cross-data-source
        // formula. Walks the Meeting Notes / Emails relations into another
        // data source, which the rewriter currently mis-binds.
        {
          resourceId: "ct-latest-meeting",
          name: "Latest Meeting",
          type: "formula",
          expression:
            'prop("ct-meetings-rel").map(current.prop("mt-date")).filter(not empty(current)).sort().last()',
        },
        {
          resourceId: "ct-latest-email",
          name: "Latest Email",
          type: "formula",
          expression:
            'prop("ct-emails-rel").map(current.prop("em-date-received")).filter(not empty(current)).sort().last()',
        },
        { resourceId: "ct-first-contacted", name: "First Contacted", type: "date" },
        { resourceId: "ct-last-enriched", name: "Last Enriched", type: "date" },
        { resourceId: "ct-mailing-list", name: "Mailing List", type: "checkbox" },
        { resourceId: "ct-subscribed-on", name: "Subscribed on", type: "date" },
        { resourceId: "ct-unsubscribed-on", name: "Unsubscribed on", type: "date" },
        {
          resourceId: "ct-comment-access",
          name: "Comment Access",
          type: "person",
        },
        { resourceId: "ct-created-time", name: "Created time", type: "created_time" },
        { resourceId: "ct-created-by", name: "Created by", type: "created_by" },
      ],
    },
    // ------------------------------------------------------------- Companies
    {
      resourceId: "companies-ds",
      name: "Companies",
      icon: { type: "notion_icon", description: "building", color: "orange" },
      properties: [
        { resourceId: "co-name", name: "Company Name", type: "title" },
        {
          resourceId: "co-id",
          name: "ID",
          type: "auto_increment_id",
          prefix: "CRMC",
        },
        { resourceId: "co-description", name: "Description", type: "text" },
        { resourceId: "co-website", name: "Website", type: "url" },
        {
          resourceId: "co-industry",
          name: "Industry",
          type: "select",
          options: [
            { name: "Automation Agency", color: "green" },
            { name: "E-commerce", color: "pink" },
            { name: "Education", color: "yellow" },
            { name: "Energy", color: "red" },
            { name: "Finance", color: "purple" },
            { name: "Healthcare", color: "green" },
            { name: "Manufacturing", color: "brown" },
            { name: "Marketing Agency", color: "gray" },
            { name: "Media & Entertainment", color: "pink" },
            { name: "Nonprofit", color: "brown" },
            { name: "Retail", color: "orange" },
            { name: "Technology", color: "blue" },
            { name: "Transportation", color: "gray" },
          ],
        },
        {
          resourceId: "co-size",
          name: "Size",
          type: "select",
          options: [
            { name: "1-49", color: "brown" },
            { name: "50-249", color: "purple" },
            { name: "250-999", color: "gray" },
            { name: "1000+", color: "blue" },
          ],
        },
        {
          resourceId: "co-country",
          name: "Country",
          type: "select",
          options: [
            { name: "AE", color: "gray" },
            { name: "AU", color: "gray" },
            { name: "GB", color: "green" },
            { name: "ID", color: "gray" },
            { name: "JP", color: "brown" },
            { name: "NL", color: "blue" },
            { name: "SG", color: "green" },
            { name: "US", color: "red" },
          ],
        },
        // Production uses a `place` property here; no such type in the alpha.
        { resourceId: "co-address", name: "Address", type: "text" },
        {
          resourceId: "co-contacts-rel",
          name: "Contacts",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-company-rel",
        },
        {
          resourceId: "co-billing-contact-rel",
          name: "Primary Billing Contact",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          limit: 1,
        },
        {
          resourceId: "co-deals-rel",
          name: "Deals",
          type: "relation",
          targetDataSourceResourceId: "deals-ds",
          targetDataSourcePropertyResourceId: "dl-company-rel",
        },
        {
          resourceId: "co-meetings-rel",
          name: "Meeting Notes",
          type: "relation",
          targetDataSourceResourceId: "meetings-ds",
          targetDataSourcePropertyResourceId: "mt-companies-rel",
        },
        {
          resourceId: "co-emails-rel",
          name: "Emails",
          type: "relation",
          targetDataSourceResourceId: "emails-ds",
          targetDataSourcePropertyResourceId: "em-companies-rel",
        },
        {
          resourceId: "co-no-contacts",
          name: "No. Contacts",
          type: "rollup",
          relationPropertyResourceId: "co-contacts-rel",
          targetPropertyResourceId: "ct-name",
          targetPropertyType: "title",
          aggregation: "count_values",
        },
        {
          resourceId: "co-no-deals",
          name: "No. Deals",
          type: "rollup",
          relationPropertyResourceId: "co-deals-rel",
          targetPropertyResourceId: "dl-name",
          targetPropertyType: "title",
          aggregation: "count",
        },
        {
          resourceId: "co-deal-owner",
          name: "Deal Owner",
          type: "rollup",
          relationPropertyResourceId: "co-deals-rel",
          targetPropertyResourceId: "dl-owner",
          targetPropertyType: "person",
          aggregation: "show_unique",
        },
        // Integration keys + the URL formulas production builds from them
        // (same-data-source formulas, so these should deploy correctly).
        {
          resourceId: "co-drive-folder-id",
          name: "Google Drive Folder ID",
          type: "text",
        },
        {
          resourceId: "co-drive-folder",
          name: "Google Drive Folder",
          type: "formula",
          expression:
            '"https://drive.google.com/drive/folders/" + prop("co-drive-folder-id")',
        },
        { resourceId: "co-slack-channel-id", name: "Slack Channel ID", type: "text" },
        {
          resourceId: "co-slack-channel",
          name: "Slack Channel",
          type: "formula",
          expression:
            '"https://workflowers-workspace.slack.com/archives/" + prop("co-slack-channel-id")',
        },
        { resourceId: "co-harvest-client-id", name: "Harvest Client ID", type: "text" },
        { resourceId: "co-xero-contact-id", name: "Xero Contact ID", type: "text" },
        { resourceId: "co-linear-team-id", name: "Linear Team ID", type: "text" },
        {
          resourceId: "co-linear-customer-id",
          name: "Linear Customer ID",
          type: "text",
        },
        { resourceId: "co-created-time", name: "Created time", type: "created_time" },
        {
          resourceId: "co-last-edited-time",
          name: "Last edited time",
          type: "last_edited_time",
        },
      ],
    },
    // ----------------------------------------------------------------- Deals
    {
      resourceId: "deals-ds",
      name: "Deals",
      icon: { type: "notion_icon", description: "handshake", color: "orange" },
      properties: [
        { resourceId: "dl-name", name: "Deal Name", type: "title" },
        {
          resourceId: "dl-id",
          name: "Deal ID",
          type: "auto_increment_id",
          prefix: "CRMD",
        },
        // Production's status property, groups included.
        {
          resourceId: "dl-status",
          name: "Status",
          type: "status",
          options: {
            todo: [{ name: "Lead", color: "yellow", default: true }],
            inProgress: [
              { name: "Proposal", color: "blue" },
              { name: "Negotiation", color: "purple" },
              { name: "In signing", color: "orange" },
            ],
            complete: [
              { name: "Closed Won", color: "green" },
              { name: "Closed Lost", color: "red" },
              { name: "Declined", color: "pink" },
            ],
          },
        },
        {
          resourceId: "dl-type",
          name: "Type",
          type: "select",
          options: [
            { name: "Full Retainer", color: "yellow" },
            { name: "Project", color: "blue" },
            { name: "Support Retainer", color: "pink" },
            { name: "Workshop", color: "green" },
          ],
        },
        { resourceId: "dl-value", name: "Value", type: "number" },
        // Stored 0–1; production formats this as a percent (not scriptable).
        { resourceId: "dl-probability", name: "Probability", type: "number" },
        {
          resourceId: "dl-expected-value",
          name: "Expected Value",
          type: "formula",
          expression: 'prop("dl-value") * prop("dl-probability")',
        },
        { resourceId: "dl-expected-close", name: "Expected Close", type: "date" },
        { resourceId: "dl-actual-close", name: "Actual Close", type: "date" },
        { resourceId: "dl-owner", name: "Owner", type: "person", limit: 1 },
        { resourceId: "dl-description", name: "Description", type: "text" },
        {
          resourceId: "dl-lost-reason",
          name: "Lost Reason",
          type: "select",
          options: [
            { name: "Price / Budget", color: "red" },
            { name: "Chose competitor", color: "orange" },
            { name: "Timing / Not now", color: "yellow" },
            { name: "No budget", color: "brown" },
            { name: "Went with internal build", color: "blue" },
            { name: "Went silent / No response", color: "gray" },
            { name: "Not a fit", color: "purple" },
            { name: "Other", color: "default" },
          ],
        },
        {
          // `limit: 1` was dropped here after the first deploy: with it, the
          // link was written and readable from the Companies side but the Deals
          // side read empty, silently emptying the Company Name / Domain
          // rollups (finding 18). Production's Deals → Company is an
          // unrestricted dual relation anyway.
          resourceId: "dl-company-rel",
          name: "Company",
          type: "relation",
          targetDataSourceResourceId: "companies-ds",
          targetDataSourcePropertyResourceId: "co-deals-rel",
        },
        {
          resourceId: "dl-contact-rel",
          name: "Contact",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-deals-rel",
        },
        {
          resourceId: "dl-referred-by-rel",
          name: "Referred by",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-deals-referred-rel",
        },
        {
          resourceId: "dl-meetings-rel",
          name: "Meeting Notes",
          type: "relation",
          targetDataSourceResourceId: "meetings-ds",
          targetDataSourcePropertyResourceId: "mt-deals-rel",
        },
        {
          resourceId: "dl-emails-rel",
          name: "Emails",
          type: "relation",
          targetDataSourceResourceId: "emails-ds",
          targetDataSourcePropertyResourceId: "em-deals-rel",
        },
        {
          resourceId: "dl-company-name",
          name: "Company Name",
          type: "rollup",
          relationPropertyResourceId: "dl-company-rel",
          targetPropertyResourceId: "co-name",
          targetPropertyType: "title",
          aggregation: "show_unique",
        },
        {
          resourceId: "dl-domain",
          name: "Domain",
          type: "rollup",
          relationPropertyResourceId: "dl-company-rel",
          targetPropertyResourceId: "co-website",
          targetPropertyType: "url",
          aggregation: "show_unique",
        },
        {
          resourceId: "dl-contact-email",
          name: "Contact Email",
          type: "rollup",
          relationPropertyResourceId: "dl-contact-rel",
          targetPropertyResourceId: "ct-primary-email",
          targetPropertyType: "email",
          aggregation: "show_unique",
        },
        { resourceId: "dl-created-time", name: "Created time", type: "created_time" },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Database 2 · Meeting Notes — calendar-synced meeting record
// ---------------------------------------------------------------------------

const meetingsDb = crmTeamspace.addDatabase({
  resourceId: "meetings-db",
  name: "Meeting Notes",
  icon: { type: "notion_icon", description: "compose", color: "purple" },
  description:
    "One row = one meeting. In production this is synced from Google Calendar via Zap and links external attendees through to Contacts.",
  dataSources: [
    {
      resourceId: "meetings-ds",
      name: "Meeting Notes",
      properties: [
        { resourceId: "mt-title", name: "Title", type: "title" },
        { resourceId: "mt-date", name: "Date", type: "date" },
        {
          resourceId: "mt-type",
          name: "Type",
          type: "select",
          options: [
            { name: "1:1", color: "purple" },
            { name: "Client", color: "green" },
            { name: "Coffee", color: "brown" },
            { name: "Community", color: "pink" },
            { name: "Event", color: "default" },
            { name: "Legal", color: "gray" },
            { name: "Notion Setup Session", color: "brown" },
            { name: "Onboarding", color: "purple" },
            { name: "Partner", color: "red" },
            { name: "Product Demo", color: "pink" },
            { name: "Project", color: "gray" },
            { name: "Prospect", color: "orange" },
            { name: "Team", color: "yellow" },
            { name: "Training", color: "default" },
            { name: "Vendor", color: "yellow" },
          ],
        },
        { resourceId: "mt-summary", name: "Summary", type: "text" },
        { resourceId: "mt-description", name: "Description", type: "text" },
        // Production stores external attendee emails as multi_select (264
        // options, written by the calendar Zap). Sample set only.
        {
          resourceId: "mt-attendees",
          name: "Attendees",
          type: "multi_select",
          options: [
            { name: "priya.raman@fernbrooklogistics.com", color: "blue" },
            { name: "tomas.weller@fernbrooklogistics.com", color: "green" },
            { name: "alice@halcyonhealth.com.au", color: "orange" },
            { name: "sam.beaulieu@halcyonhealth.com.au", color: "yellow" },
            { name: "dev@brightanvil.studio", color: "purple" },
            { name: "grace.okonjo@meridiangrain.com", color: "pink" },
            { name: "hello@work.flowers", color: "gray" },
          ],
        },
        {
          resourceId: "mt-internal-attendees",
          name: "Internal Attendees",
          type: "person",
        },
        { resourceId: "mt-granola-link", name: "Granola Link", type: "url" },
        { resourceId: "mt-call-link", name: "Call Link", type: "url" },
        {
          resourceId: "mt-gcal-event-id",
          name: "Google Calendar Event ID",
          type: "text",
        },
        {
          resourceId: "mt-contacts-rel",
          name: "Contacts",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-meetings-rel",
        },
        {
          resourceId: "mt-companies-rel",
          name: "Companies",
          type: "relation",
          targetDataSourceResourceId: "companies-ds",
          targetDataSourcePropertyResourceId: "co-meetings-rel",
        },
        {
          resourceId: "mt-deals-rel",
          name: "Deals",
          type: "relation",
          targetDataSourceResourceId: "deals-ds",
          targetDataSourcePropertyResourceId: "dl-meetings-rel",
        },
        {
          resourceId: "mt-company-names",
          name: "Company Names",
          type: "rollup",
          relationPropertyResourceId: "mt-companies-rel",
          targetPropertyResourceId: "co-name",
          targetPropertyType: "title",
          aggregation: "show_unique",
        },
        // Same-data-source formula — production's Upcoming/Completed flag.
        {
          resourceId: "mt-status",
          name: "Status",
          type: "formula",
          expression:
            'if(dateEnd(prop("mt-date")) > now(), "Upcoming", "Completed")',
        },
        {
          resourceId: "mt-add-context",
          name: "Add Meeting Context",
          type: "checkbox",
        },
        {
          resourceId: "mt-comment-access",
          name: "Comment Access",
          type: "person",
        },
        { resourceId: "mt-created-time", name: "Created time", type: "created_time" },
        { resourceId: "mt-created-by", name: "Created by", type: "created_by" },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Database 3 · Emails — Gmail thread record
// ---------------------------------------------------------------------------

const emailsDb = crmTeamspace.addDatabase({
  resourceId: "emails-db",
  name: "Emails",
  icon: { type: "notion_icon", description: "send", color: "red" },
  description:
    "One row = one Gmail thread, linked to the contacts, companies and deals it concerns.",
  dataSources: [
    {
      resourceId: "emails-ds",
      name: "Emails",
      properties: [
        { resourceId: "em-subject", name: "Subject", type: "title" },
        { resourceId: "em-from", name: "From", type: "email" },
        {
          resourceId: "em-to",
          name: "To",
          type: "multi_select",
          options: [
            { name: "hello@work.flowers", color: "purple" },
            { name: "billing@work.flowers", color: "red" },
            { name: "priya.raman@fernbrooklogistics.com", color: "blue" },
            { name: "alice@halcyonhealth.com.au", color: "orange" },
            { name: "dev@brightanvil.studio", color: "purple" },
            { name: "grace.okonjo@meridiangrain.com", color: "pink" },
          ],
        },
        {
          resourceId: "em-cc",
          name: "Cc",
          type: "multi_select",
          options: [
            { name: "hello@work.flowers", color: "purple" },
            { name: "billing@work.flowers", color: "brown" },
            { name: "tomas.weller@fernbrooklogistics.com", color: "green" },
            { name: "sam.beaulieu@halcyonhealth.com.au", color: "yellow" },
          ],
        },
        { resourceId: "em-date-received", name: "Date Received", type: "date" },
        { resourceId: "em-thread-summary", name: "Thread Summary", type: "text" },
        { resourceId: "em-url", name: "URL", type: "url" },
        // Values need an upload, so sample rows ship without attachments.
        { resourceId: "em-attachments", name: "Attachments", type: "file" },
        { resourceId: "em-gmail-message-id", name: "Gmail Message ID", type: "text" },
        { resourceId: "em-gmail-thread-id", name: "Gmail Thread ID", type: "text" },
        {
          resourceId: "em-internal-recipients",
          name: "Internal Recipients",
          type: "person",
        },
        {
          resourceId: "em-comment-access",
          name: "Comment Access",
          type: "person",
        },
        {
          resourceId: "em-contacts-rel",
          name: "Contacts",
          type: "relation",
          targetDataSourceResourceId: "contacts-ds",
          targetDataSourcePropertyResourceId: "ct-emails-rel",
        },
        {
          resourceId: "em-companies-rel",
          name: "Companies",
          type: "relation",
          targetDataSourceResourceId: "companies-ds",
          targetDataSourcePropertyResourceId: "co-emails-rel",
        },
        {
          resourceId: "em-deals-rel",
          name: "Deals",
          type: "relation",
          targetDataSourceResourceId: "deals-ds",
          targetDataSourcePropertyResourceId: "dl-emails-rel",
        },
        { resourceId: "em-created-time", name: "Created time", type: "created_time" },
        {
          resourceId: "em-last-edited",
          name: "Last edited",
          type: "last_edited_time",
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Views — the database's own tabs
// ---------------------------------------------------------------------------

// Core CRM Objects: one tab per data source, as in production.
coreDb.addView({
  resourceId: "contacts-table-view",
  name: "Contacts",
  type: "table",
  dataSourceResourceId: "contacts-ds",
  sorts: [{ propertyId: "ct-created-time", direction: "descending" }],
  properties: [
    { property: "ct-name", visible: true },
    { property: "ct-company-rollup", visible: true },
    { property: "ct-job-title", visible: true },
    { property: "ct-primary-email", visible: true },
    { property: "ct-lead-source", visible: true },
    { property: "ct-country", visible: true },
    { property: "ct-latest-meeting", visible: true },
    { property: "ct-latest-email", visible: true },
    { property: "ct-deals-rel", visible: true },
    { property: "ct-owner", visible: true },
    { property: "ct-created-time", visible: true },
    { property: "ct-bio", visible: false },
    { property: "ct-note", visible: false },
    { property: "ct-secondary-email", visible: false },
  ],
})

coreDb.addView({
  resourceId: "companies-table-view",
  name: "Companies",
  type: "table",
  dataSourceResourceId: "companies-ds",
  sorts: [{ propertyId: "co-name", direction: "ascending" }],
  properties: [
    { property: "co-name", visible: true },
    { property: "co-id", visible: true },
    { property: "co-industry", visible: true },
    { property: "co-size", visible: true },
    { property: "co-country", visible: true },
    { property: "co-website", visible: true },
    { property: "co-contacts-rel", visible: true },
    { property: "co-deals-rel", visible: true },
    { property: "co-no-contacts", visible: true },
    { property: "co-no-deals", visible: true },
    { property: "co-drive-folder", visible: true },
    { property: "co-slack-channel", visible: true },
    { property: "co-address", visible: false },
    { property: "co-description", visible: false },
  ],
})

coreDb.addView({
  resourceId: "deals-board-view",
  name: "Deals",
  type: "board",
  dataSourceResourceId: "deals-ds",
  groupBy: { property: "dl-status", type: "status" },
  properties: [
    { property: "dl-name", visible: true },
    { property: "dl-type", visible: true },
    { property: "dl-value", visible: true },
    { property: "dl-probability", visible: true },
    { property: "dl-expected-value", visible: true },
    { property: "dl-company-rel", visible: true },
    { property: "dl-contact-rel", visible: true },
    { property: "dl-expected-close", visible: true },
  ],
})

// Production also keeps a dedicated pipeline board (sorted by close dates).
coreDb.addView({
  resourceId: "deals-pipeline-view",
  name: "Deal Pipeline",
  type: "board",
  dataSourceResourceId: "deals-ds",
  groupBy: { property: "dl-status", type: "status" },
  sorts: [
    { propertyId: "dl-actual-close", direction: "descending" },
    { propertyId: "dl-expected-close", direction: "ascending" },
  ],
  properties: [
    { property: "dl-name", visible: true },
    { property: "dl-value", visible: true },
    { property: "dl-probability", visible: true },
    { property: "dl-company-rel", visible: true },
    { property: "dl-contact-rel", visible: true },
    { property: "dl-type", visible: true },
    { property: "dl-expected-close", visible: false },
  ],
})

coreDb.addView({
  resourceId: "deals-won-view",
  name: "Closed Won",
  type: "table",
  dataSourceResourceId: "deals-ds",
  filters: [
    {
      propertyId: "dl-status",
      propertyType: "status",
      operator: "status_is",
      value: "Closed Won",
    },
  ],
  sorts: [{ propertyId: "dl-actual-close", direction: "descending" }],
})

// Meeting Notes
meetingsDb.addView({
  resourceId: "meetings-all-view",
  name: "All Meetings",
  type: "table",
  dataSourceResourceId: "meetings-ds",
  sorts: [{ propertyId: "mt-date", direction: "descending" }],
  properties: [
    { property: "mt-title", visible: true },
    { property: "mt-date", visible: true },
    { property: "mt-type", visible: true },
    { property: "mt-status", visible: true },
    { property: "mt-attendees", visible: true },
    { property: "mt-contacts-rel", visible: true },
    { property: "mt-companies-rel", visible: true },
    { property: "mt-deals-rel", visible: true },
    { property: "mt-summary", visible: false },
  ],
})

// Production filters this to today via a relative-date filter; the alpha only
// accepts fixed YYYY-MM-DD, so this is a Date-ascending list instead.
meetingsDb.addView({
  resourceId: "meetings-today-view",
  name: "Today's Meetings",
  type: "list",
  dataSourceResourceId: "meetings-ds",
  sorts: [{ propertyId: "mt-date", direction: "ascending" }],
  properties: [
    { property: "mt-title", visible: true },
    { property: "mt-date", visible: true },
    { property: "mt-type", visible: true },
    { property: "mt-companies-rel", visible: true },
  ],
})

meetingsDb.addView({
  resourceId: "meetings-calendar-view",
  name: "Weekly Calendar",
  type: "calendar",
  dataSourceResourceId: "meetings-ds",
  calendarBy: "mt-date",
  showWeekends: false,
  properties: [
    { property: "mt-title", visible: true },
    { property: "mt-call-link", visible: true },
    { property: "mt-type", visible: true },
    { property: "mt-contacts-rel", visible: true },
  ],
})

meetingsDb.addView({
  resourceId: "meetings-by-type-view",
  name: "By Type",
  type: "board",
  dataSourceResourceId: "meetings-ds",
  groupBy: { property: "mt-type", type: "select" },
  sorts: [{ propertyId: "mt-date", direction: "descending" }],
})

// Emails
emailsDb.addView({
  resourceId: "emails-all-view",
  name: "All Emails",
  type: "table",
  dataSourceResourceId: "emails-ds",
  sorts: [{ propertyId: "em-last-edited", direction: "descending" }],
  wrap: true,
  properties: [
    { property: "em-subject", visible: true },
    { property: "em-date-received", visible: true },
    { property: "em-thread-summary", visible: true },
    { property: "em-contacts-rel", visible: true },
    { property: "em-companies-rel", visible: true },
    { property: "em-deals-rel", visible: true },
    { property: "em-last-edited", visible: true },
  ],
})

emailsDb.addView({
  resourceId: "emails-inbox-view",
  name: "Inbox",
  type: "table",
  dataSourceResourceId: "emails-ds",
  sorts: [{ propertyId: "em-date-received", direction: "descending" }],
  properties: [
    { property: "em-subject", visible: true },
    { property: "em-from", visible: true },
    { property: "em-to", visible: true },
    { property: "em-cc", visible: true },
    { property: "em-date-received", visible: true },
    { property: "em-contacts-rel", visible: true },
    { property: "em-url", visible: true },
    { property: "em-attachments", visible: true },
  ],
})

// ---------------------------------------------------------------------------
// CRM hub page + the linked-database dashboards production keeps on it
// ---------------------------------------------------------------------------

const hubPage = crmTeamspace.addPage({
  resourceId: "crm-hub-page",
  icon: { type: "notion_icon", description: "address book", color: "orange" },
  properties: { title: notion.text("CRM") },
  fullWidth: true,
  content: `<callout icon="📇" color="orange_bg">
	**Sandbox CRM.** Three databases: **Core CRM Objects** holds Contacts, Companies and Deals in one database with three data sources; **Meeting Notes** and **Emails** hold the activity record. Everything below is a linked view of those same rows.
</callout>

<columns>
	<column ratio="50">
		<callout icon="🗄️" color="gray_bg">
			**Databases**

			- <mention-database url="{{core-db}}">Core CRM Objects</mention-database> — Contacts · Companies · Deals
			- <mention-database url="{{meetings-db}}">Meeting Notes</mention-database>
			- <mention-database url="{{emails-db}}">Emails</mention-database>
		</callout>
	</column>
	<column ratio="50">
		<callout icon="📥" color="blue_bg">
			<database url="{{emails-linked}}" inline="true">Emails</database>
		</callout>
	</column>
</columns>

# Meetings

<database url="{{meetings-linked}}" inline="true">Meetings</database>

# Pipeline

<database url="{{deals-linked}}" inline="true">Deals</database>

# Contacts

<database url="{{contacts-linked}}" inline="true">Contacts</database>

# Operating docs

<page url="{{crm-model-page}}">CRM Data Model</page>
<page url="{{crm-hygiene-page}}">Data Hygiene Rules</page>
`,
})

// Linked (views-only) databases on the hub — each one is a block with several
// view tabs over a data source declared above, mirroring production's inline
// dashboards.
notion.database({
  resourceId: "emails-linked",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  name: "Emails",
  views: [
    {
      resourceId: "emails-mine-view",
      name: "My Emails",
      type: "list",
      dataSourceResourceId: "emails-ds",
      sorts: [{ propertyId: "em-date-received", direction: "descending" }],
      // Person filters DO support the viewer template variable.
      filters: [
        {
          propertyId: "em-internal-recipients",
          propertyType: "person",
          operator: "person_contains",
          value: { type: "relative", value: "me" },
        },
      ],
      properties: [
        { property: "em-subject", visible: true },
        { property: "em-date-received", visible: true },
        { property: "em-contacts-rel", visible: true },
      ],
    },
    {
      resourceId: "emails-recent-view",
      name: "Recent Emails",
      type: "list",
      dataSourceResourceId: "emails-ds",
      sorts: [{ propertyId: "em-last-edited", direction: "descending" }],
      properties: [
        { property: "em-subject", visible: true },
        { property: "em-date-received", visible: true },
        { property: "em-companies-rel", visible: true },
      ],
    },
  ],
})

notion.database({
  resourceId: "meetings-linked",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  name: "Meetings",
  views: [
    {
      resourceId: "meetings-mine-view",
      name: "My Meetings",
      type: "list",
      dataSourceResourceId: "meetings-ds",
      sorts: [{ propertyId: "mt-date", direction: "descending" }],
      filters: [
        {
          propertyId: "mt-internal-attendees",
          propertyType: "person",
          operator: "person_contains",
          value: { type: "relative", value: "me" },
        },
      ],
      properties: [
        { property: "mt-title", visible: true },
        { property: "mt-date", visible: true },
      ],
    },
    {
      // Production filters to today (relative date, unsupported here).
      resourceId: "meetings-hub-today-view",
      name: "Today",
      type: "list",
      dataSourceResourceId: "meetings-ds",
      sorts: [{ propertyId: "mt-date", direction: "ascending" }],
      properties: [
        { property: "mt-title", visible: true },
        { property: "mt-date", visible: true },
        { property: "mt-type", visible: true },
        { property: "mt-contacts-rel", visible: true },
      ],
    },
    {
      resourceId: "meetings-hub-calendar-view",
      name: "Weekly Calendar",
      type: "calendar",
      dataSourceResourceId: "meetings-ds",
      calendarBy: "mt-date",
      showWeekends: false,
      properties: [
        { property: "mt-title", visible: true },
        { property: "mt-call-link", visible: true },
        { property: "mt-type", visible: true },
        { property: "mt-contacts-rel", visible: true },
      ],
    },
  ],
})

notion.database({
  resourceId: "deals-linked",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  name: "Deals",
  views: [
    {
      // Production filters "Actual Close is empty" to mean open deals. There is
      // no is_empty operator (finding 12), and the first deploy attempt proved
      // a property can carry only ONE filter per view (finding 17) — three
      // stacked `status_is_not` filters are rejected outright:
      //   "Duplicate filter for property … Each property can only have one
      //    filter per view."
      // So the closed statuses are hidden as board GROUPS instead, which is
      // how you'd do it in the UI anyway. PROBE: `columns` group hiding is
      // untested in the alpha.
      resourceId: "deals-open-view",
      name: "Deal Pipeline",
      type: "board",
      dataSourceResourceId: "deals-ds",
      groupBy: { property: "dl-status", type: "status" },
      columns: [
        { property: "dl-status", value: { type: "status", value: "Lead" } },
        { property: "dl-status", value: { type: "status", value: "Proposal" } },
        { property: "dl-status", value: { type: "status", value: "Negotiation" } },
        { property: "dl-status", value: { type: "status", value: "In signing" } },
        {
          property: "dl-status",
          value: { type: "status", value: "Closed Won" },
          hidden: true,
        },
        {
          property: "dl-status",
          value: { type: "status", value: "Closed Lost" },
          hidden: true,
        },
        {
          property: "dl-status",
          value: { type: "status", value: "Declined" },
          hidden: true,
        },
      ],
      properties: [
        { property: "dl-name", visible: true },
        { property: "dl-owner", visible: true },
        { property: "dl-probability", visible: true },
        { property: "dl-expected-value", visible: true },
      ],
    },
    {
      resourceId: "deals-close-timeline-view",
      name: "Close Dates",
      type: "timeline",
      dataSourceResourceId: "deals-ds",
      timelineBy: "dl-expected-close",
      timelineByEnd: "dl-actual-close",
      showTable: true,
      tableProperties: [
        { property: "dl-name", visible: true },
        { property: "dl-status", visible: true },
        { property: "dl-value", visible: true },
      ],
    },
  ],
})

notion.database({
  resourceId: "contacts-linked",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  name: "Contacts",
  views: [
    {
      resourceId: "contacts-recent-view",
      name: "Recently Added",
      type: "table",
      dataSourceResourceId: "contacts-ds",
      sorts: [{ propertyId: "ct-created-time", direction: "descending" }],
      properties: [
        { property: "ct-name", visible: true },
        { property: "ct-company-rel", visible: true },
        { property: "ct-owner", visible: true },
        { property: "ct-created-time", visible: true },
      ],
    },
    {
      // Production sorts by its composite "Last Contacted" formula; this
      // sandbox sorts by the Latest Email probe formula instead.
      resourceId: "contacts-recently-contacted-view",
      name: "Recently Contacted",
      type: "gallery",
      dataSourceResourceId: "contacts-ds",
      sorts: [{ propertyId: "ct-latest-email", direction: "descending" }],
      cover: { type: "page_cover" },
      coverSize: "small",
      properties: [
        { property: "ct-name", visible: true },
        { property: "ct-job-title", visible: true },
        { property: "ct-company-rollup", visible: true },
        { property: "ct-latest-email", visible: true },
      ],
    },
  ],
})

notion.page({
  resourceId: "crm-model-page",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  icon: { type: "notion_icon", description: "diagram", color: "blue" },
  properties: { title: notion.text("CRM Data Model") },
  content: `<callout icon="🧭" color="blue_bg">
	Companies are the account of record. Contacts belong to exactly one company. Deals hang off a company plus a contact. Meetings and Emails are the activity layer and link to all three.
</callout>

# Objects

<table fit-page-width="true" header-row="true">
	<tr>
		<td>Object</td>
		<td>One row =</td>
		<td>Key links</td>
	</tr>
	<tr>
		<td>Companies</td>
		<td>One account</td>
		<td>Contacts, Deals, Meeting Notes, Emails</td>
	</tr>
	<tr>
		<td>Contacts</td>
		<td>One person</td>
		<td>Related Company, Deals, Deals Referred, Meeting Notes, Emails</td>
	</tr>
	<tr>
		<td>Deals</td>
		<td>One revenue opportunity</td>
		<td>Company, Contact, Referred by, Meeting Notes, Emails</td>
	</tr>
	<tr>
		<td>Meeting Notes</td>
		<td>One meeting</td>
		<td>Contacts, Companies, Deals</td>
	</tr>
	<tr>
		<td>Emails</td>
		<td>One Gmail thread</td>
		<td>Contacts, Companies, Deals</td>
	</tr>
</table>

# Derived fields

- **Companies** count their own contacts and deals (\`No. Contacts\`, \`No. Deals\`) and build their Drive folder and Slack channel URLs from stored IDs.
- **Deals** pull company name, domain and contact email by rollup, and compute \`Expected Value\` = Value × Probability.
- **Meeting Notes** derive \`Status\` (Upcoming / Completed) from the meeting date.
- **Contacts** carry \`Latest Meeting\` and \`Latest Email\` formulas that reach across data sources — see the script header for the known alpha limitation affecting these.
`,
})

notion.page({
  resourceId: "crm-hygiene-page",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  icon: { type: "notion_icon", description: "broom", color: "yellow" },
  properties: { title: notion.text("Data Hygiene Rules") },
  content: `# Rules

1. **One company per contact.** If someone changes employer, update \`Related Company\` rather than creating a second contact.
2. **Deals always carry a company and a contact.** A deal with no contact cannot be chased.
3. **Status is owned by the deal owner.** Nobody else moves cards on the pipeline board.
4. **Every closed deal gets an Actual Close date** — the pipeline's open/closed split depends on it.
5. **Lost deals get a Lost Reason.** No reason, no learning.
6. **Duplicates are linked, not deleted.** Use \`Duplicate of\` so history survives the merge.

# Automation boundary

Meetings and Emails are written by integrations, not by hand: the calendar sync creates meeting rows and the Gmail sync creates email rows, then both are linked back to Contacts, Companies and Deals. Humans own the CRM objects; robots own the activity log.
`,
})

// ---------------------------------------------------------------------------
// Sample records — fictional companies, contacts, deals, meetings and emails,
// wired through the relations so rollups and views have something to show.
// ---------------------------------------------------------------------------

const contactsDs = coreDb.getDataSource("contacts-ds")
const companiesDs = coreDb.getDataSource("companies-ds")
const dealsDs = coreDb.getDataSource("deals-ds")
const meetingsDs = meetingsDb.getDataSource("meetings-ds")
const emailsDs = emailsDb.getDataSource("emails-ds")

// Companies
companiesDs.addPage({
  resourceId: "co-fernbrook",
  properties: {
    "Company Name": notion.text("Fernbrook Logistics"),
    Description: notion.text(
      "Regional 3PL running warehouse and last-mile operations across SEA. Ops team of 40."
    ),
    Website: notion.url("https://fernbrooklogistics.com"),
    Industry: notion.select("Transportation"),
    Size: notion.select("50-249"),
    Country: notion.select("SG"),
    Address: notion.text("18 Boon Lay Way, Singapore 609966"),
    "Google Drive Folder ID": notion.text("1Fern8rookSampleFolderId"),
    "Slack Channel ID": notion.text("C08FERNBROOK"),
    "Harvest Client ID": notion.text("55120031"),
    // PROBE: forward page reference — ct-tomas is created later in this
    // script. Schema-level forward references are known to work; page-value
    // ones are untested in the alpha.
    "Primary Billing Contact": notion.relation(["ct-tomas"]),
  },
  content: `# Account notes

Warehouse operations run on spreadsheets plus a legacy WMS. Priya owns the automation mandate; Tomas signs.
`,
})

companiesDs.addPage({
  resourceId: "co-halcyon",
  properties: {
    "Company Name": notion.text("Halcyon Health"),
    Description: notion.text(
      "Allied-health group with 22 clinics across Victoria and NSW. Rolling out Notion company-wide."
    ),
    Website: notion.url("https://halcyonhealth.com.au"),
    Industry: notion.select("Healthcare"),
    Size: notion.select("250-999"),
    Country: notion.select("AU"),
    Address: notion.text("Level 4, 120 Collins Street, Melbourne VIC 3000"),
    "Google Drive Folder ID": notion.text("1HalcyonSampleFolderId"),
    "Slack Channel ID": notion.text("C08HALCYON"),
  },
})

companiesDs.addPage({
  resourceId: "co-brightanvil",
  properties: {
    "Company Name": notion.text("Bright Anvil Studios"),
    Description: notion.text(
      "Six-person animation studio. Bought a one-day Notion workshop after a partner-directory enquiry."
    ),
    Website: notion.url("https://brightanvil.studio"),
    Industry: notion.select("Media & Entertainment"),
    Size: notion.select("1-49"),
    Country: notion.select("GB"),
    Address: notion.text("Unit 6, Hoxton Works, London N1 6PB"),
  },
})

companiesDs.addPage({
  resourceId: "co-meridian",
  properties: {
    "Company Name": notion.text("Meridian Grain Co."),
    Description: notion.text(
      "Agricultural commodities trader. Inbound from a conference; evaluating a support retainer."
    ),
    Website: notion.url("https://meridiangrain.com"),
    Industry: notion.select("Manufacturing"),
    Size: notion.select("1000+"),
    Country: notion.select("US"),
    Address: notion.text("500 Marquette Ave, Minneapolis, MN 55402"),
  },
})

// Contacts
contactsDs.addPage({
  resourceId: "ct-priya",
  properties: {
    Name: notion.text("Priya Raman"),
    "First Name": notion.text("Priya"),
    "Last Name": notion.text("Raman"),
    "Primary Email": notion.email("priya.raman@fernbrooklogistics.com"),
    "Secondary Email": notion.multiSelect(["priya.raman@gmail.com"]),
    "Primary Phone": notion.phone("+65 8123 4455"),
    "Job Title": notion.text("Head of Operations"),
    Linkedin: notion.url("https://www.linkedin.com/in/sample-priya-raman"),
    "Lead Source": notion.select("Existing Network"),
    Location: notion.text("Singapore"),
    City: notion.select("Singapore"),
    Country: notion.select("Singapore"),
    Bio: notion.text(
      "Ran ops at two 3PLs before Fernbrook. Wants fewer spreadsheets, not more dashboards."
    ),
    "Related Company": notion.relation(["co-fernbrook"]),
    "First Contacted": notion.date("2026-05-12"),
    "Mailing List": notion.checkbox(true),
    "Subscribed on": notion.date("2026-05-12"),
  },
})

contactsDs.addPage({
  resourceId: "ct-tomas",
  properties: {
    Name: notion.text("Tomas Weller"),
    "First Name": notion.text("Tomas"),
    "Last Name": notion.text("Weller"),
    "Primary Email": notion.email("tomas.weller@fernbrooklogistics.com"),
    "Job Title": notion.text("Finance Director"),
    "Lead Source": notion.select("Existing Network"),
    Location: notion.text("Singapore"),
    City: notion.select("Singapore"),
    Country: notion.select("Singapore"),
    Note: notion.text("Signs contracts. Cc on anything commercial."),
    "Related Company": notion.relation(["co-fernbrook"]),
    "First Contacted": notion.date("2026-06-02"),
  },
})

contactsDs.addPage({
  resourceId: "ct-alice",
  properties: {
    Name: notion.text("Alice Nkemdirim"),
    "First Name": notion.text("Alice"),
    "Last Name": notion.text("Nkemdirim"),
    "Primary Email": notion.email("alice@halcyonhealth.com.au"),
    "Primary Phone": notion.phone("+61 3 9000 1122"),
    "Job Title": notion.text("Chief Operating Officer"),
    Linkedin: notion.url("https://www.linkedin.com/in/sample-alice-nkemdirim"),
    "Lead Source": notion.select("LinkedIn"),
    Location: notion.text("Melbourne, Australia"),
    City: notion.select("Melbourne"),
    Country: notion.select("Australia"),
    Bio: notion.text("Clinician turned operator. Sponsor for the Notion rollout."),
    "Related Company": notion.relation(["co-halcyon"]),
    "First Contacted": notion.date("2026-06-18"),
    "Mailing List": notion.checkbox(true),
    "Subscribed on": notion.date("2026-06-18"),
  },
})

contactsDs.addPage({
  resourceId: "ct-sam",
  properties: {
    Name: notion.text("Sam Beaulieu"),
    "First Name": notion.text("Sam"),
    "Last Name": notion.text("Beaulieu"),
    "Primary Email": notion.email("sam.beaulieu@halcyonhealth.com.au"),
    "Job Title": notion.text("Head of Data"),
    "Lead Source": notion.select("Event"),
    Location: notion.text("Melbourne, Australia"),
    City: notion.select("Melbourne"),
    Country: notion.select("Australia"),
    Note: notion.text("Introduced us to Alice after the Melbourne ops meetup."),
    "Related Company": notion.relation(["co-halcyon"]),
    "First Contacted": notion.date("2026-06-05"),
  },
})

contactsDs.addPage({
  resourceId: "ct-dev",
  properties: {
    Name: notion.text("Dev Shah"),
    "First Name": notion.text("Dev"),
    "Last Name": notion.text("Shah"),
    "Primary Email": notion.email("dev@brightanvil.studio"),
    "Secondary Email": notion.multiSelect(["d.shah@brightanvil.studio"]),
    "Job Title": notion.text("Founder"),
    "Lead Source": notion.select("Notion Partner Directory"),
    Location: notion.text("London, United Kingdom"),
    City: notion.select("London"),
    Country: notion.select("United Kingdom"),
    "Related Company": notion.relation(["co-brightanvil"]),
    "First Contacted": notion.date("2026-06-28"),
    "Mailing List": notion.checkbox(true),
    "Subscribed on": notion.date("2026-06-28"),
  },
})

contactsDs.addPage({
  resourceId: "ct-grace",
  properties: {
    Name: notion.text("Grace Okonjo"),
    "First Name": notion.text("Grace"),
    "Last Name": notion.text("Okonjo"),
    "Primary Email": notion.email("grace.okonjo@meridiangrain.com"),
    "Secondary Email": notion.multiSelect(["grace.okonjo@outlook.com"]),
    "Job Title": notion.text("VP Supply Chain"),
    "Lead Source": notion.select("Event"),
    Location: notion.text("Minneapolis, United States"),
    City: notion.select("Minneapolis"),
    Country: notion.select("United States"),
    Note: notion.text("Met at the supply-chain summit. Budget cycle starts October."),
    "Related Company": notion.relation(["co-meridian"]),
    "First Contacted": notion.date("2026-07-09"),
  },
})

// A duplicate record, linked rather than deleted — exercises the self relation.
contactsDs.addPage({
  resourceId: "ct-grace-dupe",
  properties: {
    Name: notion.text("G. Okonjo"),
    "Primary Email": notion.email("grace.okonjo@outlook.com"),
    "Job Title": notion.text("VP Supply Chain"),
    "Lead Source": notion.select("Newsletter Sign-up"),
    "Duplicate of": notion.relation(["ct-grace"]),
    "Related Company": notion.relation(["co-meridian"]),
  },
})

// Deals
dealsDs.addPage({
  resourceId: "dl-fernbrook-ops",
  properties: {
    "Deal Name": notion.text("Fernbrook — Ops automation build"),
    Status: notion.status("Negotiation"),
    Type: notion.select("Project"),
    Value: 48000,
    Probability: 0.7,
    "Expected Close": notion.date("2026-08-14"),
    Company: notion.relation(["co-fernbrook"]),
    Contact: notion.relation(["ct-priya", "ct-tomas"]),
    Description: notion.text(
      "Replace the warehouse spreadsheet stack with Notion + Zapier: inbound bookings, exception queue, daily ops digest."
    ),
  },
  content: `# Scope under discussion

Three workflows: inbound booking intake, exception handling, and the 06:00 ops digest. Fernbrook wants a fixed-price build with a two-week hypercare window.

# Open questions

- Who owns the exception queue after go-live?
- Does the legacy WMS expose a usable API, or do we go via CSV drop?
`,
})

dealsDs.addPage({
  resourceId: "dl-halcyon-rollout",
  properties: {
    "Deal Name": notion.text("Halcyon Health — Notion rollout"),
    Status: notion.status("Proposal"),
    Type: notion.select("Full Retainer"),
    Value: 96000,
    Probability: 0.5,
    "Expected Close": notion.date("2026-09-01"),
    Company: notion.relation(["co-halcyon"]),
    Contact: notion.relation(["ct-alice"]),
    "Referred by": notion.relation(["ct-sam"]),
    Description: notion.text(
      "Twelve-month retainer: workspace architecture across 22 clinics, clinical SOP library, and enablement."
    ),
  },
})

dealsDs.addPage({
  resourceId: "dl-brightanvil-workshop",
  properties: {
    "Deal Name": notion.text("Bright Anvil — Notion workshop"),
    Status: notion.status("Closed Won"),
    Type: notion.select("Workshop"),
    Value: 6500,
    Probability: 1,
    "Expected Close": notion.date("2026-07-10"),
    "Actual Close": notion.date("2026-07-11"),
    Company: notion.relation(["co-brightanvil"]),
    Contact: notion.relation(["ct-dev"]),
    Description: notion.text(
      "One-day production-pipeline workshop plus a two-week follow-up review."
    ),
  },
})

dealsDs.addPage({
  resourceId: "dl-meridian-support",
  properties: {
    "Deal Name": notion.text("Meridian Grain — Support retainer"),
    Status: notion.status("Lead"),
    Type: notion.select("Support Retainer"),
    Value: 24000,
    Probability: 0.2,
    "Expected Close": notion.date("2026-10-15"),
    Company: notion.relation(["co-meridian"]),
    Contact: notion.relation(["ct-grace"]),
    Description: notion.text(
      "Ongoing support for the internal Notion build their team already runs. Budget opens in October."
    ),
  },
})

dealsDs.addPage({
  resourceId: "dl-halcyon-migration",
  properties: {
    "Deal Name": notion.text("Halcyon Health — Legacy intranet migration"),
    Status: notion.status("Closed Lost"),
    Type: notion.select("Project"),
    Value: 30000,
    Probability: 0,
    "Expected Close": notion.date("2026-06-30"),
    "Actual Close": notion.date("2026-07-02"),
    "Lost Reason": notion.select("Went with internal build"),
    Company: notion.relation(["co-halcyon"]),
    Contact: notion.relation(["ct-sam"]),
    Description: notion.text(
      "Their platform team took the migration in-house. Rollout retainer survived as a separate deal."
    ),
  },
})

// Meetings
meetingsDs.addPage({
  resourceId: "mt-fernbrook-discovery",
  properties: {
    Title: notion.text("Fernbrook — ops discovery"),
    Date: notion.date("2026-07-14"),
    Type: notion.select("Prospect"),
    Summary: notion.text(
      "Walked the warehouse booking process end to end. Three workflows worth automating; exception handling is the painful one."
    ),
    Attendees: notion.multiSelect([
      "priya.raman@fernbrooklogistics.com",
      "hello@work.flowers",
    ]),
    "Call Link": notion.url("https://meet.google.com/sample-fernbrook-discovery"),
    "Granola Link": notion.url("https://notes.granola.ai/d/sample-fernbrook-discovery"),
    "Google Calendar Event ID": notion.text("sample_evt_fernbrook_discovery"),
    Contacts: notion.relation(["ct-priya"]),
    Companies: notion.relation(["co-fernbrook"]),
    Deals: notion.relation(["dl-fernbrook-ops"]),
  },
  content: `# Notes

- Bookings arrive by email and WhatsApp; someone retypes them into the WMS.
- Exceptions (short deliveries, refusals) have no queue — they live in one person's inbox.
- Priya wants the daily digest before 07:00 local.

# Next steps

- [ ] Send scoped proposal for the three workflows
- [ ] Confirm WMS API access with their IT vendor
`,
})

meetingsDs.addPage({
  resourceId: "mt-halcyon-scoping",
  properties: {
    Title: notion.text("Halcyon Health — rollout scoping"),
    Date: notion.date("2026-07-17"),
    Type: notion.select("Client"),
    Summary: notion.text(
      "Agreed a clinic-by-clinic rollout with two pilot sites first. Alice will sponsor; Sam's team stays on the data side."
    ),
    Attendees: notion.multiSelect([
      "alice@halcyonhealth.com.au",
      "sam.beaulieu@halcyonhealth.com.au",
      "hello@work.flowers",
    ]),
    "Call Link": notion.url("https://meet.google.com/sample-halcyon-scoping"),
    "Granola Link": notion.url("https://notes.granola.ai/d/sample-halcyon-scoping"),
    Contacts: notion.relation(["ct-alice", "ct-sam"]),
    Companies: notion.relation(["co-halcyon"]),
    Deals: notion.relation(["dl-halcyon-rollout"]),
  },
})

meetingsDs.addPage({
  resourceId: "mt-brightanvil-workshop",
  properties: {
    Title: notion.text("Bright Anvil — production pipeline workshop"),
    Date: notion.date("2026-07-21"),
    Type: notion.select("Training"),
    Summary: notion.text(
      "Full-day workshop with all six staff. Rebuilt their shot-tracking board and set up review handoffs."
    ),
    Attendees: notion.multiSelect(["dev@brightanvil.studio", "hello@work.flowers"]),
    Contacts: notion.relation(["ct-dev"]),
    Companies: notion.relation(["co-brightanvil"]),
    Deals: notion.relation(["dl-brightanvil-workshop"]),
    "Add Meeting Context": notion.checkbox(true),
  },
})

meetingsDs.addPage({
  resourceId: "mt-meridian-intro",
  properties: {
    Title: notion.text("Meridian Grain — intro call"),
    Date: notion.date("2026-07-23"),
    Type: notion.select("Prospect"),
    Summary: notion.text(
      "Their internal build is live and mostly working. Interested in a support retainer once the October budget opens."
    ),
    Attendees: notion.multiSelect([
      "grace.okonjo@meridiangrain.com",
      "hello@work.flowers",
    ]),
    "Call Link": notion.url("https://meet.google.com/sample-meridian-intro"),
    Contacts: notion.relation(["ct-grace"]),
    Companies: notion.relation(["co-meridian"]),
    Deals: notion.relation(["dl-meridian-support"]),
  },
})

// An upcoming meeting — exercises the Status formula (Upcoming vs Completed).
meetingsDs.addPage({
  resourceId: "mt-fernbrook-proposal",
  properties: {
    Title: notion.text("Fernbrook — proposal walkthrough"),
    Date: notion.date("2026-07-29"),
    Type: notion.select("Client"),
    Summary: notion.text("Walk Priya and Tomas through scope, price and the hypercare window."),
    Attendees: notion.multiSelect([
      "priya.raman@fernbrooklogistics.com",
      "tomas.weller@fernbrooklogistics.com",
      "hello@work.flowers",
    ]),
    "Call Link": notion.url("https://meet.google.com/sample-fernbrook-proposal"),
    Contacts: notion.relation(["ct-priya", "ct-tomas"]),
    Companies: notion.relation(["co-fernbrook"]),
    Deals: notion.relation(["dl-fernbrook-ops"]),
  },
})

// Emails
emailsDs.addPage({
  resourceId: "em-fernbrook-intro",
  properties: {
    Subject: notion.text("Re: Automating the Fernbrook booking queue"),
    From: notion.email("priya.raman@fernbrooklogistics.com"),
    To: notion.multiSelect(["hello@work.flowers"]),
    "Date Received": notion.date("2026-07-10"),
    "Thread Summary": notion.text(
      "Priya outlines the booking and exception problem and asks for a scoped proposal."
    ),
    URL: notion.url("https://mail.google.com/mail/u/0/#inbox/sample-fernbrook-intro"),
    "Gmail Thread ID": notion.text("18f2sample_fernbrook_intro"),
    Contacts: notion.relation(["ct-priya"]),
    Companies: notion.relation(["co-fernbrook"]),
    Deals: notion.relation(["dl-fernbrook-ops"]),
  },
})

emailsDs.addPage({
  resourceId: "em-fernbrook-proposal",
  properties: {
    Subject: notion.text("Fernbrook ops automation — proposal v2"),
    From: notion.email("hello@work.flowers"),
    To: notion.multiSelect(["priya.raman@fernbrooklogistics.com"]),
    Cc: notion.multiSelect(["tomas.weller@fernbrooklogistics.com"]),
    "Date Received": notion.date("2026-07-20"),
    "Thread Summary": notion.text(
      "Second pass at scope and price after the discovery call; Tomas cc'd for the commercials."
    ),
    URL: notion.url("https://mail.google.com/mail/u/0/#inbox/sample-fernbrook-proposal"),
    Contacts: notion.relation(["ct-priya", "ct-tomas"]),
    Companies: notion.relation(["co-fernbrook"]),
    Deals: notion.relation(["dl-fernbrook-ops"]),
  },
})

emailsDs.addPage({
  resourceId: "em-halcyon-intro",
  properties: {
    Subject: notion.text("Intro — Halcyon Health rollout"),
    From: notion.email("sam.beaulieu@halcyonhealth.com.au"),
    To: notion.multiSelect(["hello@work.flowers", "alice@halcyonhealth.com.au"]),
    "Date Received": notion.date("2026-06-18"),
    "Thread Summary": notion.text(
      "Sam introduces Alice and frames the 22-clinic rollout question."
    ),
    URL: notion.url("https://mail.google.com/mail/u/0/#inbox/sample-halcyon-intro"),
    Contacts: notion.relation(["ct-sam", "ct-alice"]),
    Companies: notion.relation(["co-halcyon"]),
    Deals: notion.relation(["dl-halcyon-rollout"]),
  },
})

emailsDs.addPage({
  resourceId: "em-brightanvil-invoice",
  properties: {
    Subject: notion.text("Workshop wrap-up + invoice"),
    From: notion.email("billing@work.flowers"),
    To: notion.multiSelect(["dev@brightanvil.studio"]),
    Cc: notion.multiSelect(["hello@work.flowers"]),
    "Date Received": notion.date("2026-07-22"),
    "Thread Summary": notion.text(
      "Workshop recap, the rebuilt shot-tracking template, and the final invoice."
    ),
    URL: notion.url("https://mail.google.com/mail/u/0/#inbox/sample-brightanvil-invoice"),
    Contacts: notion.relation(["ct-dev"]),
    Companies: notion.relation(["co-brightanvil"]),
    Deals: notion.relation(["dl-brightanvil-workshop"]),
  },
})

emailsDs.addPage({
  resourceId: "em-meridian-followup",
  properties: {
    Subject: notion.text("Re: Support retainer — October budget"),
    From: notion.email("grace.okonjo@meridiangrain.com"),
    To: notion.multiSelect(["hello@work.flowers"]),
    "Date Received": notion.date("2026-07-24"),
    "Thread Summary": notion.text(
      "Grace confirms the retainer is a Q4 conversation and asks for a one-pager to circulate internally."
    ),
    URL: notion.url("https://mail.google.com/mail/u/0/#inbox/sample-meridian-followup"),
    Contacts: notion.relation(["ct-grace"]),
    Companies: notion.relation(["co-meridian"]),
    Deals: notion.relation(["dl-meridian-support"]),
  },
})

export {}
