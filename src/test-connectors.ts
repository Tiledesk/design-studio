// A test entry point for the connectors work only (catalogo, normalizzatore, store).
//
// Same reason as `src/test-condition.ts`: the repo's own `src/test.ts` has no
// `require.context`, so `npm test` runs nothing. This entry loads the specs under
// `connectors/` plus the legacy expected-connectors spec, which the parity spec keeps
// honest, and leaves everything else as it is.
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const context = (require as any).context('./app/chatbot-design-studio/', true, /(connectors\/.*|services\/connector-map)\.spec\.ts$/);
context.keys().forEach(context);
