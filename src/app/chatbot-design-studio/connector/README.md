# Connector feature (Tiledesk plug-and-play connectors)

Lets an external connector microservice's catalog (its `GET /api/manifest`) drive the
flow-builder action palette. A connector action is authored here but **persisted as an
ordinary `webrequestv2` action plus a `_tdConnectorRef` marker**, so the existing chatbot
runtime executes it with zero changes and the existing `cds-action-web-request-v2` editor
edits it.

## Isolated TDD loop
Specs in this folder run in isolation from the rest of the repo (which has some pre-existing
broken specs) via a dedicated Karma configuration:

```
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx ng test --configuration connector --watch=false
```

Wiring: `angular.json` test configuration `connector` → `src/test.connector.ts`
(require.context scoped to this folder) + `tsconfig.spec.connector.json` + `karma.connector.conf.js`.

## Connector palette (Path B) — data flow

1. **Install record** — when a connector is installed for a project, Tiledesk stores an
   `integration` record `{ name: '<connectorId>', value: { installed, baseUrl } }`.
2. **Catalog load** — `cds-panel-elements` calls `loadConnectorActions()` after building the
   static palette: it reads the project's integrations (`ProjectService.getIntegrations`),
   and for each with `value.installed === true` and a `value.baseUrl` calls `ConnectorCatalogService.fetchManifest(baseUrl)`
   (GET `{baseUrl}/api/manifest`) and `toPaletteEntries(manifest)`.
3. **Palette** — the resulting `ConnectorPaletteEntry[]` (type `TYPE_ACTION.CONNECTOR`, category
   `INTEGRATIONS`) are merged into `actionsByCategory['INTEGRATIONS']`. Each entry carries its
   `connectorEntry` (the manifest action descriptor). A failed manifest fetch is skipped
   (`catchError`), never breaking the palette.
4. **Drop → action** — when a connector item is dropped, `IntentService.createNewAction(
   TYPE_ACTION.CONNECTOR, { connectorEntry })` calls `buildConnectorAction(entry)`, producing an
   `ActionWebRequestV2` whose `_tdActionType` is `'webrequestv2'`, pre-filled (url/headers/body
   from the manifest `webrequest` hint) and carrying `_tdConnectorRef = entry.id`.
5. **Edit & persist** — because `_tdActionType` is `'webrequestv2'`, the existing
   `cds-action-web-request-v2` editor edits it and it serializes into `faqs.actions[]` as a
   standard webrequestv2 action (plus the ignored `_tdConnectorRef` marker). The Tiledesk
   chatbot runtime executes it unchanged — **no Tiledesk core change**.

Adding a new connector requires **zero** further design-studio changes: it just needs to be
installed (an integration record with a `baseUrl`) and to serve a valid `/api/manifest`.

## Connector palette grouping (cascading sub-menu)

To improve UX for flows with many connectors, each installed connector's actions are grouped
under an expandable sub-menu row in the palette. The data flow is:

1. **Catalog → groups** — after loading a manifest, `toConnectorGroup(manifest)` projects
   the manifest into a `ConnectorGroup { id, name, icon, entries }` object. `entries`
   holds the connector's actions (from `manifest.actions`) for later rendering.
2. **Panel build** — `cds-panel-elements` collects all installed connectors' groups into
   `connectorGroups[]` and passes it to `cds-panel-actions` via `@Input()`.
3. **Expandable rows** — `cds-panel-actions` renders one expandable row per connector group,
   labeled with the connector's `name` and `icon`. The row hosts a flyout region (absolute
   positioning, outside the `.action-list` container to avoid clipping).
4. **Nested action list** — when expanded, the flyout renders a single **shared** `cds-action-drag-list`
   instance parameterized with the group's `entries`. This component handles drag start/move/end
   events identically to the main palette list, preserving the free-pointer drag UX.
