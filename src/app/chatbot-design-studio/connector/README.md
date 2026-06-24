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
