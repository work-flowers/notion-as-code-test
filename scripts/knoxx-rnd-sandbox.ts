/**
 * Knoxx Innovations — R&D management & evidence system (SANDBOX)
 *
 * Notion as Code script implementing the "R&D Notion architecture" plan:
 * three core databases (Projects, Activities, Knowledge) plus a lightweight
 * Commercial Opportunities stub, an ownership model, and audit-ready views
 * for the ATO R&D Tax Incentive claim.
 *
 * SAFETY: every resource here is net-new and parented under the private
 * sandbox teamspace. The only mapped existing resource is the workspace
 * itself ("knoxx-sandbox-space", bound via --spaceId), used purely as the
 * teamspace parent. Nothing references an existing Notion ID.
 *
 * Known adaptations from the source spec (see repo README for detail):
 * - "Grant-Eligible Hours" rollup on Projects: Notion rollups cannot filter
 *   ("sum where Grant Eligible = Yes") and Notion as Code rollups cannot
 *   target formula properties. Instead, Activities carries an "Eligible Hours"
 *   formula (Hours if Grant Eligible, else 0) and the ATO view provides the
 *   audit-ready filtered listing.
 * - "Today's Activities" view: view filters only support fixed dates, not
 *   relative ones ("today"), so the dashboard uses a date-sorted Daily Log.
 * - Person property VALUES cannot be set by script; Owner / Person /
 *   Captured by exist as columns but seed rows leave them empty.
 * - Auto-increment ID prefixes (KIP / KIA / KIK / KIC) must be unique
 *   across the whole workspace.
 */

// Anchors the script to the workspace passed with --spaceId. Used only as
// the parent for the sandbox teamspace; the workspace itself is not modified.
const spaceParent = {
  type: "resourceId",
  resourceId: "knoxx-sandbox-space",
} as const

// ---------------------------------------------------------------------------
// Sandbox teamspace (private: invisible to other workspace members)
// ---------------------------------------------------------------------------

const rndTeamspace = notion.teamspace({
  resourceId: "ki-rnd-teamspace",
  parent: spaceParent,
  name: "KI R&D Sandbox",
  accessLevel: "private",
  icon: { type: "notion_icon", description: "test tube", color: "green" },
  description:
    "Sandbox build of the Knoxx Innovations R&D management and evidence system (Notion as Code test).",
})

// ---------------------------------------------------------------------------
// Database 0 · Commercial Opportunities (stub for the KBG commercial side)
// ---------------------------------------------------------------------------

