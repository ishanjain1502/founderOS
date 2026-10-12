# Practical: cfo.ai workspace per company (wizard start)

**Product decision (2026-10-12):** Each new company gets its **own cfo.ai workspace**. Provisioning starts at **wizard start** (`POST /api/sessions`). **Assignment** is **identity only** in our app: we persist `org_id` (+ slug, bootstrap refs) on the session/user so backend MCP calls can pass `org_id` later. We do **not** grant the end user cfo page permissions, share links, or worksheet ACLs in v1 — they may never log into cfo.ai; optional invite is out of scope unless product asks for “Open in cfo.ai” as that user.

---

## What MCP and docs support today (verified)

### Workspace identification

Use these on **every** MCP call after selection ([agent instructions](https://docs.cfo.ai/agent-instructions), [MCP server](https://docs.cfo.ai/integrations/mcp-server)):

| Field | Example | Use in our app |
|--------|---------|----------------|
| **`org_id`** | `103299` | **Canonical** foreign key on `session.intake.cfoWorkspace.orgId` (string). MCP accepts numeric ID or **slug**. |
| **`slug`** | `state-street-5dead580` | Stable URL segment; **regenerates** if workspace is renamed via `edit_org`. Store for “Open in cfo.ai” links; prefer `org_id` for API calls. |
| **`name`** | `State Street` | Display only. |
| **`role`** | `admin` | From `list_orgs`; all members are workspace admins per cfo docs. |

`list_orgs` returns: `org_id`, `name`, `slug`, `role`.

Inside a workspace, scenarios use **display refs** such as `CEO sandbox - Pilot#7a9` (from `inspect_scenarios`). Per-company bootstrap should re-resolve refs after template setup and store them on the session mapping snapshot.

### Creating a new workspace

| Surface | Create workspace? |
|---------|-------------------|
| **`edit_org` (MCP)** | **No.** Tool description: *“This tool does not create workspaces.”* Rename only. |
| **Other MCP tools catalog** | **No** `create_org` / `create_workspace` in the connected server. |
| **Product docs** | New workspace appears at **first sign-up / onboarding** at [app.cfo.ai](https://app.cfo.ai) (Welcome chat). **Multiple workspaces per account** is an **Enterprise** plan feature ([billing](https://docs.cfo.ai/workspace-settings/billing)). |
| **Team** | `edit_team` **invite** adds a user to an **existing** workspace; does not create one. |

**Implication:** “Create workspace at wizard start” **cannot** be fully automated through the current MCP tool surface alone. Implementation needs one of:

1. **cfo.ai partner / Enterprise API** for programmatic workspace creation (confirm with cfo; not in public MCP catalog).
2. **User-assisted link:** wizard step or background job sends the user through cfo sign-up/onboarding for *their* company, then our backend calls `list_orgs` with a **service or user token** to capture the new `org_id` (only works if your platform account model allows many workspaces on the plan you have).
3. **Interim:** persist `cfoWorkspace.status: pending_provisioning` at session create; finance stays deferred/fixture until `org_id` is set (manual operator paste or future API).

Document the chosen path in SP-07 §1 once cfo confirms creation API.

---

## Our app: when and what we store

### Trigger

**Wizard start** — same moment as SP-03 `POST /api/sessions` (session row created).

### Our workspace identity vs cfo `org_id` (do not conflate)

| Field | Who assigns | Purpose |
|--------|-------------|---------|
| **`workspaceKey`** | **Us** at wizard start | Stable **app-owned** id for lookups: `org_name_slug` + `creationTime`. |
| **`cfoOrgId`** | **cfo.ai** after workspace exists | Value passed as MCP **`org_id`** (usually numeric, e.g. `"103299"`). |
| **`cfoSlug`** | cfo.ai (may change on rename) | Optional; not our primary key. |

**Convention (locked):**

```text
workspaceKey = {org_name_slug}-{creationTime}
```

- **`org_name_slug`:** slugified company name from intake (Step 1), lowercase, `[a-z0-9-]`, max ~48 chars, collapse repeats.
- **`creationTime`:** session `createdAt` in **UTC ISO-8601** (`2026-10-12T01:30:00.000Z`). Same instant as SQLite `created_at` for that session.

Example: `acme-analytics-2026-10-12T01:30:00.000Z`

Use `workspaceKey` in our APIs, DB indexes, and logs. Resolve to `cfoOrgId` before any MCP call. **Never** pass `workspaceKey` to cfo as `org_id` unless `list_orgs` shows cfo issued that exact slug (vendor slugs look like `state-street-5dead580`, not our pattern).

### Persist on session (draft intake JSON)

```json
{
  "workspaceKey": "acme-analytics-2026-10-12T01:30:00.000Z",
  "status": "pending" | "ready" | "failed",
  "cfoOrgId": "103299",
  "cfoSlug": "state-street-5dead580",
  "displayName": "Acme — CEO Sandbox",
  "provisionedAt": "2026-10-11T12:00:00.000Z",
  "bootstrapStatus": "pending" | "ready" | "failed",
  "scenarioRefs": {
    "pilot": "CEO sandbox - Pilot#7a9",
    "broad_launch": "CEO sandbox - Broad#cf9"
  }
}
```

At wizard start, set **`workspaceKey` immediately** (company name + `createdAt`). Leave **`cfoOrgId` null** until provisioning returns the vendor id.

### Assignment to user (identity handle, not cfo permissions)

**What we store:** a stable **foreign key** from our domain to cfo:

- **`workspaceKey`** — `org_name_slug` + `creationTime` (our query id)
- **`cfoOrgId`** — vendor id for MCP `org_id`
- `cfoSlug`, `displayName` (optional)
- `scenarioRefs`, page/table names from bootstrap (optional cache)

**Where:** session at wizard start; copy to **user + company** record when auth exists.

**What we do not do:** `edit_team` invite, `edit_pages` share, or worksheet-level grants — unless a later feature explicitly needs the user inside cfo.ai. The **platform service token** performs all finance MCP; users consume results only in our UI/report.

### Bootstrap template (per org)

After `org_id` exists, run once per workspace (MCP with `org_id`):

1. Create scenarios **CEO sandbox - Pilot** / **CEO sandbox - Broad** (or reuse names from [`config/cfo-ai-mapping.template.json`](../config/cfo-ai-mapping.template.json) — template file to split from global config).
2. Build **CEO Sandbox** page + input/output tables (see [cfo-ceo-sandbox-setup.md](./cfo-ceo-sandbox-setup.md)).
3. Set `bootstrapStatus: ready` and store scenario refs from `inspect_scenarios`.

Template path: [`config/cfo-ai-mapping.json`](../../config/cfo-ai-mapping.json) (to be split into template + session binding).

Finance runs (`runFinancePath`) always pass **`org_id: session.cfoWorkspace.orgId`**.

---

## Config split

| File | Purpose |
|------|---------|
| `config/cfo-ai-mapping.template.json` | Shared row/table/scenario **names** and assumption keys (no `orgId`). |
| Session `cfoWorkspace` + optional `mappingSnapshot` | Per-company **org_id** and resolved scenario refs. |

Remove reliance on a single global `orgId: "103299"` for production paths; keep that org only as a dev smoke target.

---

## Backend auth

Server MCP client (`CFO_MCP_ACCESS_TOKEN` or OAuth refresh for a **platform bot**) must be able to call tools with `org_id` set to each provisioned workspace. Verify with cfo whether one token can administer **multiple** workspaces on your plan.

---

## Related specs

- SP-03 — session created at wizard start (hook provisioning here or delegate to `provisionCfoWorkspace()`).
- SP-07 — finance MCP calls scoped by session `org_id`.
- SP-09 — per-tenant mapping and append-only finance runs.
