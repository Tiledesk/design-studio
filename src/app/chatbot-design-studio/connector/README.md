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