const commercialDb = rndTeamspace.addDatabase({
  resourceId: "commercial-db",
  name: "Commercial Opportunities",
  icon: { type: "notion_icon", description: "handshake", color: "orange" },
  description:
    "Commercial opportunities raised by KBG. One row = one customer opportunity that may spawn KI projects.",
  dataSources: [
    {
      resourceId: "commercial-ds",
      name: "Commercial Opportunities",
      properties: [
        { resourceId: "comm-name", name: "Name", type: "title" },
        {
          resourceId: "comm-id",
          name: "Opportunity ID",
          type: "auto_increment_id",
          prefix: "KIC",
        },
        { resourceId: "comm-customer", name: "Customer", type: "text" },
        {
          resourceId: "comm-status",
          name: "Status",
          type: "select",
          options: [
            { name: "Lead", color: "gray" },
            { name: "Qualified", color: "blue" },
            { name: "Sampling", color: "yellow" },
            { name: "Won", color: "green" },
            { name: "Lost", color: "red" },
          ],
        },
        {
          resourceId: "comm-projects-rel",
          name: "KI Projects",
          type: "relation",
          targetDataSourceResourceId: "projects-ds",
          targetDataSourcePropertyResourceId: "proj-commercial-rel",
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Database 1 · Projects (Master) — one row = one innovation project
// ---------------------------------------------------------------------------

const projectsDb = rndTeamspace.addDatabase({
  resourceId: "projects-db",
  name: "Projects",
  icon: { type: "notion_icon", description: "rocket", color: "purple" },
  description:
    "Master list of KI innovation projects. Answers: what are we trying to achieve? Rolls up automatically from Activities.",
  dataSources: [
    {
      resourceId: "projects-ds",
      name: "Projects",
      properties: [
        { resourceId: "proj-name", name: "Project name", type: "title" },
        {
          resourceId: "proj-id",
          name: "Project ID",
          type: "auto_increment_id",
          prefix: "KIP",
        },
        {
          resourceId: "proj-stage",
          name: "Stage",
          type: "select",
          options: [
            { name: "Ideation", color: "gray" },
            { name: "Feasibility", color: "yellow" },
            { name: "Development", color: "orange" },
            { name: "Trial", color: "blue" },
            { name: "Scale-up", color: "purple" },
            { name: "Commercialised", color: "green" },
          ],
        },
        {
          resourceId: "proj-status",
          name: "Status",
          type: "select",
          options: [
            { name: "On Track", color: "green" },
            { name: "At Risk", color: "yellow" },
            { name: "Delayed", color: "red" },
            { name: "On Hold", color: "gray" },
            { name: "Complete", color: "blue" },
          ],
        },
        {
          resourceId: "proj-priority",
          name: "Priority",
          type: "select",
          options: [
            { name: "High", color: "red" },
            { name: "Medium", color: "yellow" },
            { name: "Low", color: "green" },
          ],
        },
        { resourceId: "proj-owner", name: "Owner", type: "person", limit: 1 },
        {
          resourceId: "proj-commercial-rel",
          name: "Commercial Opportunity",
          type: "relation",
          targetDataSourceResourceId: "commercial-ds",
          targetDataSourcePropertyResourceId: "comm-projects-rel",
        },
        { resourceId: "proj-start-date", name: "Start date", type: "date" },
        { resourceId: "proj-due-date", name: "Due date", type: "date" },
        {
          resourceId: "proj-commercial-ready",
          name: "Commercial Ready",
          type: "checkbox",
        },
        { resourceId: "proj-closed", name: "Closed", type: "checkbox" },
        {
          resourceId: "proj-activities-rel",
          name: "Activities",
          type: "relation",
          targetDataSourceResourceId: "activities-ds",
          targetDataSourcePropertyResourceId: "act-project-rel",
        },
        {
          resourceId: "proj-knowledge-rel",
          name: "Knowledge",
          type: "relation",
          targetDataSourceResourceId: "knowledge-ds",
          targetDataSourcePropertyResourceId: "know-project-rel",
        },
        {
          resourceId: "proj-total-hours",
          name: "Total Hours",
          type: "rollup",
          relationPropertyResourceId: "proj-activities-rel",
          targetPropertyResourceId: "act-hours",
          targetPropertyType: "number",
          aggregation: "sum",
        },
        {
          resourceId: "proj-activity-count",
          name: "Activity Count",
          type: "rollup",
          relationPropertyResourceId: "proj-activities-rel",
          targetPropertyResourceId: "act-title",
          targetPropertyType: "title",
          aggregation: "count",
        },
        // EXPERIMENT RESULT (2026-07-24 deploy): accepted, but BUGGED upstream.
        // The rewriter resolves both property IDs yet binds the inner
        // current.prop() to THIS data source's collection ID instead of the
        // related Activities collection, so the formula evaluates to 0.
        // Reported as feedback. Fix is manual in the UI (re-pick Eligible
        // Hours in the formula editor) — but REMOVE this block first, or the
        // next re-deploy will overwrite the manual fix with the broken
        // expression again.
        {
          resourceId: "proj-grant-hours",
          name: "Grant-Eligible Hours",
          type: "formula",
          expression:
            'prop("proj-activities-rel").map(current.prop("act-eligible-hours")).sum()',
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Database 2 · Activities (Daily Log) — the diary and backbone of the claim
// ---------------------------------------------------------------------------

const activitiesDb = rndTeamspace.addDatabase({
  resourceId: "activities-db",
  name: "Activities",
  icon: { type: "notion_icon", description: "clipboard list", color: "blue" },
  description:
    "Daily R&D log. One row = one day's work / one significant activity. The Activity Rule: whoever performs it, logs it before leaving work that day.",
  dataSources: [
    {
      resourceId: "activities-ds",
      name: "Activities",
      properties: [
        { resourceId: "act-title", name: "Description", type: "title" },
        {
          resourceId: "act-id",
          name: "Activity ID",
          type: "auto_increment_id",
          prefix: "KIA",
        },
        { resourceId: "act-date", name: "Date", type: "date" },
        {
          resourceId: "act-project-rel",
          name: "Project",
          type: "relation",
          targetDataSourceResourceId: "projects-ds",
          targetDataSourcePropertyResourceId: "proj-activities-rel",
        },
        {
          resourceId: "act-type",
          name: "Activity Type",
          type: "select",
          options: [
            { name: "A – Management", color: "purple" },
            { name: "B – Technical", color: "blue" },
          ],
        },
        {
          resourceId: "act-stage",
          name: "Stage",
          type: "select",
          options: [
            { name: "Ideation", color: "gray" },
            { name: "Feasibility", color: "yellow" },
            { name: "Development", color: "orange" },
            { name: "Trial", color: "blue" },
            { name: "Scale-up", color: "purple" },
            { name: "Commercialised", color: "green" },
          ],
        },
        {
          resourceId: "act-challenge",
          name: "Technical Challenge",
          type: "text",
        },
        { resourceId: "act-person", name: "Person", type: "person", limit: 1 },
        { resourceId: "act-hours", name: "Hours", type: "number" },
        {
          resourceId: "act-grant-eligible",
          name: "Grant Eligible",
          type: "checkbox",
        },
        { resourceId: "act-core", name: "Core Activity", type: "checkbox" },
        {
          resourceId: "act-supporting",
          name: "Supporting Activity",
          type: "checkbox",
        },
        {
          resourceId: "act-location",
          name: "Australia/India",
          type: "select",
          options: [
            { name: "Australia", color: "green" },
            { name: "India", color: "orange" },
          ],
        },
        {
          resourceId: "act-outcome",
          name: "Outcome",
          type: "select",
          options: [
            { name: "Success", color: "green" },
            { name: "Partial success", color: "yellow" },
            { name: "Failed", color: "red" },
            { name: "Inconclusive", color: "gray" },
            { name: "Ongoing", color: "blue" },
          ],
        },
        { resourceId: "act-next-action", name: "Next Action", type: "text" },
        { resourceId: "act-evidence", name: "Evidence", type: "url" },
        {
          resourceId: "act-eligible-hours",
          name: "Eligible Hours",
          type: "formula",
          expression:
            'if(prop("act-grant-eligible"), prop("act-hours"), 0)',
        },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Database 3 · Knowledge — one row = one lesson learned
// ---------------------------------------------------------------------------

const knowledgeDb = rndTeamspace.addDatabase({
  resourceId: "knowledge-db",
  name: "Knowledge",
  icon: { type: "notion_icon", description: "brain", color: "pink" },
  description:
    "What does Knoxx know now that it didn't before? One row = one lesson learned, linked to its project and source activity.",
  dataSources: [
    {
      resourceId: "knowledge-ds",
      name: "Knowledge",
      properties: [
        { resourceId: "know-title", name: "Title", type: "title" },
        {
          resourceId: "know-id",
          name: "Knowledge ID",
          type: "auto_increment_id",
          prefix: "KIK",
        },
        {
          resourceId: "know-project-rel",
          name: "Project",
          type: "relation",
          targetDataSourceResourceId: "projects-ds",
          targetDataSourcePropertyResourceId: "proj-knowledge-rel",
        },
        {
          resourceId: "know-activity-rel",
          name: "Source Activity",
          type: "relation",
          targetDataSourceResourceId: "activities-ds",
        },
        { resourceId: "know-lesson", name: "Lesson / Insight", type: "text" },
        {
          resourceId: "know-category",
          name: "Category",
          type: "select",
          options: [
            { name: "Ingredient", color: "green" },
            { name: "Process", color: "blue" },
            { name: "Equipment", color: "orange" },
            { name: "Regulatory", color: "red" },
            { name: "Market / Customer", color: "purple" },
            { name: "Technique", color: "yellow" },
          ],
        },
        {
          resourceId: "know-ip-relevant",
          name: "IP-relevant",
          type: "checkbox",
        },
        { resourceId: "know-date", name: "Date captured", type: "date" },
        {
          resourceId: "know-captured-by",
          name: "Captured by",
          type: "person",
          limit: 1,
        },
        { resourceId: "know-evidence", name: "Evidence", type: "url" },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Phase 2 · Views
// ---------------------------------------------------------------------------

// Projects
projectsDb.addView({
  resourceId: "projects-all-view",
  name: "All Projects",
  type: "table",
  dataSourceResourceId: "projects-ds",
  sorts: [{ propertyId: "proj-priority", direction: "ascending" }],
})

projectsDb.addView({
  resourceId: "projects-open-view",
  name: "Open Projects",
  type: "table",
  dataSourceResourceId: "projects-ds",
  filters: [
    {
      propertyId: "proj-closed",
      propertyType: "checkbox",
      operator: "checkbox_is",
      value: false,
    },
  ],
  sorts: [{ propertyId: "proj-due-date", direction: "ascending" }],
})

projectsDb.addView({
  resourceId: "projects-board-view",
  name: "By Stage",
  type: "board",
  dataSourceResourceId: "projects-ds",
  groupBy: { property: "proj-stage", type: "select" },
})

projectsDb.addView({
  resourceId: "projects-timeline-view",
  name: "Roadmap",
  type: "timeline",
  dataSourceResourceId: "projects-ds",
  timelineBy: "proj-start-date",
  timelineByEnd: "proj-due-date",
  showTable: true,
})

// Ephemeral view embedded on the R&D Hub page
projectsDb.addView({
  resourceId: "projects-hub-embed",
  name: "Open Projects",
  type: "table",
  dataSourceResourceId: "projects-ds",
  ephemeral: true,
  filters: [
    {
      propertyId: "proj-closed",
      propertyType: "checkbox",
      operator: "checkbox_is",
      value: false,
    },
  ],
})

// Activities
activitiesDb.addView({
  resourceId: "activities-log-view",
  name: "Daily Log",
  type: "table",
  dataSourceResourceId: "activities-ds",
  sorts: [{ propertyId: "act-date", direction: "descending" }],
})

// The audit-ready view for Frank / the ATO
activitiesDb.addView({
  resourceId: "activities-ato-view",
  name: "ATO Activities",
  type: "table",
  dataSourceResourceId: "activities-ds",
  filters: [
    {
      propertyId: "act-grant-eligible",
      propertyType: "checkbox",
      operator: "checkbox_is",
      value: true,
    },
  ],
  sorts: [{ propertyId: "act-date", direction: "ascending" }],
  properties: [
    { property: "act-date", visible: true },
    { property: "act-project-rel", visible: true },
    { property: "act-type", visible: true },
    { property: "act-challenge", visible: true },
    { property: "act-hours", visible: true },
    { property: "act-core", visible: true },
    { property: "act-supporting", visible: true },
    { property: "act-location", visible: true },
    { property: "act-evidence", visible: true },
    { property: "act-outcome", visible: false },
    { property: "act-next-action", visible: false },
    { property: "act-stage", visible: false },
    { property: "act-eligible-hours", visible: true },
  ],
})

activitiesDb.addView({
  resourceId: "activities-calendar-view",
  name: "Calendar",
  type: "calendar",
  dataSourceResourceId: "activities-ds",
  calendarBy: "act-date",
})

activitiesDb.addView({
  resourceId: "activities-by-type-view",
  name: "By Type",
  type: "board",
  dataSourceResourceId: "activities-ds",
  groupBy: { property: "act-type", type: "select" },
})

activitiesDb.addView({
  resourceId: "activities-by-person-view",
  name: "By Person",
  type: "table",
  dataSourceResourceId: "activities-ds",
  groupBy: { property: "act-person", type: "person" },
  sorts: [{ propertyId: "act-date", direction: "descending" }],
})

// Ephemeral view embedded on the R&D Hub page
activitiesDb.addView({
  resourceId: "activities-hub-embed",
  name: "Latest Activities",
  type: "table",
  dataSourceResourceId: "activities-ds",
  ephemeral: true,
  sorts: [{ propertyId: "act-date", direction: "descending" }],
})

// Knowledge
knowledgeDb.addView({
  resourceId: "knowledge-all-view",
  name: "All Knowledge",
  type: "table",
  dataSourceResourceId: "knowledge-ds",
  sorts: [{ propertyId: "know-date", direction: "descending" }],
})

knowledgeDb.addView({
  resourceId: "knowledge-ip-view",
  name: "IP Register",
  type: "table",
  dataSourceResourceId: "knowledge-ds",
  filters: [
    {
      propertyId: "know-ip-relevant",
      propertyType: "checkbox",
      operator: "checkbox_is",
      value: true,
    },
  ],
})

knowledgeDb.addView({
  resourceId: "knowledge-by-category-view",
  name: "By Category",
  type: "board",
  dataSourceResourceId: "knowledge-ds",
  groupBy: { property: "know-category", type: "select" },
})

// Commercial
commercialDb.addView({
  resourceId: "commercial-pipeline-view",
  name: "Pipeline",
  type: "board",
  dataSourceResourceId: "commercial-ds",
  groupBy: { property: "comm-status", type: "select" },
})

// ---------------------------------------------------------------------------
// R&D Hub page + operating docs
// ---------------------------------------------------------------------------

const hubPage = rndTeamspace.addPage({
  resourceId: "rnd-hub-page",
  icon: { type: "notion_icon", description: "compass", color: "green" },
  properties: { title: notion.text("R&D Hub") },
  fullWidth: true,
  content: `<callout icon="🧭" color="green_bg">
	**How this system works.** Three databases, one rule each: **Projects** answer *what are we trying to achieve*, **Activities** answer *what happened today*, **Knowledge** answers *what do we know now that we didn't before*. Projects roll up from Activities automatically — nobody maintains timelines by hand.
</callout>

<columns>
	<column ratio="50">
		<callout icon="✍️" color="blue_bg">
			**The Activity Rule.** Whoever performs an activity logs it before leaving work that day. No exceptions.
		</callout>
	</column>
	<column ratio="50">
		<callout icon="📸" color="orange_bg">
			**The Photo Rule.** If you took it, you upload it — same day, to Google Drive, link pasted into the Notion activity's Evidence field.
		</callout>
	</column>
</columns>

# Dashboards

<database data-source-url="{{activities-hub-embed}}" inline="true">Latest Activities</database>

<database data-source-url="{{projects-hub-embed}}" inline="true">Open Projects</database>

# Databases

- <mention-database url="{{projects-db}}">Projects</mention-database> — master list, one row per innovation project. Owned by the Innovation Office.
- <mention-database url="{{activities-db}}">Activities</mention-database> — the daily diary and the backbone of the R&D Tax Incentive claim. The **ATO Activities** view is the hand-to-Frank, audit-ready record.
- <mention-database url="{{knowledge-db}}">Knowledge</mention-database> — lessons learned, IP register.
- <mention-database url="{{commercial-db}}">Commercial Opportunities</mention-database> — commercial side (KBG), feeds new projects.

# Operating docs

<page url="{{ownership-page}}">Operating Model & Ownership</page>
<page url="{{governance-page}}">Governance Cadence</page>
<page url="{{evidence-page}}">Evidence & Drive Convention</page>
`,
})

notion.page({
  resourceId: "ownership-page",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  icon: { type: "notion_icon", description: "people", color: "purple" },
  properties: { title: notion.text("Operating Model & Ownership") },
  content: `<callout icon="🔑" color="purple_bg">
	**One owner per data point.** Not "everyone updates the project." Every piece of information in this system has exactly one owner.
</callout>

# Ownership model

<table fit-page-width="true" header-row="true">
	<tr>
		<td>Item</td>
		<td>Owner</td>
	</tr>
	<tr>
		<td>Customer / Commercial Opportunity</td>
		<td>Commercial (KBG)</td>
	</tr>
	<tr>
		<td>KI Project, Stage, Status, Closure</td>
		<td>Minnie Dua (Innovation Office)</td>
	</tr>
	<tr>
		<td>Technical Challenge, Experiments, Trial Results, Prototype, IP</td>
		<td>Appireddy Pamulapati (Technical Lead)</td>
	</tr>
	<tr>
		<td>Daily Activities, Photos, Videos, Hours</td>
		<td>The person doing the work</td>
	</tr>
	<tr>
		<td>Customer Feedback / Co-creation</td>
		<td>Chef Sachin</td>
	</tr>
	<tr>
		<td>Budget</td>
		<td>Prabhleen Dua</td>
	</tr>
</table>

# Role notes

- **Minnie** is the Project Manager and owns the Project page (Appi does *not*).
- **Appi** owns technical knowledge, not project status.
- **Arshad** (reports to Appi) performs and logs bench activities, never changes project stage.
- **Chef Sachin** bridges customer and technical, and owns co-creation sessions.
- **Ajay Sir** never updates projects — he reviews, approves and comments via the dashboard only.

# Flow

1. Commercial (KBG) creates a Commercial Opportunity.
2. Innovation Office (Minnie) creates the KI project, assigns Appi, logs Activity #1.
3. Appi creates the Technical Challenge and logs technical activities.
4. Arshad logs bench work and uploads photos.
5. Chef Sachin logs customer co-creation.
6. Commercial receives the prototype and updates the CRM.
`,
})

notion.page({
  resourceId: "governance-page",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  icon: { type: "notion_icon", description: "calendar check", color: "blue" },
  properties: { title: notion.text("Governance Cadence") },
  content: `# Weekly review

**Friday, 30 minutes. Minnie chairs.** Management, not technical.

- [ ] Open / delayed projects
- [ ] Missing activities
- [ ] Missing evidence
- [ ] Customers waiting
- [ ] Budget
- [ ] Next week

# Monthly review (dashboard only)

**Attendees:** Ajay Sir, Minnie, Appi, Prabhleen, Commercial.

- [ ] Project counts and average age
- [ ] Commercial-ready projects
- [ ] Blocked projects
- [ ] Grant-eligible hours
- [ ] Missing documentation
- [ ] Budget
- [ ] IP created

# Success criteria

- Every performed activity is logged the same day, with evidence linked.
- Project pages update themselves via rollups; no manual timeline maintenance.
- The **ATO Activities** view can be handed to Frank at any time with no clean-up.
`,
})

notion.page({
  resourceId: "evidence-page",
  parent: { type: "resourceId", resourceId: hubPage.resourceId },
  icon: { type: "notion_icon", description: "camera", color: "orange" },
  properties: { title: notion.text("Evidence & Drive Convention") },
  content: `<callout icon="⚖️" color="yellow_bg">
	Contemporaneous evidence is what makes the R&D Tax Incentive claim defensible. Evidence uploaded weeks later is worth far less than evidence uploaded the same day.
</callout>

# Google Drive folder convention

- One folder per project, named with the Project ID: \`KIP-12 — Project name\`
- Inside each project folder: \`YYYY-MM-DD\` subfolders per activity day
- File names: \`YYYY-MM-DD_short-description\`

# Rules

1. Photos and videos are uploaded the same day they are taken (the Photo Rule).
2. The Drive link is pasted into the **Evidence** field of the matching Activity row.
3. Trial sheets, formulations and lab notes are scanned or photographed — paper does not count as evidence unless it is in Drive.
`,
})

// ---------------------------------------------------------------------------
// Seed data — two worked-example projects end-to-end (Phase 4)
// ---------------------------------------------------------------------------

const commercialDs = commercialDb.getDataSource("commercial-ds")
const projectsDs = projectsDb.getDataSource("projects-ds")
const activitiesDs = activitiesDb.getDataSource("activities-ds")
const knowledgeDs = knowledgeDb.getDataSource("knowledge-ds")

commercialDs.addPage({
  resourceId: "opp-plantpro",
  properties: {
    Name: notion.text("PlantPro Foods — plant-based prawn line"),
    Customer: notion.text("PlantPro Foods Pty Ltd"),
    Status: notion.select("Sampling"),
  },
})

commercialDs.addPage({
  resourceId: "opp-currybase",
  properties: {
    Name: notion.text("MealKit Co — shelf-stable curry base"),
    Customer: notion.text("MealKit Co"),
    Status: notion.select("Qualified"),
  },
})

const prawnProject = projectsDs.addPage({
  resourceId: "proj-prawn",
  properties: {
    "Project name": notion.text("Plant-based prawn texture v2"),
    Stage: notion.select("Trial"),
    Status: notion.select("On Track"),
    Priority: notion.select("High"),
    "Commercial Opportunity": notion.relation(["opp-plantpro"]),
    "Start date": notion.date("2026-06-01"),
    "Due date": notion.date("2026-09-30"),
  },
  content: `# Objective

Achieve a snap-and-bounce texture in the plant-based prawn that survives both frozen distribution and a 3-minute stir-fry, using the konjac–pea protein matrix.

# Technical challenge

Current formulation loses structural integrity above 180°C. The knowledge gap: how the konjac gel network interacts with pea protein isolate under rapid high-heat conditions. Outcome cannot be known in advance — systematic trials required.
`,
})

const curryProject = projectsDs.addPage({
  resourceId: "proj-curry",
  properties: {
    "Project name": notion.text("Shelf-stable curry base (ambient)"),
    Stage: notion.select("Feasibility"),
    Status: notion.select("At Risk"),
    Priority: notion.select("Medium"),
    "Commercial Opportunity": notion.relation(["opp-currybase"]),
    "Start date": notion.date("2026-07-01"),
    "Due date": notion.date("2026-11-30"),
  },
  content: `# Objective

Develop an ambient shelf-stable (9-month) curry base with no artificial preservatives that matches the fresh product's flavour panel scores within 5%.
`,
})

activitiesDs.addPage({
  resourceId: "act-prawn-kickoff",
  properties: {
    Description: notion.text("Project kickoff — scope, trial plan, roles"),
    Date: notion.date("2026-07-06"),
    Project: notion.relation([prawnProject.resourceId]),
    "Activity Type": notion.select("A – Management"),
    Stage: notion.select("Trial"),
    Hours: 2,
    "Grant Eligible": notion.checkbox(true),
    "Supporting Activity": notion.checkbox(true),
    "Australia/India": notion.select("Australia"),
    Outcome: notion.select("Success"),
    "Next Action": notion.text("Appi to define trial matrix for heat stability"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip1"),
  },
})

activitiesDs.addPage({
  resourceId: "act-prawn-trial1",
  properties: {
    Description: notion.text("Heat stability trial #1 — konjac ratios 3:1 to 5:1"),
    Date: notion.date("2026-07-08"),
    Project: notion.relation([prawnProject.resourceId]),
    "Activity Type": notion.select("B – Technical"),
    Stage: notion.select("Trial"),
    "Technical Challenge": notion.text(
      "Hypothesis: increasing konjac ratio above 4:1 maintains gel structure at 180°C+"
    ),
    Hours: 6,
    "Grant Eligible": notion.checkbox(true),
    "Core Activity": notion.checkbox(true),
    "Australia/India": notion.select("Australia"),
    Outcome: notion.select("Partial success"),
    "Next Action": notion.text("Re-run at 4.5:1 with slower thermal ramp"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip1"),
  },
})

activitiesDs.addPage({
  resourceId: "act-prawn-trial2",
  properties: {
    Description: notion.text("Heat stability trial #2 — 4.5:1 slow ramp + texture analysis"),
    Date: notion.date("2026-07-10"),
    Project: notion.relation([prawnProject.resourceId]),
    "Activity Type": notion.select("B – Technical"),
    Stage: notion.select("Trial"),
    "Technical Challenge": notion.text(
      "Does a slower thermal ramp let the 4.5:1 matrix set before protein denaturation?"
    ),
    Hours: 7,
    "Grant Eligible": notion.checkbox(true),
    "Core Activity": notion.checkbox(true),
    "Australia/India": notion.select("Australia"),
    Outcome: notion.select("Success"),
    "Next Action": notion.text("Scale trial batch for customer sampling"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip1"),
  },
})

activitiesDs.addPage({
  resourceId: "act-prawn-cocreation",
  properties: {
    Description: notion.text("Customer co-creation session — PlantPro tasting panel"),
    Date: notion.date("2026-07-15"),
    Project: notion.relation([prawnProject.resourceId]),
    "Activity Type": notion.select("A – Management"),
    Stage: notion.select("Trial"),
    Hours: 3,
    "Grant Eligible": notion.checkbox(false),
    "Australia/India": notion.select("Australia"),
    Outcome: notion.select("Success"),
    "Next Action": notion.text("Fold panel feedback into trial #3 seasoning"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip1"),
  },
})

activitiesDs.addPage({
  resourceId: "act-curry-lit-review",
  properties: {
    Description: notion.text("Preservation literature review + regulatory scan (FSANZ)"),
    Date: notion.date("2026-07-09"),
    Project: notion.relation([curryProject.resourceId]),
    "Activity Type": notion.select("B – Technical"),
    Stage: notion.select("Feasibility"),
    "Technical Challenge": notion.text(
      "Which natural preservation systems can hit 9-month ambient shelf life at pH 4.8?"
    ),
    Hours: 5,
    "Grant Eligible": notion.checkbox(true),
    "Supporting Activity": notion.checkbox(true),
    "Australia/India": notion.select("India"),
    Outcome: notion.select("Ongoing"),
    "Next Action": notion.text("Shortlist 3 hurdle-technology combinations for bench trials"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip2"),
  },
})

activitiesDs.addPage({
  resourceId: "act-curry-bench1",
  properties: {
    Description: notion.text("Bench trial — hurdle combo A (pH + water activity)"),
    Date: notion.date("2026-07-14"),
    Project: notion.relation([curryProject.resourceId]),
    "Activity Type": notion.select("B – Technical"),
    Stage: notion.select("Feasibility"),
    "Technical Challenge": notion.text(
      "Can water activity below 0.92 be reached without the flavour panel detecting saltiness?"
    ),
    Hours: 6,
    "Grant Eligible": notion.checkbox(true),
    "Core Activity": notion.checkbox(true),
    "Australia/India": notion.select("India"),
    Outcome: notion.select("Failed"),
    "Next Action": notion.text("Try combo B (mild thermal + natural antimicrobials)"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip2"),
  },
})

knowledgeDs.addPage({
  resourceId: "know-konjac-ramp",
  properties: {
    Title: notion.text("Konjac 4.5:1 + slow thermal ramp survives stir-fry"),
    Project: notion.relation([prawnProject.resourceId]),
    "Source Activity": notion.relation(["act-prawn-trial2"]),
    "Lesson / Insight": notion.text(
      "At a 4.5:1 konjac:pea ratio with a ramp under 8°C/min, the gel network sets before protein denaturation — texture survives 3-minute stir-fry at 200°C."
    ),
    Category: notion.select("Technique"),
    "IP-relevant": notion.checkbox(true),
    "Date captured": notion.date("2026-07-10"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip1"),
  },
})

knowledgeDs.addPage({
  resourceId: "know-salt-ceiling",
  properties: {
    Title: notion.text("Water-activity route alone fails flavour panel"),
    Project: notion.relation([curryProject.resourceId]),
    "Source Activity": notion.relation(["act-curry-bench1"]),
    "Lesson / Insight": notion.text(
      "Reaching aw < 0.92 by solutes alone pushes perceived saltiness past the panel threshold. Ambient stability will need a multi-hurdle approach, not a single-factor one."
    ),
    Category: notion.select("Process"),
    "IP-relevant": notion.checkbox(false),
    "Date captured": notion.date("2026-07-14"),
    Evidence: notion.url("https://drive.google.com/drive/folders/example-kip2"),
  },
})

export {}