5. **Drop behavior** — dragging an action from the nested list drops the same `webrequestv2`
   action structure, pre-filled with the manifest hint and carrying both `_tdConnectorRef`
   (the connector's ID) and `_tdConnectorMeta` (display metadata — name, icon, and input field descriptors used by the editor to render the form).
   The existing runtime and editor handle it as a standard webrequestv2 action.

The key implementation detail: the nested flyout is a **sibling of (not a descendant of)
the scrollable `.action-list` container**. This allows the flyout to overflow freely without
being clipped by the parent's scroll boundary.

## Manifest `groups[]` & per-service grouping

When a connector hosts multiple services (e.g. Gmail, Calendar, Drive), the manifest carries
a `groups[]` table so the design-studio can render per-service section headers in the palette
flyout and per-service option groups in the triggers dropdown — without any hardcoded knowledge
of what services exist.

### 1. Manifest `groups[]` table (backend — `buildManifest`)

`GET /api/manifest` now includes a top-level `groups` array alongside `actions` and `triggers`:

```json
{
  "groups": [
    { "id": "email",    "name": "Gmail",    "order": 10 },
    { "id": "calendar", "name": "Calendar", "order": 20 },
    { "id": "files",    "name": "Drive · Files", "order": 30 }
  ]
}
```

Each entry is a `ManifestGroup { id, name, icon?, order? }`.  The backend builds this by
collecting the distinct `group` ids used across all (non-hidden) actions and triggers, looking
each id up in `GROUP_REGISTRY` (in `src/config/groups.ts`) for its display name, optional icon,
and sort order, then sorting first by `order` (ascending) then alphabetically by name.

Groups declared with `hidden: true` in `GROUP_REGISTRY` (currently only `auth`) are excluded
from `groups[]` **and** all actions/triggers carrying that group id are filtered out of
`actions[]` and `triggers[]` entirely.  The `auth` group covers the OAuth install flow, which
uses dedicated `/auth/*` and `/tiledesk/auth-status` routes — not the `/api/actions` dispatcher
— so exposing its entries in the palette would be incorrect.

### 2. `ConnectorManifestGroup` model (design-studio)

`ConnectorManifest` (in `connector-manifest.model.ts`) mirrors the backend shape with an
optional field:

```ts
groups?: ConnectorManifestGroup[];   // { id, name, icon?, order? }
```

`ConnectorActionEntry` already carried a `group: string` field (the raw group id) — this is
the join key used by `toConnectorSubgroups`.

### 3. `toConnectorSubgroups` — bucketing, label/icon resolution, ordering

`ConnectorCatalogService.toConnectorSubgroups(manifest)` (in `connector-catalog.service.ts`)
turns a manifest into a `ConnectorSubgroup[]` for the palette flyout:

1. **Bucket** — iterates the palette entries produced by `toPaletteEntries(manifest)` and
   groups them by `entry.connectorEntry.group` (the raw group id from the manifest action).
2. **Resolve** — for each bucket, looks up the corresponding `ConnectorManifestGroup` from
   `manifest.groups` to obtain the display name and icon.  If no entry is found (unknown group
   id), the label falls back to a title-cased version of the raw id and the icon falls back to
   the connector-level icon (or the generic web-request SVG).
3. **Order** — buckets are sorted by the `order` field of their matching `ManifestGroup`
   (ascending), with groups absent from the table sorted last; ties are broken alphabetically
   by name.

`toConnectorGroup` calls `toConnectorSubgroups` and stores the result on
`ConnectorGroup.subgroups`.  `toTriggerGroup` passes `manifest.groups` through unchanged as
`ConnectorTriggerGroup.groups`, so trigger-side consumers can resolve the same display metadata.

### 4. Per-service section headers in the palette flyout (Task 3)

When `cds-panel-actions` opens the nested flyout for a connector row, it checks whether the
active `ConnectorGroup` carries a non-empty `subgroups` array.  If so, the flyout template
iterates `activeSubgroups` and renders one `<div class="connector-subgroup">` per service,
each containing:

- A **section header** (`connector-subgroup-header`) with the subgroup icon and name.
- A **`cds-action-drag-list`** instance for that subgroup's entries.

When `subgroups` is empty (a single-service connector), the flyout falls back to a plain flat
`cds-action-drag-list` (`#flatConnectorList` template reference).

The section headers are rendered inside the flyout `<div id="connector_flyout">` which is
positioned as a sibling of the scrollable `.action-list`, so the headers themselves are never
clipped by scroll overflow.

### 5. Per-service option groups in the triggers dropdown (Task 4)

The add-trigger `cds-select` inside `cds-trigger-entrypoint` uses the `[groupByKey]` binding:

```html
<cds-select
    [bindLabelSelect]="'label'"
    [bindValueSelect]="'value'"
    [groupByKey]="'group'"
    ...>
</cds-select>
```

Each select item carries a `group` property set to the resolved display name of the trigger's
group (looked up from `ConnectorTriggerGroup.groups`, falling back to title-case).  The
`cds-select` component reads `[groupByKey]` to render visual optgroup separators, grouping
triggers from the same service together.  The dropdown uses the component's default
alpha-sorting within each group (acceptable per spec; strict ordering is only required for the
palette flyout, where `toConnectorSubgroups` controls it).

### Summary: what each layer does

| Layer | Where | Responsibility |
|---|---|---|
| `GROUP_REGISTRY` | `src/config/groups.ts` (backend) | Central name/icon/order/hidden map for all Google service group ids |
| `buildManifest` | `src/core/manifest.ts` (backend) | Emits `groups[]`; strips `auth` entries and the `auth` group itself |
| `ConnectorManifestGroup` | `connector-manifest.model.ts` (DS) | TS interface mirroring the backend `ManifestGroup` shape |
| `toConnectorSubgroups` | `connector-catalog.service.ts` (DS) | Buckets palette entries by group, resolves labels/icons, orders |
| `ConnectorGroup.subgroups` | `connector-catalog.service.ts` (DS) | Carries the per-service buckets into the palette panel |
| `ConnectorTriggerGroup.groups` | `connector-trigger.model.ts` (DS) | Passes the raw `groups[]` table through to the trigger editor |
| `cds-panel-actions` flyout | `cds-panel-actions.component.*` (DS) | Renders one section header + drag-list per subgroup |
| `cds-select [groupByKey]` | `cds-trigger-entrypoint.component.*` (DS) | Groups trigger options by service in the add-trigger dropdown |
