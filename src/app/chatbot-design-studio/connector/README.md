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
   (the connector's ID) and `_tdConnectorMeta` (additional context, e.g., API key or auth token).
   The existing runtime and editor handle it as a standard webrequestv2 action.

The key implementation detail: the nested flyout is a **sibling of (not a descendant of)
the scrollable `.action-list` container**. This allows the flyout to overflow freely without
being clipped by the parent's scroll boundary.
